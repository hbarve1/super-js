'use client'

import { useState, useCallback } from 'react'

interface CompileResult {
  output: string
  errors: Array<{ message: string; line?: number }>
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
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setResult({ output: '', errors: [{ message: err.error ?? `HTTP ${res.status}` }] })
        return
      }
      const data: CompileResult = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ output: '', errors: [{ message: e instanceof Error ? e.message : 'Network error' }] })
    } finally {
      setIsCompiling(false)
    }
  }, [])

  return { result, isCompiling, compile }
}
