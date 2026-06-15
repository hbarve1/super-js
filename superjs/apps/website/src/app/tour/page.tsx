import type { Metadata } from 'next'
import { TourView } from '@/components/tour/TourView'

export const metadata: Metadata = {
  title: 'Tour',
  description: 'Learn Super.js in five runnable steps — null safety, sum types, match, generics.',
  alternates: { canonical: '/tour' },
}

export default function TourPage() {
  return (
    <main id="main-content" className="min-h-screen bg-bg-deep px-4 pt-24 pb-16 md:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-text-primary">Take the tour</h1>
        <p className="mt-3 text-text-muted">
          Five steps, all runnable. Edit any example and press Run — it compiles with the real
          Super.js compiler.
        </p>
      </div>
      <TourView />
    </main>
  )
}
