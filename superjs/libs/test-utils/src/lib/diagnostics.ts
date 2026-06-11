/**
 * Diagnostic matchers. Predicates + a structural matcher over a `Diagnostic[]`
 * so tests assert "emits SJS-E001 at line 3" without hand-rolling `.some()`
 * filters. Pure — no pipeline dependency.
 */

import type { Diagnostic, DiagnosticCode, Severity } from '@superjs/types';

/** Every code present, in order. */
export function codesOf(diags: readonly Diagnostic[]): DiagnosticCode[] {
  return diags.map((d) => d.code);
}

/** True if any diagnostic carries `code`. */
export function hasCode(diags: readonly Diagnostic[], code: DiagnosticCode): boolean {
  return diags.some((d) => d.code === code);
}

export function errorsOf(diags: readonly Diagnostic[]): Diagnostic[] {
  return diags.filter((d) => d.severity === 'error');
}
export function warningsOf(diags: readonly Diagnostic[]): Diagnostic[] {
  return diags.filter((d) => d.severity === 'warning');
}

/** Counts keyed by severity. */
export function countBySeverity(diags: readonly Diagnostic[]): Record<Severity, number> {
  const acc = { error: 0, warning: 0, info: 0, hint: 0 } as Record<Severity, number>;
  for (const d of diags) acc[d.severity] = (acc[d.severity] ?? 0) + 1;
  return acc;
}

export interface DiagnosticMatch {
  readonly code: DiagnosticCode;
  /** 1-based line, when asserting position. */
  readonly line?: number;
  /** 0-based column, when asserting position. */
  readonly column?: number;
  readonly severity?: Severity;
}

/** True if some diagnostic satisfies every specified field of `match`. */
export function matchesDiagnostic(diags: readonly Diagnostic[], match: DiagnosticMatch): boolean {
  return diags.some((d) =>
    d.code === match.code
    && (match.severity === undefined || d.severity === match.severity)
    && (match.line === undefined || d.span.start.line === match.line)
    && (match.column === undefined || d.span.start.column === match.column));
}

/**
 * Throw unless a diagnostic matches — a self-describing assertion for use inside
 * `it(...)` without pulling in a matcher library.
 */
export function assertDiagnostic(diags: readonly Diagnostic[], match: DiagnosticMatch): void {
  if (matchesDiagnostic(diags, match)) return;
  const got = diags.map((d) => `${d.code}@${d.span.start.line}:${d.span.start.column}`).join(', ') || '(none)';
  throw new Error(`expected diagnostic ${JSON.stringify(match)}; got [${got}]`);
}
