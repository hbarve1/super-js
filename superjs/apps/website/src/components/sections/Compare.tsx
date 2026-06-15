import { highlight } from '@/lib/shiki'
import { CompareTabs, type CompareLang } from './CompareTabs'

const JS_CODE = `// JavaScript
function divide(a, b) {
  return a / b  // b could be null
}

const result = divide(10, null)
console.log(result) // NaN — no error!`

const TS_CODE = `// TypeScript
function divide(a: number, b: number): number {
  return a / b
}

// TypeScript still allows:
const x: any = null
divide(10, x as number) // compiles fine`

const SJS_CODE = `// Super.js
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 0) {
  Ok(v) => console.log(v),
  Err(e) => console.error(e)
}`

export async function Compare() {
  const [js, ts, sjs] = await Promise.all([
    highlight(JS_CODE, 'javascript'),
    highlight(TS_CODE, 'typescript'),
    highlight(SJS_CODE, 'typescript'),
  ])

  const langs: CompareLang[] = [
    {
      label: 'JavaScript',
      html: js,
      accent: '#f7df1e',
      verdict: '❌ Silent NaN at runtime',
      problem:
        'b can be null. 10 / null is NaN — no error, no warning. The bug ships and surfaces somewhere far from its cause.',
    },
    {
      label: 'TypeScript',
      html: ts,
      accent: '#3178c6',
      verdict: '⚠️ any escapes the type system',
      problem:
        'The signature looks safe, but an any value (or an as cast) silently disables checking — the unsafe value flows straight in and TypeScript says nothing.',
    },
    {
      label: 'Super.js',
      html: sjs,
      accent: '#f97316',
      verdict: '✅ The compiler forces you to handle it',
      problem:
        'No any, no implicit null. divide returns a Result, and match must handle both Ok and Err — the error path simply cannot be forgotten.',
    },
  ]

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Comparison</p>
        <h2 className="text-4xl font-bold text-white">The same problem, solved correctly</h2>
        <p className="mt-3 text-white/50">Switch tabs — same program, three outcomes.</p>
      </div>
      <CompareTabs langs={langs} />
    </section>
  )
}
