'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Playground } from '@/components/playground/Playground'

const EMBED_CODE = `// Try Super.js — null-safe, sum types, match expressions

type Result<T, E> = Ok(T) | Err(E)

function safeDivide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("Division by zero")
  return Ok(a / b)
}

const r = safeDivide(10, 2)

match r {
  Ok(v) => console.log("Answer:", v),
  Err(e) => console.error("Error:", e)
}
`

export default function PlaygroundEmbed() {
  const [height, setHeight] = useState('380px')

  useEffect(() => {
    const update = () => setHeight(window.innerWidth < 768 ? '420px' : '380px')
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <section className="py-24 px-4 md:px-8 bg-[#050510]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#f8fafc]">
            Try it{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
              live
            </span>
          </h2>
          <p className="mt-3 text-[#94a3b8] max-w-xl mx-auto">
            Edit the Super.js code on the left, hit Run, see compiled JavaScript on the right.
          </p>
        </div>

        <Playground initialCode={EMBED_CODE} height={height} />

        <div className="mt-6 text-center">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
          >
            Open full playground →
          </Link>
        </div>
      </div>
    </section>
  )
}
