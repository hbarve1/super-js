import { Button } from '@/components/ui/Button'
import { CopyCommand } from '@/components/ui/CopyCommand'

/**
 * Non-animated hero — served on SSR, before mount, and for visitors with
 * `prefers-reduced-motion`. No scroll-pin, no R3F canvas: instant paint, no
 * scroll-jacking, no WebGL cost.
 */
export function StaticHero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="mt-[-10%] h-[420px] w-[700px] max-w-full rounded-full bg-orange-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-orange-400">
          null-safe · sum types · zero runtime
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          <span className="text-text-primary">JavaScript,</span>{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            Perfected.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-text-muted">
          A sound, null-safe superset of JavaScript — sum types, exhaustive{' '}
          <code className="font-mono text-amber-300">match</code>, no{' '}
          <code className="font-mono text-amber-300">any</code>. Compiles to plain JS with zero
          runtime overhead.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button href="/playground" size="md">
            Try the Playground →
          </Button>
          <Button href="/docs/intro" variant="ghost" size="md">
            Read the Docs
          </Button>
        </div>

        <div className="mt-8 flex justify-center">
          <CopyCommand command="npm i -g superjs" />
        </div>
      </div>
    </section>
  )
}
