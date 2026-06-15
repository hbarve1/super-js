import { highlight, type CodeLang } from '@/lib/shiki'

const FEATURES: { icon: string; title: string; desc: string; code: string; lang: CodeLang }[] = [
  {
    icon: '🛡️',
    title: 'Null Safety',
    desc: 'T? is the only nullable type. No null exceptions at runtime.',
    code: `const x: string? = null\nconst y: string = x ?? "default"`,
    lang: 'typescript',
  },
  {
    icon: '∑',
    title: 'Sum Types',
    desc: 'Algebraic data types with exhaustive match — no impossible states.',
    code: `type Result<T,E> = Ok(T) | Err(E)\nconst r: Result<number,string> = Ok(42)`,
    lang: 'typescript',
  },
  {
    icon: '◈',
    title: 'Match Expressions',
    desc: 'Exhaustive pattern matching. The compiler forces you to handle every case.',
    code: `match r {\n  Ok(v) => v * 2,\n  Err(e) => 0\n}`,
    lang: 'typescript',
  },
  {
    icon: '⚡',
    title: 'No any',
    desc: "any is banned. Use dynamic when you need an escape hatch — it's explicit.",
    code: `// ❌  const x: any = fetch()\n// ✅  const x: dynamic = fetch()`,
    lang: 'typescript',
  },
  {
    icon: '↝',
    title: 'Gradual Typing',
    desc: 'Mix typed and untyped code freely. Migrate at your own pace.',
    code: `function greet(name) {  // untyped\n  return "Hello, " + name\n}`,
    lang: 'typescript',
  },
  {
    icon: '0',
    title: 'Zero Runtime',
    desc: 'Compiles to plain JS. No runtime library, no overhead, ships anywhere.',
    code: `// sjs compile app.sjs --out app.js\n// → plain JavaScript, no imports`,
    lang: 'bash',
  },
]

export async function Features() {
  const highlighted = await Promise.all(FEATURES.map((f) => highlight(f.code, f.lang)))

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-4xl font-bold text-text-primary">Everything TypeScript should have been</h2>
        <p className="text-text-muted mt-3 max-w-xl mx-auto">
          Built from first principles. Every decision exists to make your code more correct.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="rounded-xl border border-hairline-soft bg-surface-1 p-6 hover:border-orange-500/30 transition-colors"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="text-text-primary font-semibold mb-1">{f.title}</h3>
            <p className="text-text-muted text-sm mb-4">{f.desc}</p>
            <div
              className="text-xs rounded-lg overflow-hidden [&_pre]:p-3 [&_pre]:!bg-bg-dark [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: highlighted[i] }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
