'use client'

import { useCallback, useState } from 'react'
import type { CompileDiagnostic, CompileError } from './useCompiler'
import type { PlaygroundMode } from '@/lib/playground-url'

export interface RunResult {
  compiledSource: string
  consoleLogs: string[]
  output: string
  errors: CompileError[]
  diagnostics: CompileDiagnostic[]
  timingMs: number
  runtimeError?: string
  usedFallback: boolean
}

interface UsePlaygroundReturn {
  result: RunResult | null
  isRunning: boolean
  sandboxUnavailable: boolean
  run: (source: string, mode: PlaygroundMode) => Promise<RunResult>
  compileOnly: (source: string) => Promise<RunResult>
}

const USE_SANDBOX = process.env.NEXT_PUBLIC_USE_WORKERS_SANDBOX !== 'false'
const RUN_URL = process.env.NEXT_PUBLIC_PLAYGROUND_RUN_URL ?? '/api/run'

function toRunResult(
  data: {
    compiledSource?: string
    consoleLogs?: string[]
    errors?: CompileError[]
    diagnostics?: CompileDiagnostic[]
    timingMs?: number
    runtimeError?: string
    output?: string
  },
  usedFallback: boolean,
): RunResult {
  const compiled = data.compiledSource ?? data.output ?? ''
  return {
    compiledSource: compiled,
    output: compiled,
    consoleLogs: data.consoleLogs ?? [],
    errors: data.errors ?? [],
    diagnostics: data.diagnostics ?? [],
    timingMs: data.timingMs ?? 0,
    runtimeError: data.runtimeError,
    usedFallback,
  }
}

export function usePlayground(): UsePlaygroundReturn {
  const [result, setResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [sandboxUnavailable, setSandboxUnavailable] = useState(false)

  const compileOnly = useCallback(async (source: string): Promise<RunResult> => {
    const res = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    const data = res.ok
      ? ((await res.json()) as { output: string; errors: CompileError[]; diagnostics: CompileDiagnostic[] })
      : { output: '', errors: [{ message: `HTTP ${res.status}` }], diagnostics: [] as CompileDiagnostic[] }
    return toRunResult(
      {
        compiledSource: data.output,
        consoleLogs: [],
        errors: data.errors,
        diagnostics: data.diagnostics,
        timingMs: 0,
      },
      true,
    )
  }, [])

  const run = useCallback(
    async (source: string, mode: PlaygroundMode): Promise<RunResult> => {
      setIsRunning(true)
      try {
        if (!USE_SANDBOX) {
          const fallback = await compileOnly(source)
          setResult(fallback)
          return fallback
        }

        try {
          const res = await fetch(RUN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: source, mode }),
          })

          if (res.status === 429) {
            const data = (await res.json().catch(() => ({}))) as { errors?: CompileError[] }
            const limited = toRunResult(
              { errors: data.errors ?? [{ message: 'Rate limit exceeded' }], consoleLogs: [], timingMs: 0 },
              false,
            )
            setResult(limited)
            return limited
          }

          if (!res.ok && res.status >= 500) {
            setSandboxUnavailable(true)
            const fallback = await compileOnly(source)
            setResult(fallback)
            return fallback
          }

          const data = (await res.json()) as Parameters<typeof toRunResult>[0]
          const next = toRunResult(data, false)
          setResult(next)
          setSandboxUnavailable(false)
          return next
        } catch {
          setSandboxUnavailable(true)
          const fallback = await compileOnly(source)
          setResult(fallback)
          return fallback
        }
      } finally {
        setIsRunning(false)
      }
    },
    [compileOnly],
  )

  return { result, isRunning, sandboxUnavailable, run, compileOnly }
}
