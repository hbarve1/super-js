import { Button } from '@/components/ui/Button'

export function CallToAction() {
  return (
    <section className="py-32 px-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full" />
      </div>
      <div className="relative z-10">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-4">Get Started</p>
        <h2 className="text-5xl font-black text-white mb-4">
          Start writing{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            Super.js
          </span>{' '}
          today.
        </h2>
        <p className="text-white/50 mb-10 max-w-md mx-auto">
          Type-safe by default. Zero configuration. Compiles to plain JavaScript.
        </p>
        <div className="flex gap-3 justify-center">
          <Button href="/docs/intro" size="md">Read the Docs →</Button>
          <Button href="https://github.com/hbarve1/super-js" variant="ghost" size="md">
            View on GitHub
          </Button>
        </div>
      </div>
    </section>
  )
}
