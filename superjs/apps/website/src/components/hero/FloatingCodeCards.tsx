'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const CARDS = [
  { code: 'type Result<T,E> = Ok(T) | Err(E)', orbit: 1.4, speed: 0.3, yOffset: 0.2 },
  { code: 'match r { Ok(v) => v }', orbit: 1.1, speed: -0.25, yOffset: -0.3 },
  { code: 'const x: string? = null', orbit: 1.6, speed: 0.2, yOffset: 0.5 },
  { code: 'dynamic', orbit: 0.9, speed: -0.4, yOffset: -0.1 },
] as const

type Props = { readonly progress: number }

function CodeCard({
  code,
  orbit,
  speed,
  yOffset,
  progress,
}: {
  readonly code: string
  readonly orbit: number
  readonly speed: number
  readonly yOffset: number
  readonly progress: number
}) {
  const groupRef = useRef<THREE.Group>(null)
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
      <mesh>
        <planeGeometry args={[code.length * 0.055 + 0.2, 0.22]} />
        <meshBasicMaterial color="#0f1117" transparent opacity={opacity * 0.85} />
      </mesh>
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.07}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
        fillOpacity={opacity}
      >
        {code}
      </Text>
    </group>
  )
}

/** Orbiting SJS code snippets that fade in once the SJS character has formed (0.65+). */
export function FloatingCodeCards({ progress }: Props) {
  return (
    <group>
      {CARDS.map((card) => (
        <CodeCard key={card.code} {...card} progress={progress} />
      ))}
    </group>
  )
}
