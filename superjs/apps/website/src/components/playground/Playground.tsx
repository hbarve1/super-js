'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Editor } from './Editor'
import { OutputPanel } from './OutputPanel'
import { ConsolePanel } from './ConsolePanel'
import { EXAMPLES } from './examples'
import { useCompiler } from '@/hooks/useCompiler'
import { buildShareUrl, readSharedCode } from '@/lib/share'

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
  const codeRef = useRef(code)
  codeRef.current = code
  const { result, isCompiling, compile } = useCompiler()
  const [tab, setTab] = useState<Tab>('output')
  const [runToken, setRunToken] = useState(0)
  const [shared, setShared] = useState(false)

  // On mount, prefer source shared via the URL hash; else the initial code.
  useEffect(() => {
    const fromUrl = readSharedCode()
    const start = fromUrl ?? initialCode
    if (fromUrl) setCode(fromUrl)
    void compile(start)
  }, [compile, initialCode])

  // Run = compile, then execute the output in the sandbox and show the console.
  const handleRun = async () => {
    const r = await compile(codeRef.current)
    if (r.errors.length === 0 && r.output) {
      setRunToken((t) => t + 1)
      setTab('console')
    } else {
      setTab('output')
    }
  }

  const handleShare = () => {
    const url = buildShareUrl(codeRef.current)
    void navigator.clipboard.writeText(url).then(() => {
      window.history.replaceState(null, '', url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    })
  }

  const errorCount = result?.errors.length ?? 0

  return (
    <div className="flex flex-col gap-3 w-full" style={{ height }}>
      <div className="flex shrink-0 items-center gap-3">
        <label className="sr-only" htmlFor="pg-examples">
          Load an example
        </label>
        <select
          id="pg-examples"
          defaultValue=""
          onChange={(e) => {
            const ex = EXAMPLES.find((x) => x.id === e.target.value)
            if (ex) setCode(ex.code)
            e.target.value = ''
          }}
          className="rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-sm text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          <option value="" disabled>
            Load example…
          </option>
          {EXAMPLES.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          {shared ? '✓ Link copied' : 'Share'}
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 min-h-0 flex-1">
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
    </div>
  )
}
