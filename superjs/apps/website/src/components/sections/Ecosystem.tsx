const TOOLS = [
  { name: 'VS Code Extension', icon: '🎨' },
  { name: 'CLI Compiler', icon: '⚙️' },
  { name: 'Type Checker', icon: '🛡️' },
  { name: 'Linter', icon: '🔍' },
  { name: 'Formatter', icon: '✨' },
  { name: 'Node.js', icon: '🟢' },
  { name: 'Browser', icon: '🌐' },
  { name: 'Bun', icon: '🥟' },
  { name: 'React', icon: '⚛️' },
  { name: 'JSX / TSX', icon: '📦' },
] as const

export function Ecosystem() {
  return (
    <section className="py-20 overflow-hidden border-y border-white/5">
      <div className="text-center mb-10">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-2">Ecosystem</p>
        <h2 className="text-3xl font-bold text-white">Works everywhere JavaScript does</h2>
      </div>
      <div className="flex gap-6 animate-[marquee_25s_linear_infinite] whitespace-nowrap">
        {[...TOOLS, ...TOOLS].map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/5 bg-white/[0.02] text-white/60 text-sm flex-shrink-0"
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
