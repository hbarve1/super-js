'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

const STAGES = [
  { progress: 0, label: 'JavaScript', sub: '1995 — Flexible, dynamic, but unsafe', color: '#f7df1e' },
  { progress: 0.25, label: 'TypeScript', sub: '2012 — Types added, but `any` still leaks', color: '#3178c6' },
  { progress: 0.5, label: 'Super.js', sub: '2025 — Null-safe. Sum types. Zero overhead.', color: '#f97316' },
] as const

type Props = { readonly progress: number }

export function HeroContent({ progress }: Props) {
  const headlineVisible = progress > 0.75
  const stageIndex = progress < 0.25 ? 0 : progress < 0.5 ? 1 : 2
  const stage = STAGES[stageIndex]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-4 pointer-events-none">
      {!headlineVisible && (
        <motion.div
          key={stage.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center mb-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: stage.color }}>
            Evolution
          </p>
          <h2 className="text-4xl font-bold text-white">{stage.label}</h2>
          <p className="text-white/50 mt-2 text-sm">{stage.sub}</p>
        </motion.div>
      )}

      {headlineVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center pointer-events-auto"
        >
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
            <span className="text-white">JavaScript,</span>{' '}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              Perfected.
            </span>
          </h1>
          <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
            Null-safe. Sum types. Match expressions. Compiles to plain JS.
          </p>
          <div className="flex gap-3 justify-center">
            <Button href="/docs/intro" size="md">Get Started →</Button>
            <Button href="/docs/intro" variant="ghost" size="md">View Docs</Button>
          </div>
        </motion.div>
      )}

      {progress < 0.05 && (
        <motion.p
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/30 text-xs tracking-widest absolute bottom-6"
        >
          SCROLL TO EXPLORE
        </motion.p>
      )}
    </div>
  )
}
