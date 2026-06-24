'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Editor } from './Editor'
import { OutputPanel } from './OutputPanel'
import { ConsolePanel } from './ConsolePanel'
import { EXAMPLES } from './examples'
import { usePlayground } from '@/hooks/usePlayground'
import { buildShareUrl } from '@/lib/share'
import { buildPlaygroundQuery, type PlaygroundMode } from '@/lib/playground-url'

const DEFAULT_CODE = `// Super.js — null-safe, sum types, match expressions

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
  initialMode?: PlaygroundMode
  height?: string
}

type Tab = 'output' | 'console'

const MODES: { id: PlaygroundMode; label: string }[] = [
  { id: 'node', label: 'Node.js' },
  { id: 'workers', label: 'Workers' },
  { id: 'lambda', label: 'Lambda' },
]

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 font-mono uppercase tracking-wider transition-colors',
        active ? 'text-orange-400 border-b-2 border-orange-400' : 'text-text-muted hover:text-text-primary',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function Playground({ initialCode = DEFAULT_CODE, initialMode = 'node', height = '500px' }: PlaygroundProps) {
  const [code, setCode] = useState(initialCode)
  const [mode, setMode] = useState<PlaygroundMode>(initialMode)
  const codeRef = useRef(code)
  const modeRef = useRef(mode)
  codeRef.current = code
  modeRef.current = mode
  const { result, isRunning, sandboxUnavailable, run } = usePlayground()
  const [tab, setTab] = useState<Tab>('output')
  const [runToken, setRunToken] = useState(0)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    void run(initialCode, initialMode)
  }, [initialCode, initialMode, run])

  const handleRun = async () => {
    const r = await run(codeRef.current, modeRef.current)
    if (r.errors.length === 0 && r.output) {
      setRunToken((t) => t + 1)
      setTab('console')
    } else {
      setTab('output')
    }
  }

  const handleShare = () => {
    const base = buildShareUrl(codeRef.current)
    const url = new URL(base)
    const query = buildPlaygroundQuery(modeRef.current)
    const full = query ? `${url.origin}${url.pathname}${query}${url.hash}` : base
    void navigator.clipboard.writeText(full).then(() => {
      window.history.replaceState(null, '', `${url.pathname}${query}${url.hash}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    })
  }

  const handleModeChange = (next: PlaygroundMode) => {
    setMode(next)
    modeRef.current = next
    const q = buildPlaygroundQuery(next)
    const path = window.location.pathname
    const hash = window.location.hash
    window.history.replaceState(null, '', `${path}${q}${hash}`)
  }

  const errorCount = result?.errors.length ?? 0
  const serverLogs = result?.usedFallback ? undefined : result?.consoleLogs

  return (
    <div className="flex flex-col gap-3 w-full" style={{ height }}>
      {sandboxUnavailable && (
        <p className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Sandbox unavailable — compiling locally. Runtime uses the client iframe.
        </p>
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <fieldset className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <legend className="sr-only">Runtime mode</legend>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={[
                'rounded px-2.5 py-1 text-xs font-mono transition-colors',
                mode === m.id ? 'bg-orange-500/20 text-orange-400' : 'text-text-muted hover:text-text-primary',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </fieldset>
        <label className="sr-only" htmlFor="pg-examples">
          Load an example
        </label>
        <select
          id="pg-examples"
          defaultValue=""
          onChange={(e) => {
            const ex = EXAMPLES.find((x) => x.id === e.target.value)
            if (ex) {
              setCode(ex.code)
              if (ex.mode) handleModeChange(ex.mode)
            }
            e.target.value = ''
          }}
          className="rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
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
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          {shared ? '✓ Link copied' : 'Share'}
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-4 min-h-0 flex-1">
        <div className="flex-1 min-h-0">
          <Editor value={code} onChange={setCode} onRun={handleRun} diagnostics={result?.diagnostics ?? []} />
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border border-border bg-bg-dark">
          <div className="flex items-center border-b border-border bg-bg-elevated text-xs">
            <TabButton active={tab === 'output'} onClick={() => setTab('output')}>
              Compiled JS
            </TabButton>
            <TabButton active={tab === 'console'} onClick={() => setTab('console')}>
              Console
            </TabButton>
            <div className="ml-auto px-3">
              {isRunning ? (
                <span className="text-orange-400 animate-pulse">Running…</span>
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
              <OutputPanel output={result?.output ?? ''} errors={result?.errors ?? []} isCompiling={isRunning} embedded />
            ) : (
              <ConsolePanel
                code={result?.output ?? ''}
                runToken={runToken}
                serverLogs={serverLogs}
                runtimeError={result?.runtimeError}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
