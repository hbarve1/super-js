/**
 * Diagnostic construction — turns a registry code + context into a concrete
 * {@link Diagnostic}, and collects diagnostics during a compile via
 * {@link DiagnosticBag}.
 */

import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticFix,
  RelatedInformation,
  Severity,
  Span,
} from '@superjs/types';
import { getDescriptor } from './registry.js';

/** Base URL for per-code documentation pages (website errors section). */
export const SPEC_URL_BASE = 'https://superjs.dev/docs/errors';

export function specUrlFor(code: DiagnosticCode): string {
  return `${SPEC_URL_BASE}/${code}`;
}

/** Substitution params for `{name}` tokens in a message template. */
export type MessageParams = Readonly<Record<string, string | number>>;

const TOKEN = /\{(\w+)\}/g;

/**
 * Fill a code's template with params. Unknown codes fall back to the raw code.
 * Missing params leave the `{token}` in place (visible, debuggable).
 */
export function formatMessage(code: DiagnosticCode, params?: MessageParams): string {
  const descriptor = getDescriptor(code);
  if (!descriptor) return code;
  if (!params) return descriptor.template;
  return descriptor.template.replace(TOKEN, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

export interface CreateDiagnosticOptions {
  readonly code: DiagnosticCode;
  readonly span: Span;
  /** Fills `{token}` placeholders in the registry template. */
  readonly params?: MessageParams;
  /** Full message override (skips template). */
  readonly message?: string;
  /** Override the registry severity (e.g. `--strict` promotes warnings). */
  readonly severity?: Severity;
  readonly file?: string;
  readonly related?: readonly RelatedInformation[];
  readonly fixes?: readonly DiagnosticFix[];
}

export function createDiagnostic(options: CreateDiagnosticOptions): Diagnostic {
  const descriptor = getDescriptor(options.code);
  const diagnostic: Diagnostic = {
    code: options.code,
    severity: options.severity ?? descriptor?.severity ?? 'error',
    message: options.message ?? formatMessage(options.code, options.params),
    span: options.span,
    specUrl: specUrlFor(options.code),
    ...(options.file !== undefined ? { file: options.file } : {}),
    ...(options.related ? { related: options.related } : {}),
    ...(options.fixes ? { fixes: options.fixes } : {}),
  };
  return diagnostic;
}

export function isError(d: Diagnostic): boolean {
  return d.severity === 'error';
}

export function isWarning(d: Diagnostic): boolean {
  return d.severity === 'warning';
}

/**
 * Accumulates diagnostics during a compile. Shared by lexer, parser, checker.
 * `--strict` mode promotes warnings to errors at emit time.
 */
export class DiagnosticBag {
  private readonly items: Diagnostic[] = [];

  constructor(private readonly opts: { readonly strict?: boolean; readonly file?: string } = {}) {}

  /** Emit using a registry code; severity comes from the registry (or strict promotion). */
  report(options: Omit<CreateDiagnosticOptions, 'file'> & { file?: string }): Diagnostic {
    const base = createDiagnostic({
      ...options,
      file: options.file ?? this.opts.file,
    });
    const promoted =
      this.opts.strict && base.severity === 'warning'
        ? { ...base, severity: 'error' as Severity }
        : base;
    this.items.push(promoted);
    return promoted;
  }

  /** Push a fully-formed diagnostic (e.g. from a sub-stage). */
  add(diagnostic: Diagnostic): void {
    this.items.push(diagnostic);
  }

  /** Current length — pair with {@link rollback} for speculative parsing. */
  mark(): number {
    return this.items.length;
  }

  /** Drop diagnostics reported since a {@link mark} (abandoned parse paths). */
  rollback(to: number): void {
    if (to >= 0 && to < this.items.length) this.items.length = to;
  }

  get all(): readonly Diagnostic[] {
    return this.items;
  }

  get errors(): readonly Diagnostic[] {
    return this.items.filter(isError);
  }

  get warnings(): readonly Diagnostic[] {
    return this.items.filter(isWarning);
  }

  get hasErrors(): boolean {
    return this.items.some(isError);
  }

  get size(): number {
    return this.items.length;
  }
}
