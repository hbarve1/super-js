import type { Metadata } from 'next'
import { Playground } from '@/components/playground/Playground'

export const metadata: Metadata = {
  title: 'Playground',
  description: 'Write Super.js in the browser and compile it to JavaScript instantly.',
}

export default function PlaygroundPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg-deep pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto h-[calc(100vh-9rem)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Playground</h1>
          <p className="mt-1 text-text-muted text-sm">
            Write Super.js, press Run (or ⌘/Ctrl+Enter) to compile to JavaScript.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <Playground height="100%" />
        </div>
      </div>
    </main>
  )
}
