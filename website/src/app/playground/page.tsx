import type { Metadata } from 'next'
import { Playground } from '@/components/playground/Playground'

export const metadata: Metadata = {
  title: 'Playground — Super.js',
  description: 'Write and compile Super.js in your browser.',
}

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-[#050510] pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#f8fafc]">
            Live{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">
              Playground
            </span>
          </h1>
          <p className="mt-2 text-[#94a3b8]">
            Write Super.js and see the compiled JavaScript output instantly.
          </p>
        </div>

        <Playground height="calc(100vh - 220px)" />

        <p className="mt-4 text-xs text-[#475569] text-center">
          Compiled in-browser via the Super.js edge compiler. Press{' '}
          <kbd className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[10px]">⌘↵</kbd>{' '}
          or the Run button to compile.
        </p>
      </div>
    </div>
  )
}
