'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Returns a scroll progress value 0→1 over `scrollHeight` pixels of scroll.
 * 0 = top of trigger element, 1 = after scrolling `scrollHeight` px.
 */
export function useScrollProgress(scrollHeight = 2000): {
  progress: number
  containerRef: React.RefObject<HTMLDivElement>
} {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return

    const tween = gsap.to({ value: 0 }, {
      value: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: `+=${scrollHeight}`,
        scrub: true,
        pin: true,
        onUpdate: (self) => setProgress(self.progress),
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [scrollHeight])

  return { progress, containerRef }
}
