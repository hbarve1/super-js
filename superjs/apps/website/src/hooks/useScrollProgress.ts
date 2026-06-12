'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll progress 0→1 over `scrollHeight` px, pinning the container. Drives the
 * scroll-told hero (SPEC §Phase B). 0 = top of trigger, 1 = after `scrollHeight`.
 */
export function useScrollProgress(scrollHeight = 2000): {
  progress: number
  containerRef: RefObject<HTMLDivElement | null>
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const tween = gsap.to(
      { value: 0 },
      {
        value: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: `+=${scrollHeight}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => setProgress(self.progress),
        },
      },
    )

    ScrollTrigger.refresh()

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [scrollHeight])

  return { progress, containerRef }
}
