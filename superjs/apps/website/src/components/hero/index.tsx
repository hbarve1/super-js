'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { HeroContent } from './HeroContent'
import { StaticHero } from './StaticHero'

const EvolutionScene = dynamic(
  () => import('./EvolutionScene').then((m) => m.EvolutionScene),
  { ssr: false },
)

export function Hero() {
  const reducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Animate only after mount and when motion is allowed. SSR + first client
  // render + reduced-motion all get the static hero (no scroll-jack, no WebGL).
  const animate = mounted && !reducedMotion

  const { progress, containerRef } = useScrollProgress(2400, animate)
  const [canvasReady, setCanvasReady] = useState(false)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setCanvasReady(true), 100)
    return () => clearTimeout(t)
  }, [animate])

  if (!animate) return <StaticHero />

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100svh] bg-bg-deep overflow-hidden touch-none"
    >
      {canvasReady && <EvolutionScene progress={progress} />}
      <HeroContent progress={progress} />
    </div>
  )
}
