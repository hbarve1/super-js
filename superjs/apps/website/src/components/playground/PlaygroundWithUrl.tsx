'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Playground } from './Playground'
import { parsePlaygroundUrl, resolveInitialCode, type PlaygroundMode } from '@/lib/playground-url'

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

const name: string? = null
const greeting = name ?? "World"
console.log("Hello,", greeting)
`

interface PlaygroundWithUrlProps {
  height?: string
}

/** Playground that reads ?mode=, ?example=, and #code= from the URL. */
export function PlaygroundWithUrl({ height = '500px' }: PlaygroundWithUrlProps) {
  const searchParams = useSearchParams()
  const [initial, setInitial] = useState<{ code: string; mode: PlaygroundMode } | null>(null)

  useEffect(() => {
    const state = parsePlaygroundUrl(searchParams.toString())
    setInitial({
      code: resolveInitialCode(state, DEFAULT_CODE),
      mode: state.mode,
    })
  }, [searchParams])

  if (!initial) {
    return (
      <div className="flex items-center justify-center text-text-muted" style={{ height }}>
        Loading playground…
      </div>
    )
  }

  return <Playground key={`${initial.mode}:${initial.code.slice(0, 32)}`} initialCode={initial.code} initialMode={initial.mode} height={height} />
}
