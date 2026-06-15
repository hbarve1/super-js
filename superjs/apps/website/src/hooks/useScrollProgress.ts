'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll progress 0→1 over `scrollHeight` px, pinning the container. Drives the
 * scroll-told hero. When `enabled` is false (reduced-motion / pre-mount) the
 * GSAP pin + touch normalization never attach, so the page scrolls normally.
 */
export function useScrollProgress(
  scrollHeight = 2000,
  enabled = true,
): { progress: number; containerRef: RefObject<HTMLDivElement | null> } {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    // GSAP owns touch scrolling so the pinned, touch-none hero stays scrollable.
    ScrollTrigger.normalizeScroll(true)

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
      ScrollTrigger.normalizeScroll(false)
    }
  }, [scrollHeight, enabled])

  return { progress, containerRef }
}
