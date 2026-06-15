'use client'

import { useState } from 'react'

export interface CompareLang {
  label: string
  html: string
  accent: string
  verdict: string
  problem: string
}

/** Tabbed JS/TS/SJS comparison of the same program, with a reveal-the-problem toggle. */
export function CompareTabs({ langs }: { langs: CompareLang[] }) {
  const [active, setActive] = useState(langs.length - 1) // default to Super.js
  const [showProblem, setShowProblem] = useState(false)
  const lang = langs[active]

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div role="tablist" aria-label="Language comparison" className="flex border-b border-white/10">
        {langs.map((l, i) => (
          <button
            key={l.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={[
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500',
              active === i ? 'bg-white/[0.04] text-white' : 'text-white/50 hover:text-white',
            ].join(' ')}
            style={active === i ? { boxShadow: `inset 0 -2px 0 ${l.accent}` } : undefined}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2 text-xs">
        <span style={{ color: lang.accent }}>{lang.verdict}</span>
        <button
          type="button"
          onClick={() => setShowProblem((s) => !s)}
          className="text-white/50 transition-colors hover:text-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          {showProblem ? 'Hide explanation' : 'Why?'}
        </button>
      </div>

      <div
        className="text-sm [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:p-4"
        dangerouslySetInnerHTML={{ __html: lang.html }}
      />

      {showProblem && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-white/70">
          {lang.problem}
        </div>
      )}
    </div>
  )
}
