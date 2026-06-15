'use client'

import type { CompileError } from '@/hooks/useCompiler'

interface OutputPanelProps {
  output: string
  errors: CompileError[]
  isCompiling: boolean
  /** Render only the body (no border/header) — for use inside the tabbed panel. */
  embedded?: boolean
}

function Body({ output, errors }: { output: string; errors: CompileError[] }) {
  return (
    <div className="flex-1 overflow-auto p-4 font-mono text-sm">
      {errors.length > 0 ? (
        <div className="space-y-2">
          {errors.map((err, i) => (
            <div key={i} className="text-red-400">
              {err.line != null && <span className="text-text-muted mr-2">Line {err.line}:</span>}
              {err.message}
            </div>
          ))}
        </div>
      ) : output ? (
        <pre className="text-text-secondary whitespace-pre-wrap">{output}</pre>
      ) : (
        <p className="text-text-muted">Press Run to compile</p>
      )}
    </div>
  )
}

export function OutputPanel({ output, errors, isCompiling, embedded = false }: OutputPanelProps) {
  if (embedded) return <Body output={output} errors={errors} />

  return (
    <div className="flex flex-col h-full bg-bg-dark border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-elevated">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">Output</span>
        {isCompiling && <span className="text-xs text-orange-400 animate-pulse">Compiling…</span>}
        {!isCompiling && errors.length > 0 && (
          <span className="text-xs text-red-400">
            {errors.length} error{errors.length > 1 ? 's' : ''}
          </span>
        )}
        {!isCompiling && errors.length === 0 && output && (
          <span className="text-xs text-green-400">✓ OK</span>
        )}
      </div>
      <Body output={output} errors={errors} />
    </div>
  )
}
