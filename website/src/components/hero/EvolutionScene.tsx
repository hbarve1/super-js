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
