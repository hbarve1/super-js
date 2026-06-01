'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { HeroContent } from './HeroContent'

const EvolutionScene = dynamic(
  () => import('./EvolutionScene').then((m) => m.EvolutionScene),
  { ssr: false }
)

export function Hero() {
  const { progress, containerRef } = useScrollProgress(2400)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCanvasReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100svh] bg-[#050510] overflow-hidden touch-none"
    >
      {canvasReady && <EvolutionScene progress={progress} />}
      <HeroContent progress={progress} />
    </div>
  )
}
