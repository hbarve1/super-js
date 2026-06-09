# Super.js Website — Plan B: Landing Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Super.js landing page — scroll-driven JS→TS→SJS evolution hero with R3F 3D characters, plus all 6 sections (Features, Compare, Quickstart, Playground embed, Ecosystem, CTA).

**Architecture:** All sections are React Server Components except the R3F canvas and Monaco embed (client components). GSAP ScrollTrigger drives the hero timeline. Framer Motion handles section reveal animations. Three mascot characters are procedural R3F meshes (no external .glb files needed).

**Tech Stack:** React Three Fiber · Three.js · GSAP ScrollTrigger · Framer Motion · Tailwind CSS v4 · Next.js 16 App Router

**Prerequisite:** Plan A must be complete (scaffold + Navbar running).

---

## File Map

| File | Purpose |
|---|---|
| `website/src/app/page.tsx` | Landing page — assembles all sections |
| `website/src/components/hero/EvolutionScene.tsx` | R3F canvas, full-viewport, manages scroll progress |
| `website/src/components/hero/CharacterJS.tsx` | JS mascot mesh (yellow glowing cube) |
| `website/src/components/hero/CharacterTS.tsx` | TS mascot mesh (blue glowing cube) |
| `website/src/components/hero/CharacterSJS.tsx` | SJS hero mesh (orange icosahedron + glow) |
| `website/src/components/hero/FloatingCodeCards.tsx` | Orbiting SJS syntax cards in 3D |
| `website/src/components/hero/HeroContent.tsx` | HTML overlay on top of canvas (headline + CTAs) |
| `website/src/components/sections/Features.tsx` | 6 animated feature cards |
| `website/src/components/sections/Compare.tsx` | JS/TS/SJS side-by-side code comparison |
| `website/src/components/sections/Quickstart.tsx` | Install + first program, animated typing |
| `website/src/components/sections/PlaygroundEmbed.tsx` | Embedded Monaco editor (lazy loaded) |
| `website/src/components/sections/Ecosystem.tsx` | Scrolling tool marquee |
| `website/src/components/sections/CallToAction.tsx` | Bottom CTA with particle field |
| `website/src/hooks/useScrollProgress.ts` | GSAP ScrollTrigger → normalized 0-1 progress |
| `website/src/lib/shiki.ts` | Shiki singleton for server-side code highlighting |

---

### Task 1: Install 3D and animation dependencies

**Files:**
- Modify: `website/package.json`

- [ ] **Step 1: Install packages**

```bash
cd website
npm install three @react-three/fiber @react-three/drei gsap framer-motion
npm install -D @types/three
```

- [ ] **Step 2: Verify TypeScript resolves Three.js types**

```bash
npx tsc --noEmit
```

Expected: no errors about missing `three` types.

- [ ] **Step 3: Commit**

```bash
git add website/package.json website/package-lock.json
git commit -m "feat(website): install R3F, Three.js, GSAP, Framer Motion"
```

---

### Task 2: `useScrollProgress` hook

**Files:**
- Create: `website/src/hooks/useScrollProgress.ts`

- [ ] **Step 1: Create hook**

```ts
// website/src/hooks/useScrollProgress.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add website/src/hooks/
git commit -m "feat(website): useScrollProgress hook (GSAP ScrollTrigger)"
```

---

### Task 3: JS mascot character (R3F mesh)

**Files:**
- Create: `website/src/components/hero/CharacterJS.tsx`

- [ ] **Step 1: Create CharacterJS**

```tsx
// website/src/components/hero/CharacterJS.tsx
'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  progress: number   // 0→1 hero scroll progress
  position: [number, number, number]
}

export function CharacterJS({ progress, position }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.PointLight>(null!)

  // Appear at progress=0, step back at progress=0.4
  const visible = progress < 0.5
  const opacity = visible ? Math.min(1, progress < 0.4 ? 1 : (0.5 - progress) / 0.1) : 0
  const scale = 0.4 + progress * 0.2

  useFrame((state) => {
    if (!meshRef.current) return
    // Idle bob
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    // Slow rotation
    meshRef.current.rotation.y += 0.005
  })

  return (
    <group position={position} scale={scale}>
      {/* Body: rounded box */}
      <mesh ref={meshRef}>
        <boxGeometry args={[0.8, 0.8, 0.8, 1, 1, 1]} />
        <meshStandardMaterial
          color="#f7df1e"
          emissive="#f7df1e"
          emissiveIntensity={0.3}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      {/* "JS" label plane */}
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={opacity * 0.9} />
      </mesh>
      {/* Glow light */}
      <pointLight
        ref={glowRef}
        color="#f7df1e"
        intensity={opacity * 2}
        distance={3}
      />
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/hero/CharacterJS.tsx
git commit -m "feat(website): JS mascot R3F character"
```

---

### Task 4: TS mascot character

**Files:**
- Create: `website/src/components/hero/CharacterTS.tsx`

- [ ] **Step 1: Create CharacterTS**

```tsx
// website/src/components/hero/CharacterTS.tsx
'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  progress: number
  position: [number, number, number]
}

export function CharacterTS({ progress, position }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!)

  // Appear at progress=0.15, step back at progress=0.45
  const fadeIn = Math.min(1, Math.max(0, (progress - 0.15) / 0.1))
  const fadeOut = progress > 0.45 ? Math.max(0, 1 - (progress - 0.45) / 0.1) : 1
  const opacity = fadeIn * fadeOut
  const scale = 0.35 + progress * 0.15

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.9 + 1) * 0.05
    meshRef.current.rotation.y -= 0.004
  })

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial
          color="#3178c6"
          emissive="#3178c6"
          emissiveIntensity={0.4}
          transparent
          opacity={opacity}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>
      <pointLight color="#3178c6" intensity={opacity * 2.5} distance={3} />
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/hero/CharacterTS.tsx
git commit -m "feat(website): TS mascot R3F character"
```

---

### Task 5: SJS hero character

**Files:**
- Create: `website/src/components/hero/CharacterSJS.tsx`

- [ ] **Step 1: Create CharacterSJS**

```tsx
// website/src/components/hero/CharacterSJS.tsx
'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  progress: number
  position: [number, number, number]
}

export function CharacterSJS({ progress, position }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)

  // Bursts in at progress=0.5
  const opacity = Math.max(0, (progress - 0.5) / 0.15)
  const burstScale = opacity < 1 ? 0.5 + opacity * 1.5 : 1 + Math.sin(opacity * Math.PI) * 0.1
  const scale = (0.5 + progress * 0.4) * burstScale

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.008
    meshRef.current.rotation.x += 0.003
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01
    }
  })

  return (
    <group position={position} scale={scale}>
      {/* Icosahedron core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.5}
          transparent
          opacity={opacity}
          wireframe={false}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh scale={1.01}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={opacity * 0.3} wireframe />
      </mesh>
      {/* Orbit ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.01, 8, 64]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={opacity * 0.6} />
      </mesh>
      {/* Strong glow */}
      <pointLight color="#f97316" intensity={opacity * 4} distance={5} />
      <pointLight color="#fbbf24" intensity={opacity * 2} distance={8} position={[0, 1, 0]} />
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/hero/CharacterSJS.tsx
git commit -m "feat(website): SJS hero R3F character (orange icosahedron)"
```

---

### Task 6: Floating code cards

**Files:**
- Create: `website/src/components/hero/FloatingCodeCards.tsx`

- [ ] **Step 1: Create FloatingCodeCards**

```tsx
// website/src/components/hero/FloatingCodeCards.tsx
'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const CARDS = [
  { code: 'type Result<T,E> = Ok(T) | Err(E)', orbit: 1.4, speed: 0.3, yOffset: 0.2 },
  { code: 'match r { Ok(v) => v }',             orbit: 1.1, speed: -0.25, yOffset: -0.3 },
  { code: 'const x: string? = null',            orbit: 1.6, speed: 0.2,  yOffset: 0.5 },
  { code: 'dynamic',                             orbit: 0.9, speed: -0.4, yOffset: -0.1 },
]

type Props = { progress: number }

function CodeCard({
  code, orbit, speed, yOffset, progress,
}: { code: string; orbit: number; speed: number; yOffset: number; progress: number }) {
  const groupRef = useRef<THREE.Group>(null!)
  const angle = useRef(Math.random() * Math.PI * 2)

  const opacity = Math.max(0, (progress - 0.65) / 0.2)

  useFrame((_, delta) => {
    angle.current += speed * delta
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angle.current) * orbit
      groupRef.current.position.z = Math.sin(angle.current) * orbit
      groupRef.current.position.y = yOffset + Math.sin(angle.current * 2) * 0.1
      groupRef.current.rotation.y = -angle.current
    }
  })

  return (
    <group ref={groupRef}>
      {/* Card background plane */}
      <mesh>
        <planeGeometry args={[code.length * 0.055 + 0.2, 0.22]} />
        <meshBasicMaterial
          color="#0f1117"
          transparent
          opacity={opacity * 0.85}
        />
      </mesh>
      {/* Border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(code.length * 0.055 + 0.2, 0.22)]} />
        <lineBasicMaterial color="#f97316" transparent opacity={opacity * 0.4} />
      </lineSegments>
      {/* Code text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.07}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        font="/fonts/GeistMono-Regular.woff"
        fillOpacity={opacity}
      >
        {code}
      </Text>
    </group>
  )
}

export function FloatingCodeCards({ progress }: Props) {
  return (
    <group>
      {CARDS.map((card, i) => (
        <CodeCard key={i} {...card} progress={progress} />
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/hero/FloatingCodeCards.tsx
git commit -m "feat(website): floating 3D SJS code cards (orbiting)"
```

---

### Task 7: Evolution Scene (R3F canvas)

**Files:**
- Create: `website/src/components/hero/EvolutionScene.tsx`

- [ ] **Step 1: Create EvolutionScene**

```tsx
// website/src/components/hero/EvolutionScene.tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { Stars, AdaptiveDpr } from '@react-three/drei'
import { CharacterJS } from './CharacterJS'
import { CharacterTS } from './CharacterTS'
import { CharacterSJS } from './CharacterSJS'
import { FloatingCodeCards } from './FloatingCodeCards'

type Props = { progress: number }

export function EvolutionScene({ progress }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 60 }}
      style={{ position: 'absolute', inset: 0 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <AdaptiveDpr pixelated />
      <ambientLight intensity={0.1} />
      <Stars radius={80} depth={40} count={3000} factor={3} fade speed={0.5} />

      {/* Evolution beam — fades in at progress=0.45 */}
      {progress > 0.4 && (
        <mesh position={[0, 0, -1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, 4, 8]} />
          <meshBasicMaterial
            color="#f97316"
            transparent
            opacity={Math.min(1, (progress - 0.4) / 0.1) * 0.7}
          />
        </mesh>
      )}

      <CharacterJS progress={progress} position={[-1.5, 0, 0]} />
      <CharacterTS progress={progress} position={[1.5, 0, 0]} />
      <CharacterSJS progress={progress} position={[0, 0, 0]} />
      <FloatingCodeCards progress={progress} />
    </Canvas>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/hero/EvolutionScene.tsx
git commit -m "feat(website): EvolutionScene R3F canvas"
```

---

### Task 8: HeroContent overlay + full Hero section

**Files:**
- Create: `website/src/components/hero/HeroContent.tsx`
- Create: `website/src/components/hero/index.tsx`

- [ ] **Step 1: Create HeroContent**

```tsx
// website/src/components/hero/HeroContent.tsx
'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

const STAGES = [
  { progress: 0,    label: 'JavaScript', sub: '1995 — Flexible, dynamic, but unsafe', color: '#f7df1e' },
  { progress: 0.25, label: 'TypeScript', sub: '2012 — Types added, but `any` still leaks', color: '#3178c6' },
  { progress: 0.5,  label: 'Super.js',   sub: '2025 — Null-safe. Sum types. Zero overhead.', color: '#f97316' },
]

type Props = { progress: number }

export function HeroContent({ progress }: Props) {
  const headlineVisible = progress > 0.75
  const stageIndex = progress < 0.25 ? 0 : progress < 0.5 ? 1 : 2
  const stage = STAGES[stageIndex]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 px-4 pointer-events-none">
      {/* Stage label */}
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

      {/* Final headline — appears at progress > 0.75 */}
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
            <Button href="/docs" size="md">Get Started →</Button>
            <Button href="/docs" variant="ghost" size="md">View Docs</Button>
          </div>
        </motion.div>
      )}

      {/* Scroll hint */}
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
```

- [ ] **Step 2: Create Hero index**

```tsx
// website/src/components/hero/index.tsx
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
```

- [ ] **Step 3: Add Hero to landing page**

```tsx
// website/src/app/page.tsx
import { Hero } from '@/components/hero'

export default function Home() {
  return (
    <main className="bg-[#050510]">
      <Hero />
      {/* sections will follow */}
    </main>
  )
}
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Expected: full-viewport dark canvas, JS yellow cube appears, scrolling transitions through TS blue, then SJS orange burst. Final headline "JavaScript, Perfected." with CTA appears at end of scroll.

- [ ] **Step 5: Commit**

```bash
git add website/src/components/hero/ website/src/app/page.tsx
git commit -m "feat(website): Hero section — scroll-driven JS→TS→SJS evolution"
```

---

### Task 9: Shiki code highlighting

**Files:**
- Create: `website/src/lib/shiki.ts`

- [ ] **Step 1: Install Shiki**

```bash
cd website
npm install shiki
```

- [ ] **Step 2: Create Shiki singleton**

```ts
// website/src/lib/shiki.ts
import { createHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'bash', 'json'],
    })
  }
  return highlighter
}

export async function highlight(code: string, lang: 'typescript' | 'javascript' | 'bash' | 'json'): Promise<string> {
  const hl = await getHighlighter()
  return hl.codeToHtml(code, {
    lang,
    theme: 'github-dark',
    transformers: [],
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/lib/shiki.ts website/package.json website/package-lock.json
git commit -m "feat(website): Shiki syntax highlighting singleton"
```

---

### Task 10: Features section

**Files:**
- Create: `website/src/components/sections/Features.tsx`

- [ ] **Step 1: Create Features**

```tsx
// website/src/components/sections/Features.tsx
import { highlight } from '@/lib/shiki'

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Null Safety',
    desc: 'T? is the only nullable type. No null exceptions at runtime.',
    code: `const x: string? = null\nconst y: string = x ?? "default"`,
    lang: 'typescript' as const,
  },
  {
    icon: '∑',
    title: 'Sum Types',
    desc: 'Algebraic data types with exhaustive match — no impossible states.',
    code: `type Result<T,E> = Ok(T) | Err(E)\nconst r: Result<number,string> = Ok(42)`,
    lang: 'typescript' as const,
  },
  {
    icon: '◈',
    title: 'Match Expressions',
    desc: 'Exhaustive pattern matching. The compiler forces you to handle every case.',
    code: `match r {\n  Ok(v) => v * 2,\n  Err(e) => 0\n}`,
    lang: 'typescript' as const,
  },
  {
    icon: '⚡',
    title: 'No any',
    desc: 'any is banned. Use dynamic when you need an escape hatch — it\'s explicit.',
    code: `// ❌  const x: any = fetch()\n// ✅  const x: dynamic = fetch()`,
    lang: 'typescript' as const,
  },
  {
    icon: '↝',
    title: 'Gradual Typing',
    desc: 'Mix typed and untyped code freely. Migrate at your own pace.',
    code: `function greet(name) {  // untyped\n  return "Hello, " + name\n}`,
    lang: 'typescript' as const,
  },
  {
    icon: '0',
    title: 'Zero Runtime',
    desc: 'Compiles to plain JS. No runtime library, no overhead, ships anywhere.',
    code: `// sjs compile app.sjs --out app.js\n// → plain JavaScript, no imports`,
    lang: 'bash' as const,
  },
]

export async function Features() {
  const highlighted = await Promise.all(
    FEATURES.map((f) => highlight(f.code, f.lang))
  )

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Features</p>
        <h2 className="text-4xl font-bold text-white">Everything TypeScript should have been</h2>
        <p className="text-white/50 mt-3 max-w-xl mx-auto">
          Built from first principles. Every decision exists to make your code more correct.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:border-orange-500/30 transition-colors"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="text-white font-semibold mb-1">{f.title}</h3>
            <p className="text-white/50 text-sm mb-4">{f.desc}</p>
            <div
              className="text-xs rounded-lg overflow-hidden [&_pre]:p-3 [&_pre]:!bg-[#0d1117] [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: highlighted[i] }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to page.tsx**

```tsx
import { Features } from '@/components/sections/Features'
// after <Hero />:
<Features />
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Expected: 6 dark cards with feature names, descriptions, and Shiki-highlighted code snippets.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/sections/Features.tsx website/src/app/page.tsx
git commit -m "feat(website): Features section (6 cards, Shiki code)"
```

---

### Task 11: Compare section

**Files:**
- Create: `website/src/components/sections/Compare.tsx`

- [ ] **Step 1: Create Compare**

```tsx
// website/src/components/sections/Compare.tsx
import { highlight } from '@/lib/shiki'

const JS_CODE = `// JavaScript
function divide(a, b) {
  return a / b  // b could be null
}

const result = divide(10, null)
console.log(result) // NaN — no error!`

const TS_CODE = `// TypeScript
function divide(a: number, b: number): number {
  return a / b
}

// TypeScript still allows:
const x: any = null
divide(10, x as number) // compiles fine`

const SJS_CODE = `// Super.js
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("division by zero")
  return Ok(a / b)
}

match divide(10, 0) {
  Ok(v) => console.log(v),
  Err(e) => console.error(e)
}`

export async function Compare() {
  const [js, ts, sjs] = await Promise.all([
    highlight(JS_CODE, 'javascript'),
    highlight(TS_CODE, 'typescript'),
    highlight(SJS_CODE, 'typescript'),
  ])

  return (
    <section className="py-24 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Comparison</p>
        <h2 className="text-4xl font-bold text-white">The same problem, solved correctly</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'JavaScript', html: js, accent: '#f7df1e', note: '❌ Silent NaN at runtime' },
          { label: 'TypeScript', html: ts, accent: '#3178c6', note: '⚠️ any still escapes types' },
          { label: 'Super.js',   html: sjs, accent: '#f97316', note: '✅ Forces error handling' },
        ].map(({ label, html, accent, note }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: accent }}>{label}</span>
              <span className="text-xs text-white/40">{note}</span>
            </div>
            <div
              className="text-xs [&_pre]:p-4 [&_pre]:!bg-transparent [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to page.tsx after Features**

- [ ] **Step 3: Commit**

```bash
git add website/src/components/sections/Compare.tsx website/src/app/page.tsx
git commit -m "feat(website): Compare section (JS/TS/SJS side-by-side)"
```

---

### Task 12: Quickstart section

**Files:**
- Create: `website/src/components/sections/Quickstart.tsx`

- [ ] **Step 1: Create Quickstart**

```tsx
// website/src/components/sections/Quickstart.tsx
import { highlight } from '@/lib/shiki'
import { Button } from '@/components/ui/Button'

const INSTALL = `npm install -g superjs`

const FIRST_PROGRAM = `// hello.sjs
type Greeting = Formal(string) | Casual(string)

function greet(g: Greeting): string {
  return match g {
    Formal(name) => "Good day, " + name + ".",
    Casual(name) => "Hey " + name + "!"
  }
}

console.log(greet(Formal("World")))  // Good day, World.
console.log(greet(Casual("friend"))) // Hey friend!`

const COMPILE = `sjs compile hello.sjs --out hello.js
node hello.js`

export async function Quickstart() {
  const [installHtml, programHtml, compileHtml] = await Promise.all([
    highlight(INSTALL, 'bash'),
    highlight(FIRST_PROGRAM, 'typescript'),
    highlight(COMPILE, 'bash'),
  ])

  return (
    <section className="py-24 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-3">Quickstart</p>
        <h2 className="text-4xl font-bold text-white">From zero to type-safe in 60 seconds</h2>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">1</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Install the compiler</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117]"
              dangerouslySetInnerHTML={{ __html: installHtml }} />
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">2</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Write your first program</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117] [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: programHtml }} />
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm font-bold flex-shrink-0">3</div>
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-2">Compile and run</p>
            <div className="rounded-lg overflow-hidden [&_pre]:p-4 [&_pre]:!bg-[#0d1117]"
              dangerouslySetInnerHTML={{ __html: compileHtml }} />
          </div>
        </div>
      </div>

      <div className="mt-10 flex gap-3 justify-center">
        <Button href="/docs">Read the Docs →</Button>
        <Button href="/playground" variant="ghost">Try in Browser</Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add to page.tsx after Compare**

- [ ] **Step 3: Commit**

```bash
git add website/src/components/sections/Quickstart.tsx website/src/app/page.tsx
git commit -m "feat(website): Quickstart section (3-step install guide)"
```

---

### Task 13: Ecosystem + CTA sections

**Files:**
- Create: `website/src/components/sections/Ecosystem.tsx`
- Create: `website/src/components/sections/CallToAction.tsx`

- [ ] **Step 1: Create Ecosystem**

```tsx
// website/src/components/sections/Ecosystem.tsx
const TOOLS = [
  { name: 'VS Code Extension', icon: '🎨' },
  { name: 'CLI Compiler',       icon: '⚙️' },
  { name: 'Type Checker',       icon: '🛡️' },
  { name: 'Linter',             icon: '🔍' },
  { name: 'Formatter',          icon: '✨' },
  { name: 'Node.js',            icon: '🟢' },
  { name: 'Browser',            icon: '🌐' },
  { name: 'Bun',                icon: '🥟' },
  { name: 'React',              icon: '⚛️' },
  { name: 'JSX / TSX',          icon: '📦' },
]

export function Ecosystem() {
  return (
    <section className="py-20 overflow-hidden border-y border-white/5">
      <div className="text-center mb-10">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-2">Ecosystem</p>
        <h2 className="text-3xl font-bold text-white">Works everywhere JavaScript does</h2>
      </div>
      {/* Marquee — duplicated for seamless loop */}
      <div className="flex gap-6 animate-[marquee_25s_linear_infinite] whitespace-nowrap">
        {[...TOOLS, ...TOOLS].map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/5 bg-white/[0.02] text-white/60 text-sm flex-shrink-0"
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

Add marquee keyframe to `globals.css`:
```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

- [ ] **Step 2: Create CallToAction**

```tsx
// website/src/components/sections/CallToAction.tsx
import { Button } from '@/components/ui/Button'

export function CallToAction() {
  return (
    <section className="py-32 px-4 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full" />
      </div>
      <div className="relative z-10">
        <p className="text-orange-400 text-sm uppercase tracking-widest mb-4">Get Started</p>
        <h2 className="text-5xl font-black text-white mb-4">
          Start writing{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            Super.js
          </span>{' '}
          today.
        </h2>
        <p className="text-white/50 mb-10 max-w-md mx-auto">
          Type-safe by default. Zero configuration. Compiles to plain JavaScript.
        </p>
        <div className="flex gap-3 justify-center">
          <Button href="/docs" size="md">Read the Docs →</Button>
          <Button
            href="https://github.com/hbarve1/super-js"
            variant="ghost"
            size="md"
          >
            View on GitHub
          </Button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add both to page.tsx**

```tsx
import { Ecosystem } from '@/components/sections/Ecosystem'
import { CallToAction } from '@/components/sections/CallToAction'
// after Quickstart:
<Ecosystem />
<CallToAction />
```

- [ ] **Step 4: Verify full page**

```bash
npm run dev
```

Expected: all sections render top-to-bottom, no TypeScript errors, marquee animates.

- [ ] **Step 5: Commit**

```bash
git add website/src/components/sections/ website/src/app/page.tsx website/src/app/globals.css
git commit -m "feat(website): Ecosystem marquee + CTA section — landing page complete"
```

---

## Done Signal

- Full scroll-driven hero: JS→TS→SJS characters animate through scroll, final headline and CTA appear
- All 6 sections render: Features, Compare, Quickstart, (Playground placeholder), Ecosystem, CTA
- `npm run build` passes with 0 TypeScript errors
- No hydration warnings in browser console
