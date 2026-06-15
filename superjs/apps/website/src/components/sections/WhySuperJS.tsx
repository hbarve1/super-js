const BEATS: { step: string; label: string; title: string; body: string; evidence: string }[] = [
  {
    step: '01',
    label: 'The problem',
    title: 'JavaScript lets bugs through. TypeScript leaks.',
    body: 'null and undefined crash code at runtime, where users find them. TypeScript helps — until any quietly switches the checker off, casts paper over holes, and "impossible" states slip past the compiler into production.',
    evidence: 'Cannot read properties of null is still the most common JS runtime error.',
  },
  {
    step: '02',
    label: 'The solution',
    title: 'Sound types and exhaustive matching.',
    body: 'T? is the only nullable type — a plain string can never be null. Sum types model data as named variants, and match forces you to handle every one. any is banned; the escape hatch is spelled dynamic — explicit and greppable.',
    evidence: 'Whole classes of bugs become unrepresentable, caught at compile time.',
  },
  {
    step: '03',
    label: 'The payoff',
    title: 'Fewer runtime bugs, zero overhead.',
    body: 'Super.js compiles to plain JavaScript — no runtime library, no wrapper objects, no startup cost. The safety lives entirely in the compiler. Ship the same JS you would have, minus the bugs the compiler refused to emit.',
    evidence: 'Output is readable JS that runs anywhere JS runs.',
  },
]

export function WhySuperJS() {
  return (
    <section className="py-24 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Why Super.js</p>
        <h2 className="text-4xl font-bold text-text-primary">Correctness, by construction</h2>
        <p className="text-text-muted mt-3 max-w-xl mx-auto">
          Three beats: the problem with the status quo, what Super.js does about it, and what you get.
        </p>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {BEATS.map((b) => (
          <li
            key={b.step}
            className="flex min-w-0 flex-col rounded-xl border border-hairline-soft bg-surface-1 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-2xl font-bold text-orange-400/80 tabular-nums">{b.step}</span>
              <span className="text-xs uppercase tracking-widest text-text-subtle">{b.label}</span>
            </div>
            <h3 className="text-text-primary font-semibold text-lg mb-3">{b.title}</h3>
            <p className="text-text-muted text-sm leading-relaxed mb-4">{b.body}</p>
            <p className="mt-auto border-l-2 border-orange-500/40 pl-3 text-xs italic text-text-subtle">
              {b.evidence}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
