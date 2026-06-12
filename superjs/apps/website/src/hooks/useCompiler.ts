'use client'

import { useCallback, useState } from 'react'

export interface CompileError {
  message: string
  line?: number
}

export interface CompileResult {
  output: string
  errors: CompileError[]
}

interface UseCompilerReturn {
  result: CompileResult | null
  isCompiling: boolean
  compile: (source: string) => Promise<void>
}

export function useCompiler(): UseCompilerReturn {
  const [result, setResult] = useState<CompileResult | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)

  const compile = useCallback(async (source: string) => {
    setIsCompiling(true)
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { errors?: CompileError[] }
        setResult({ output: '', errors: err.errors ?? [{ message: `HTTP ${res.status}` }] })
        return
      }
      setResult((await res.json()) as CompileResult)
    } catch (e) {
      setResult({ output: '', errors: [{ message: e instanceof Error ? e.message : 'Network error' }] })
    } finally {
      setIsCompiling(false)
    }
  }, [])

  return { result, isCompiling, compile }
}
