'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  readonly progress: number
  readonly position: [number, number, number]
}

/** TypeScript: a blue flat box that fades in 0.15→0.25 and out 0.45→0.55. */
export function CharacterTS({ progress, position }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)

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
