/**
 * Linter diagnostic type — separate from the compiler's Diagnostic so the
 * linter can be used independently without pulling in the full type checker.
 */
export interface LintDiagnostic {
  code: string           // SJS-L001, SJS-W002, SJS-W003, …
  severity: 'error' | 'warning'
  message: string
  line: number
  column: number
  fix?: { description: string; replacement?: string }
}
