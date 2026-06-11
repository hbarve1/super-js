/**
 * Diagnostic rendering: a human `pretty` form and a machine `json` form
 * (`--format json`) consumed by editors/CI per stage-1 §error UX.
 */

import type { Diagnostic } from '@superjs/types';

export type DiagnosticFormat = 'pretty' | 'json';

/** `file:line:col severity CODE message` — one line per diagnostic. */
export function formatPretty(diags: readonly Diagnostic[]): string {
  return diags.map((d) => {
    const where = `${d.file ?? '<input>'}:${d.span.start.line}:${d.span.start.column + 1}`;
    return `${where} ${d.severity} ${d.code}: ${d.message}`;
  }).join('\n');
}

/** Stable JSON array, sorted by file then position, for tooling. */
export function formatJson(diags: readonly Diagnostic[]): string {
  const rows = diags.map((d) => ({
    code: d.code,
    severity: d.severity,
    message: d.message,
    file: d.file ?? null,
    line: d.span.start.line,
    column: d.span.start.column,
    endLine: d.span.end.line,
    endColumn: d.span.end.column,
    specUrl: d.specUrl ?? null,
  }));
  return JSON.stringify(rows, null, 2);
}

export function countErrors(diags: readonly Diagnostic[]): number {
  return diags.filter((d) => d.severity === 'error').length;
}
export function countWarnings(diags: readonly Diagnostic[]): number {
  return diags.filter((d) => d.severity === 'warning').length;
}
