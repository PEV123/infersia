import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { CameraRig } from './CameraRig'
import { Env } from './Env'
import { Ground } from './Ground'
import { Monolith } from './Monolith'
import { Boundary } from './Boundary'

export type Quality = { mobile: boolean; reduced: boolean }

export function Scene({ quality }: { quality: Quality }) {
  return (
    <Canvas
      dpr={quality.mobile ? [1, 1.5] : [1, 2]}
      camera={{ fov: 40, near: 0.1, far: 90, position: [0, 1.35, 7.4] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0a0e12']} />
      <fogExp2 attach="fog" args={['#0a0e12', 0.045]} />
      <CameraRig />
      <Env />
      <Monolith />
      <Boundary />
      <Ground />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.7} luminanceSmoothing={0.85} radius={0.7} />
        <Vignette offset={0.28} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  )
}
