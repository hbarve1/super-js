import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PlaygroundWithUrl } from '@/components/playground/PlaygroundWithUrl'

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Write Super.js in the browser, compile, and run it in a sandboxed runtime.',
}

export default function PlaygroundPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg-deep pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Playground</h1>
          <p className="mt-1 text-text-muted text-sm">
            Write Super.js, choose a runtime mode, and press Run (or ⌘/Ctrl+Enter).
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-text-muted">Loading playground…</div>
            }
          >
            <PlaygroundWithUrl height="100%" />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
