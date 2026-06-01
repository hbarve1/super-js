'use client'

import dynamic from 'next/dynamic'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { HeroContent } from './HeroContent'

const EvolutionScene = dynamic(
  () => import('./EvolutionScene').then((m) => m.EvolutionScene),
  { ssr: false }
)

export function Hero() {
  const { progress, containerRef } = useScrollProgress(2400)

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#050510] overflow-hidden">
      <EvolutionScene progress={progress} />
      <HeroContent progress={progress} />
    </div>
  )
}
