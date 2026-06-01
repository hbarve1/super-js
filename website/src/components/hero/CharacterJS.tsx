'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  progress: number
  position: [number, number, number]
}

export function CharacterJS({ progress, position }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.PointLight>(null!)

  const visible = progress < 0.5
  const opacity = visible ? Math.min(1, progress < 0.4 ? 1 : (0.5 - progress) / 0.1) : 0
  const scale = 0.4 + progress * 0.2

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.05
    meshRef.current.rotation.y += 0.005
  })

  return (
    <group position={position} scale={scale}>
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
      <mesh position={[0, 0, 0.41]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshBasicMaterial color="#1a1a1a" transparent opacity={opacity * 0.9} />
      </mesh>
      <pointLight
        ref={glowRef}
        color="#f7df1e"
        intensity={opacity * 2}
        distance={3}
      />
    </group>
  )
}
