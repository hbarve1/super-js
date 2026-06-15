'use client'

import { useState } from 'react'
import { Playground } from '@/components/playground/Playground'
import { TOUR } from '@/lib/tour'

export function TourView() {
  const [step, setStep] = useState(0)
  const lesson = TOUR[step]
  const last = TOUR.length - 1

  return (
    <div className="mx-auto max-w-6xl">
      {/* Progress dots */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {TOUR.map((t, i) => (
          <button
            key={t.title}
            type="button"
            onClick={() => setStep(i)}
            aria-label={`Step ${i + 1}: ${t.title}`}
            aria-current={i === step}
            className={[
              'h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500',
              i === step ? 'w-8 bg-orange-400' : 'w-2 bg-surface-4 hover:bg-surface-4',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-orange-400">
            Step {step + 1} / {TOUR.length}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-text-primary">{lesson.title}</h2>
          <p className="mt-4 leading-relaxed text-text-muted">{lesson.body}</p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(last, s + 1))}
              disabled={step === last}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              {step === last ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>

        {/* Remount per step so the editor loads the step's code. */}
        <div className="h-[60vh] min-h-[420px]">
          <Playground key={step} initialCode={lesson.code} height="100%" />
        </div>
      </div>
    </div>
  )
}
