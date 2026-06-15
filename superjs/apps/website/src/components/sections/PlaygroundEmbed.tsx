import Link from 'next/link'
import { Playground } from '@/components/playground/Playground'

const EMBED_CODE = `// Try Super.js — null-safe, sum types, match expressions

type Result<T, E> = Ok(T) | Err(E)

function safeDivide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match safeDivide(10, 2) {
  Ok(v) => console.log("Answer:", v),
  Err(e) => console.error("Error:", e)
}
`

export function PlaygroundEmbed() {
  return (
    <section className="py-24 px-4 md:px-8 bg-bg-deep">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary">
            Try it{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
              live
            </span>
          </h2>
          <p className="mt-3 text-text-muted max-w-xl mx-auto">
            Edit the Super.js code on the left, hit Run, see compiled JavaScript on the right.
          </p>
        </div>

        {/* Responsive height via CSS: taller on mobile (stacked), shorter on desktop (split). */}
        <div className="h-[420px] md:h-[380px]">
          <Playground initialCode={EMBED_CODE} height="100%" />
        </div>

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
