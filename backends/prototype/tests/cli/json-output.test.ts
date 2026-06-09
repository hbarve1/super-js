/**
 * --json flag tests — T054
 *
 * When --json is passed to any CLI subcommand, diagnostics are emitted as
 * one JSON object per line to stdout (SARIF-compatible ndjson format).
 * Human-readable text output is suppressed.
 *
 * contracts/cli-interface.md § JSON output
 */

import { formatDiagnosticsAsJson, DiagnosticJson } from '../../src/diagnostic'
import type { PrototypeDiagnostic } from '../../src/typeChecker/types'

const SAMPLE_DIAGNOSTIC: PrototypeDiagnostic = {
  code: 'SJS-E001',
  severity: 'error',
  message: "I cannot assign a value of type 'string' to a variable declared as 'number'.",
  line: 3,
  column: 10,
  specUrl: 'https://tc39.es/ecma262/#sec-let-and-const-declarations',
}

// ── formatDiagnosticsAsJson ───────────────────────────────────────────────────

describe('formatDiagnosticsAsJson()', () => {
  it('returns one JSON line per diagnostic', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    expect(lines).toHaveLength(1)
  })

  it('each line is valid JSON', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    expect(() => JSON.parse(lines[0])).not.toThrow()
  })

  it('includes code, severity, message, line, column fields', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    const obj: DiagnosticJson = JSON.parse(lines[0])
    expect(obj.code).toBe('SJS-E001')
    expect(obj.severity).toBe('error')
    expect(obj.message).toContain("'string'")
    expect(obj.line).toBe(3)
    expect(obj.column).toBe(10)
  })

  it('includes specUrl field', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    const obj: DiagnosticJson = JSON.parse(lines[0])
    expect(typeof obj.specUrl).toBe('string')
    expect(obj.specUrl).toContain('tc39.es')
  })

  it('returns an empty array for zero diagnostics', () => {
    expect(formatDiagnosticsAsJson([])).toHaveLength(0)
  })

  it('emits one line per diagnostic for multiple diagnostics', () => {
    const diags: PrototypeDiagnostic[] = [
      SAMPLE_DIAGNOSTIC,
      { ...SAMPLE_DIAGNOSTIC, code: 'SJS-W001', severity: 'warning', line: 5 },
    ]
    const lines = formatDiagnosticsAsJson(diags)
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1]).line).toBe(5)
  })

  it('each line is a JSON object (not array)', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    const parsed = JSON.parse(lines[0])
    expect(typeof parsed).toBe('object')
    expect(Array.isArray(parsed)).toBe(false)
  })

  it('includes file field when provided', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC], '/p/app.sjs')
    const obj: DiagnosticJson = JSON.parse(lines[0])
    expect(obj.file).toBe('/p/app.sjs')
  })

  it('file field is absent when not provided', () => {
    const lines = formatDiagnosticsAsJson([SAMPLE_DIAGNOSTIC])
    const obj: DiagnosticJson = JSON.parse(lines[0])
    expect(obj.file).toBeUndefined()
  })
})
