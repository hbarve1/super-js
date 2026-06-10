import { highlight } from '@/lib/shiki'

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

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Comparison</p>
        <h2 className="text-4xl font-bold text-white">The same problem, solved correctly</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'JavaScript', html: js, accent: '#f7df1e', note: '❌ Silent NaN at runtime' },
          { label: 'TypeScript', html: ts, accent: '#3178c6', note: '⚠️ any still escapes types' },
          { label: 'Super.js',   html: sjs, accent: '#f97316', note: '✅ Forces error handling' },
        ].map(({ label, html, accent, note }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: accent }}>{label}</span>
              <span className="text-xs text-white/40">{note}</span>
            </div>
            <div
              className="text-xs [&_pre]:p-4 [&_pre]:!bg-transparent [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
