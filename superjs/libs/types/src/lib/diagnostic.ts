/**
 * Diagnostic contract — the cross-stage shape every SJS tool consumes.
 *
 * The code → message/fix/spec-url *registry* lives in `@superjs/diagnostics`
 * (Tier 0, depends on this lib). This module owns only the structural shape so
 * lexer, parser, checker, CLI, LSP, and website all agree on the wire format.
 *
 * Code series (see specs/error-codes.md):
 *   SJS-P###  parser errors      — always fatal
 *   SJS-E###  type/hard errors   — compilation halts
 *   SJS-W###  warnings           — `--strict` promotes to error
 *   SJS-L###  lint rules         — off in `--loose`
 */

import type { Span } from './span.js';

export type Severity = 'error' | 'warning' | 'info' | 'hint';

/**
 * A diagnostic code such as `SJS-E001`. Kept as a branded string rather than a
 * closed union so the registry in `@superjs/diagnostics` remains the single
 * source of truth without a circular dependency.
 */
export type DiagnosticCode = `SJS-${'P' | 'E' | 'W' | 'L'}${number}` | string;

/** Secondary location attached to a diagnostic (e.g. "first declared here"). */
export interface RelatedInformation {
  readonly message: string;
  readonly span: Span;
  readonly file?: string;
}

/** A machine-applicable fix suggestion. */
export interface DiagnosticFix {
  readonly description: string;
  readonly edits: readonly TextEdit[];
}

export interface TextEdit {
  readonly span: Span;
  readonly newText: string;
}

export interface Diagnostic {
  readonly code: DiagnosticCode;
  readonly severity: Severity;
  /** Plain-English message; names both types for type errors. */
  readonly message: string;
  readonly span: Span;
  /** Absolute or workspace-relative file path, when known. */
  readonly file?: string;
  /** Authoritative spec anchor (ECMA-262 §ref or SJS spec page). */
  readonly specUrl?: string;
  readonly related?: readonly RelatedInformation[];
  readonly fixes?: readonly DiagnosticFix[];
}
