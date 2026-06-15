'use client'

import { useCallback, useState } from 'react'

export interface CompileError {
  message: string
  line?: number
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint'

/** Rich diagnostic with a 1-based line / 1-based column span for editor markers. */
export interface CompileDiagnostic {
  code: string
  severity: DiagnosticSeverity
  message: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface CompileResult {
  output: string
  errors: CompileError[]
  diagnostics: CompileDiagnostic[]
}

interface UseCompilerReturn {
  result: CompileResult | null
  isCompiling: boolean
  compile: (source: string) => Promise<CompileResult>
}

export function useCompiler(): UseCompilerReturn {
  const [result, setResult] = useState<CompileResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)

  const compile = useCallback(async (source: string): Promise<CompileResult> => {
    setIsCompiling(true)
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      let next: CompileResult
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Partial<CompileResult>
        next = { output: '', errors: err.errors ?? [{ message: `HTTP ${res.status}` }], diagnostics: [] }
      } else {
        next = (await res.json()) as CompileResult
      }
      setResult(next)
      return next
    } catch (e) {
      const next: CompileResult = {
        output: '',
        errors: [{ message: e instanceof Error ? e.message : 'Network error' }],
        diagnostics: [],
      }
      setResult(next)
      return next
    } finally {
      setIsCompiling(false)
    }
  }, [])

  return { result, isCompiling, compile }
}
