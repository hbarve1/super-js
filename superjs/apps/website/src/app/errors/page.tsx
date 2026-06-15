import type { Metadata } from 'next'
import {
  REGISTRY,
  type DiagnosticDescriptor,
  type DiagnosticCategory,
} from '@superjs/diagnostics'

export const metadata: Metadata = {
  title: 'Error Code Reference',
  description:
    'Every Super.js diagnostic — SJS-P (parser), SJS-E (type errors), SJS-W (warnings), SJS-L (lint) — with severity, category, and owning stage. Generated from the compiler registry.',
  alternates: { canonical: '/errors' },
}

/** Display order + human labels for each category in the registry. */
const CATEGORY_ORDER: { key: DiagnosticCategory; label: string }[] = [
  { key: 'parser', label: 'Parser' },
  { key: 'null-safety', label: 'Null safety' },
  { key: 'type-check', label: 'Type checking' },
  { key: 'match', label: 'Match expressions' },
  { key: 'control-flow', label: 'Control flow' },
  { key: 'access-modifiers', label: 'Access modifiers' },
  { key: 'classes', label: 'Classes' },
  { key: 'modules', label: 'Modules' },
  { key: 'async-await', label: 'Async / await' },
  { key: 'jsx', label: 'JSX' },
  { key: 'dynamic', label: 'Dynamic' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'try-catch', label: 'Try / catch' },
  { key: 'security', label: 'Security' },
  { key: 'lint', label: 'Lint' },
]

function SeverityBadge({ severity }: { severity: DiagnosticDescriptor['severity'] }) {
  const isError = severity === 'error'
  return (
    <span
      className={[
        'inline-block rounded px-2 py-0.5 text-xs font-medium',
        isError ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300',
      ].join(' ')}
    >
      {severity}
    </span>
  )
}

export default function ErrorsPage() {
  const all = Object.values(REGISTRY)
  const byCategory = new Map<DiagnosticCategory, DiagnosticDescriptor[]>()
  for (const d of all) {
    const list = byCategory.get(d.category) ?? []
    list.push(d)
    byCategory.set(d.category, list)
  }

  return (
    <main id="main-content" className="min-h-screen bg-bg-deep px-4 pt-24 pb-16 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12">
          <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Reference</p>
          <h1 className="text-4xl font-bold text-white">Error code reference</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/60">
            Every diagnostic the Super.js compiler can emit. Codes are permanent — never renumbered
            or reused. <span className="text-white/80">SJS-P</span> are parser errors,{' '}
            <span className="text-white/80">SJS-E</span> type errors,{' '}
            <span className="text-white/80">SJS-W</span> warnings (promoted to errors under{' '}
            <code className="font-mono text-orange-300">--strict</code>), and{' '}
            <span className="text-white/80">SJS-L</span> lint rules (off under{' '}
            <code className="font-mono text-orange-300">--loose</code>).
          </p>
          <p className="mt-3 text-sm text-white/40">
            {all.length} codes, generated from the{' '}
            <code className="font-mono">@superjs/diagnostics</code> registry.
          </p>
        </header>

        <div className="space-y-12">
          {CATEGORY_ORDER.map(({ key, label }) => {
            const codes = byCategory.get(key)
            if (!codes || codes.length === 0) return null
            return (
              <section key={key} aria-labelledby={`cat-${key}`}>
                <h2 id={`cat-${key}`} className="mb-4 text-2xl font-bold text-white">
                  {label}
                </h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">Code</th>
                        <th scope="col" className="px-4 py-3 font-medium">Severity</th>
                        <th scope="col" className="px-4 py-3 font-medium">Message</th>
                        <th scope="col" className="px-4 py-3 font-medium">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {codes.map((d) => (
                        <tr key={d.code} id={d.code} className="scroll-mt-24 align-top">
                          <td className="px-4 py-3">
                            <a
                              href={`#${d.code}`}
                              className="font-mono text-orange-300 hover:text-orange-200"
                            >
                              {d.code}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <SeverityBadge severity={d.severity} />
                          </td>
                          <td className="px-4 py-3 text-white/70">{d.template}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-white/40">{d.stage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
