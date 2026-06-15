'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Editor } from './Editor'
import { OutputPanel } from './OutputPanel'
import { ConsolePanel } from './ConsolePanel'
import { useCompiler } from '@/hooks/useCompiler'

export const DEFAULT_CODE = `// Super.js — null-safe, sum types, match expressions

type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 2) {
  Ok(value) => console.log("Result:", value),
  Err(msg)  => console.error("Error:", msg),
}

// Null-safe types
const name: string? = null
const greeting = name ?? "World"
console.log("Hello,", greeting)
`

interface PlaygroundProps {
  initialCode?: string
  height?: string
}

type Tab = 'output' | 'console'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 font-mono uppercase tracking-wider transition-colors',
        active ? 'text-orange-400 border-b-2 border-orange-400' : 'text-[#94a3b8] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function Playground({ initialCode = DEFAULT_CODE, height = '500px' }: PlaygroundProps) {
  const [code, setCode] = useState(initialCode)
  const { result, isCompiling, compile } = useCompiler()
  const [tab, setTab] = useState<Tab>('output')
  const [runToken, setRunToken] = useState(0)

  // Compile once on mount so the output panel is populated immediately.
  useEffect(() => {
    void compile(initialCode)
  }, [compile, initialCode])

  // Run = compile, then execute the output in the sandbox and show the console.
  const handleRun = async () => {
    const r = await compile(code)
    if (r.errors.length === 0 && r.output) {
      setRunToken((t) => t + 1)
      setTab('console')
    } else {
      setTab('output')
    }
  }

  const errorCount = result?.errors.length ?? 0

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full" style={{ height }}>
      <div className="flex-1 min-h-0">
        <Editor value={code} onChange={setCode} onRun={handleRun} diagnostics={result?.diagnostics ?? []} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0d1117]">
        <div className="flex items-center border-b border-white/10 bg-[#161b22] text-xs">
          <TabButton active={tab === 'output'} onClick={() => setTab('output')}>
            Compiled JS
          </TabButton>
          <TabButton active={tab === 'console'} onClick={() => setTab('console')}>
            Console
          </TabButton>
          <div className="ml-auto px-3">
            {isCompiling ? (
              <span className="text-orange-400 animate-pulse">Compiling…</span>
            ) : errorCount > 0 ? (
              <span className="text-red-400">
                {errorCount} error{errorCount > 1 ? 's' : ''}
              </span>
            ) : result?.output ? (
              <span className="text-green-400">✓ OK</span>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {tab === 'output' ? (
            <OutputPanel output={result?.output ?? ''} errors={result?.errors ?? []} isCompiling={isCompiling} embedded />
          ) : (
            <ConsolePanel code={result?.output ?? ''} runToken={runToken} />
          )}
        </div>
      </div>
    </div>
  )
}
