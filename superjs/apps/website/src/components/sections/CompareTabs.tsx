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
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-border bg-surface-1">
      <div role="tablist" aria-label="Language comparison" className="flex border-b border-border">
        {langs.map((l, i) => (
          <button
            key={l.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={[
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500',
              active === i ? 'bg-surface-2 text-text-primary' : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
            style={active === i ? { boxShadow: `inset 0 -2px 0 ${l.accent}` } : undefined}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-hairline-soft px-4 py-2 text-xs">
        <span style={{ color: lang.accent }}>{lang.verdict}</span>
        <button
          type="button"
          onClick={() => setShowProblem((s) => !s)}
          className="text-text-muted transition-colors hover:text-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          {showProblem ? 'Hide explanation' : 'Why?'}
        </button>
      </div>

      <div
        className="text-sm [&_pre]:!bg-transparent [&_pre]:overflow-x-auto [&_pre]:p-4"
        dangerouslySetInnerHTML={{ __html: lang.html }}
      />

      {showProblem && (
        <div className="border-t border-border bg-surface-1 px-4 py-3 text-sm leading-relaxed text-text-secondary">
          {lang.problem}
        </div>
      )}
    </div>
  )
}
