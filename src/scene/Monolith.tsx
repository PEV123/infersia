import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, scrollState } from '../lib/scrollState'

const SLABS = 12
const SLAB_H = 0.235
const GAP = 0.042
export const TOTAL_H = SLABS * SLAB_H + (SLABS - 1) * GAP

const BEACON_H = 5.4

const beaconVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const beaconFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float a = pow(1.0 - vUv.y, 2.6) * uOpacity;
    gl_FragColor = vec4(vec3(1.35, 1.0, 0.5), a);
  }
`

function ease(t: number) {
  return t * t * (3 - 2 * t)
}

export function Monolith() {
  const group = useRef<THREE.Group>(null)
  const slabRefs = useRef<(THREE.Mesh | null)[]>([])
  const coreMat = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const beaconMat = useRef<THREE.ShaderMaterial>(null)

  const slabMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#10161d',
        metalness: 0.85,
        roughness: 0.32,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25,
        envMapIntensity: 1.0,
      }),
    []
  )

  const slabs = useMemo(
    () =>
      Array.from({ length: SLABS }, (_, i) => ({
        y: i * (SLAB_H + GAP) + SLAB_H / 2,
        w: 1.06 - i * 0.01,
        d: 0.72 - i * 0.006,
      })),
    []
  )

  const beaconUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const intro = scrollState.intro
    const morph = scrollState.morph
    const prm = scrollState.reducedMotion

    if (group.current) {
      group.current.rotation.y = (prm ? 0.35 : t * 0.04) + scrollState.p * 2.0 + ease(intro) * 0.35
    }

    for (let i = 0; i < SLABS; i++) {
      const mesh = slabRefs.current[i]
      if (!mesh) continue
      const si = ease(clamp01(intro * 1.7 - i * 0.055))
      const rest = slabs[i].y
      const from = rest + 2.4 + i * 0.3
      const hover = prm ? 0 : Math.sin(t * 0.5 + i * 0.7) * 0.012
      mesh.position.y = from + (rest - from) * si + hover
    }

    const pulse = prm ? 1 : 0.85 + 0.15 * Math.sin(t * 0.85)
    const power = intro * intro * (1 + morph * 0.9)
    if (coreMat.current) coreMat.current.emissiveIntensity = 1.7 * pulse * power
    if (light.current) light.current.intensity = 7 * pulse * power
    if (beaconMat.current) beaconMat.current.uniforms.uOpacity.value = (0.012 + morph * 0.1) * pulse * intro
  })

  return (
    <group ref={group}>
      {slabs.map((s, i) => (
        <RoundedBox
          key={i}
          ref={(m: THREE.Mesh) => {
            slabRefs.current[i] = m
          }}
          args={[s.w, SLAB_H, s.d]}
          radius={0.018}
          smoothness={3}
          material={slabMat}
          position={[0, s.y, 0]}
        />
      ))}
      <mesh position={[0, TOTAL_H / 2, 0]}>
        <boxGeometry args={[0.5, TOTAL_H * 0.99, 0.34]} />
        <meshStandardMaterial ref={coreMat} color="#050403" emissive="#f0b449" emissiveIntensity={0} roughness={1} />
      </mesh>
      <pointLight ref={light} color="#e8a93e" position={[0, TOTAL_H * 0.55, 0]} intensity={0} distance={10} decay={2} />
      <mesh position={[0, TOTAL_H + BEACON_H / 2 - 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.07, BEACON_H, 20, 1, true]} />
        <shaderMaterial
          ref={beaconMat}
          vertexShader={beaconVertex}
          fragmentShader={beaconFragment}
          uniforms={beaconUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
