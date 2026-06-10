/**
 * Diagnostic utilities — T053, T054
 *
 * Human-readable renderer (Rust-style) and machine-readable JSON formatter
 * for SJS diagnostics emitted by the compiler, type checker, and linter.
 *
 * contracts/cli-interface.md § Diagnostic output
 */

import type { PrototypeDiagnostic } from './typeChecker/types'

// ── JSON output (T054) ────────────────────────────────────────────────────────

/**
 * SARIF-compatible one-JSON-per-line representation of a diagnostic.
 * Each line can be parsed independently (`ndjson` / `jsonlines` format).
 */
export interface DiagnosticJson {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  specUrl: string
  file?: string
}

/**
 * Converts `diagnostics` to an array of JSON strings, one per diagnostic.
 * Pass `file` to include the source file path in every record.
 *
 * Callers write each string to stdout with a newline for SARIF-compatible
 * ndjson output: `lines.forEach(l => process.stdout.write(l + '\n'))`.
 */
export function formatDiagnosticsAsJson(
  diagnostics: PrototypeDiagnostic[],
  file?: string,
): string[] {
  return diagnostics.map(d => {
    const record: DiagnosticJson = {
      code: d.code,
      severity: d.severity,
      message: d.message,
      line: d.line,
      column: d.column,
      specUrl: d.specUrl,
    }
    if (file !== undefined) record.file = file
    return JSON.stringify(record)
  })
}

// ── Human-readable renderer (T053) ───────────────────────────────────────────

/**
 * Formats `diagnostics` as a Rust-inspired human-readable string.
 *
 * Example:
 *   error[SJS-E001]: I cannot assign 'string' to 'number'.
 *    --> app.sjs:3:10
 *    = spec: https://tc39.es/ecma262/#sec-let-and-const-declarations
 */
export function formatDiagnosticsAsText(
  diagnostics: PrototypeDiagnostic[],
  file?: string,
): string {
  return diagnostics.map(d => {
    const loc = file ? `${file}:${d.line}:${d.column}` : `${d.line}:${d.column}`
    return [
      `${d.severity}[${d.code}]: ${d.message}`,
      ` --> ${loc}`,
      ` = spec: ${d.specUrl}`,
    ].join('\n')
  }).join('\n\n')
}
