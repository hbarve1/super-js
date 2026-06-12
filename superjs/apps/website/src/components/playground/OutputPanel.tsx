'use client'

import type { CompileError } from '@/hooks/useCompiler'

interface OutputPanelProps {
  output: string
  errors: CompileError[]
  isCompiling: boolean
}

export function OutputPanel({ output, errors, isCompiling }: OutputPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#0d1117] border border-white/10 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#161b22]">
        <span className="text-xs text-[#94a3b8] font-mono uppercase tracking-wider">Output</span>
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

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {errors.length > 0 ? (
          <div className="space-y-2">
            {errors.map((err, i) => (
              <div key={i} className="text-red-400">
                {err.line != null && <span className="text-[#94a3b8] mr-2">Line {err.line}:</span>}
                {err.message}
              </div>
            ))}
          </div>
        ) : output ? (
          <pre className="text-[#e2e8f0] whitespace-pre-wrap">{output}</pre>
        ) : (
          <p className="text-[#94a3b8]">Press Run to compile</p>
        )}
      </div>
    </div>
  )
}
