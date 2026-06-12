import { Button } from '@/components/ui/Button'

export default function Home() {
  return (
    <main id="main-content" className="min-h-[100svh] px-6 pt-32 pb-24">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-mono uppercase tracking-widest text-orange">
          null-safe · sum types · match
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          JavaScript,{' '}
          <span className="bg-gradient-to-r from-orange to-amber bg-clip-text text-transparent">
            Perfected.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-text-muted">
          A null-safe, sum-typed superset of JavaScript. Compile to plain JS with
          zero runtime overhead.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button href="/docs/intro">Get Started</Button>
          <Button href="/playground" variant="ghost">
            Try the Playground
          </Button>
        </div>
      </section>
    </main>
  )
}
