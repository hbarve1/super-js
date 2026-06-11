import { highlight } from '@/lib/shiki'
import { Button } from '@/components/ui/Button'

const INSTALL = `npm install -g superjs`

const FIRST_PROGRAM = `// hello.sjs
type Greeting = Formal(string) | Casual(string)

function greet(g: Greeting): string {
  return match g {
    Formal(name) => "Good day, " + name + ".",
    Casual(name) => "Hey " + name + "!"
  }
}

console.log(greet(Formal("World")))  // Good day, World.
console.log(greet(Casual("friend"))) // Hey friend!`

const COMPILE = `sjs compile hello.sjs --out hello.js
node hello.js`

export async function Quickstart() {
  const [installHtml, programHtml, compileHtml] = await Promise.all([
    highlight(INSTALL, 'bash'),
    highlight(FIRST_PROGRAM, 'typescript'),
    highlight(COMPILE, 'bash'),
  ])

  return (
    <section className="py-24 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Quickstart</p>
        <h2 className="text-4xl font-bold text-white">From zero to type-safe in 60 seconds</h2>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">1</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Install the compiler</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117]"
              dangerouslySetInnerHTML={{ __html: installHtml }} />
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">2</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Write your first program</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117] [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: programHtml }} />
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">3</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Compile and run</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117]"
              dangerouslySetInnerHTML={{ __html: compileHtml }} />
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-3 justify-center">
        <Button href="/docs">Read the Docs →</Button>
        <Button href="/playground" variant="ghost">Try in Browser</Button>
      </div>
    </section>
  )
}
