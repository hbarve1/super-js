'use client'

import { useState, useEffect } from 'react'
import { Editor } from './Editor'
import { OutputPanel } from './OutputPanel'
import { useCompiler } from '@/hooks/useCompiler'

const DEFAULT_CODE = `// Super.js — null-safe, sum types, match expressions

type Result<T, E> = Ok(T) | Err(E)

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("Division by zero")
  return Ok(a / b)
}

const result = divide(10, 2)

match result {
  Ok(value) => console.log("Result:", value),
  Err(msg) => console.error("Error:", msg)
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

export function Playground({ initialCode = DEFAULT_CODE, height = '500px' }: PlaygroundProps) {
  const [code, setCode] = useState(initialCode)
  const { result, isCompiling, compile } = useCompiler()

  useEffect(() => {
    compile(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRun = () => compile(code)

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full" style={{ height }}>
      <div className="flex-1 min-h-0">
        <Editor value={code} onChange={setCode} onRun={handleRun} />
      </div>
      <div className="flex-1 min-h-0">
        <OutputPanel
          output={result?.output ?? ''}
          errors={result?.errors ?? []}
          isCompiling={isCompiling}
        />
      </div>
    </div>
  )
}

export { DEFAULT_CODE }
