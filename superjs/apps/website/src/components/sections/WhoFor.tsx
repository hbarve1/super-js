const PERSONAS: { icon: string; title: string; body: string }[] = [
  {
    icon: '🧹',
    title: 'TypeScript teams tired of any',
    body: 'You added strict mode and still ship "as any" to hit deadlines. Super.js removes the escape hatch by default — any is a compile error, and the holes that any hides simply close.',
  },
  {
    icon: '📦',
    title: 'Library authors',
    body: 'Your public API is a contract. Sum types and exhaustive match let you express it precisely, so callers cannot construct invalid states — and adding a variant tells you exactly which call sites must change.',
  },
  {
    icon: '🎯',
    title: 'Correctness-minded engineers',
    body: 'You reach for Rust’s Result, Option, and pattern matching, but ship to a JS runtime. Super.js brings those ideas to plain JavaScript — sound nullability and ADTs, zero runtime cost.',
  },
]

export function WhoFor() {
  return (
    <section className="py-24 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Who it&apos;s for</p>
        <h2 className="text-4xl font-bold text-white">Built for people who ship JavaScript</h2>
        <p className="text-white/50 mt-3 max-w-xl mx-auto">
          If any of these sound like you, Super.js was designed for your workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PERSONAS.map((p) => (
          <div
            key={p.title}
            className="flex min-w-0 flex-col rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-orange-500/30 transition-colors"
          >
            <div className="text-3xl mb-4">{p.icon}</div>
            <h3 className="text-white font-semibold text-lg mb-3">{p.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
