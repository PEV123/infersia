import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Line2, LineMaterial } from 'three-stdlib'
import { CONTINENT_SCALE, outlinePoints } from '../lib/australia'
import { scrollState, smoothstep } from '../lib/scrollState'

// The jurisdiction line: the coastline traces itself as the continent resolves.
export function Boundary() {
  const mainRef = useRef<Line2>(null)
  const tasRef = useRef<Line2>(null)

  const { mainPts, tasPts } = useMemo(() => {
    const { mainland, tasmania } = outlinePoints(CONTINENT_SCALE)
    const toV3 = (pts: [number, number][]): [number, number, number][] => [
      ...pts.map(([x, z]) => [x, 0.1, z] as [number, number, number]),
      [pts[0][0], 0.1, pts[0][1]],
    ]
    return { mainPts: toV3(mainland), tasPts: toV3(tasmania) }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const morph = scrollState.morph
    const pulse = scrollState.reducedMotion ? 1 : 0.82 + 0.18 * Math.sin(t * 0.9)

    const mainReveal = smoothstep(0.35, 0.92, morph)
    if (mainRef.current) {
      const geo = mainRef.current.geometry
      geo.instanceCount = Math.max(0, Math.floor((mainPts.length - 1) * mainReveal))
      const mat = mainRef.current.material as LineMaterial
      mat.opacity = 0.95 * smoothstep(0.35, 0.55, morph) * pulse
    }

    const tasReveal = smoothstep(0.78, 1.0, morph)
    if (tasRef.current) {
      const geo = tasRef.current.geometry
      geo.instanceCount = Math.max(0, Math.floor((tasPts.length - 1) * tasReveal))
      const mat = tasRef.current.material as LineMaterial
      mat.opacity = 0.95 * smoothstep(0.78, 0.88, morph) * pulse
    }
  })

  return (
    <group>
      <Line ref={mainRef} points={mainPts} color="#e6b45a" lineWidth={1.6} transparent opacity={0} depthWrite={false} />
      <Line ref={tasRef} points={tasPts} color="#e6b45a" lineWidth={1.6} transparent opacity={0} depthWrite={false} />
    </group>
  )
}
