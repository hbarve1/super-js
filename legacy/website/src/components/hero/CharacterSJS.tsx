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

  const opacity = Math.max(0, (progress - 0.5) / 0.15)
  const burstScale = opacity < 1 ? 0.5 + opacity * 1.5 : 1 + Math.sin(opacity * Math.PI) * 0.1
  const scale = (0.5 + progress * 0.4) * burstScale

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += 0.008
    meshRef.current.rotation.x += 0.003
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01
    }
  })

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={0.5}
          transparent
          opacity={opacity}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      <mesh scale={1.01}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={opacity * 0.3} wireframe />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.01, 8, 64]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={opacity * 0.6} />
      </mesh>
      <pointLight color="#f97316" intensity={opacity * 4} distance={5} />
      <pointLight color="#fbbf24" intensity={opacity * 2} distance={8} position={[0, 1, 0]} />
    </group>
  )
}
