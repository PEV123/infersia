import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { sampleTrack, scrollState, smoothstep, type TrackKey } from '../lib/scrollState'

// Camera choreography across the whole page, keyed on global scroll progress.
const POS_TRACK: TrackKey[] = [
  { p: 0.0, v: [0, 1.75, 9.8] },
  { p: 0.13, v: [2.1, 2.2, 9.0] },
  { p: 0.34, v: [-2.8, 2.5, 9.6] },
  { p: 0.5, v: [-1.7, 3.5, 10.2] },
  { p: 0.66, v: [0, 9.6, 9.8] },
  { p: 0.88, v: [0, 11.8, 7.2] },
  { p: 1.0, v: [0, 3.0, 12.9] },
]

const LOOK_TRACK: TrackKey[] = [
  { p: 0.0, v: [0, 1.95, 0] },
  { p: 0.13, v: [-0.3, 1.95, 0] },
  { p: 0.34, v: [0.4, 1.9, 0] },
  { p: 0.5, v: [0.2, 1.45, 0] },
  { p: 0.66, v: [0, 0.2, -0.9] },
  { p: 0.88, v: [0, 0.0, -1.2] },
  { p: 1.0, v: [0, 1.95, 0] },
]

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const mem = useMemo(
    () => ({
      pos: new THREE.Vector3(0, 1.35, 9.8),
      look: new THREE.Vector3(0, 1.75, 0),
      tp: [0, 0, 0],
      tl: [0, 0, 0],
    }),
    []
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const p = scrollState.p
    const prm = scrollState.reducedMotion

    // this rig owns the shared damped morph value
    const morphTarget = smoothstep(0.06, 0.62, scrollState.sovereignty)
    scrollState.morph = THREE.MathUtils.damp(scrollState.morph, morphTarget, prm ? 30 : 2.2, delta)

    sampleTrack(POS_TRACK, p, mem.tp)
    sampleTrack(LOOK_TRACK, p, mem.tl)

    const px = prm ? 0 : scrollState.pointerX
    const py = prm ? 0 : scrollState.pointerY
    const idle = prm ? 0 : 1
    const introEase = scrollState.intro
    const dollyOut = (1 - introEase * introEase) * 2.6

    const tx = mem.tp[0] + px * 0.45 + Math.sin(t * 0.07) * 0.1 * idle
    const ty = mem.tp[1] - py * 0.28 + Math.sin(t * 0.09 + 2) * 0.06 * idle
    const tz = mem.tp[2] + dollyOut

    const lam = prm ? 30 : 2.6
    mem.pos.x = THREE.MathUtils.damp(mem.pos.x, tx, lam, delta)
    mem.pos.y = THREE.MathUtils.damp(mem.pos.y, ty, lam, delta)
    mem.pos.z = THREE.MathUtils.damp(mem.pos.z, tz, lam, delta)
    mem.look.x = THREE.MathUtils.damp(mem.look.x, mem.tl[0] + px * 0.18, lam, delta)
    mem.look.y = THREE.MathUtils.damp(mem.look.y, mem.tl[1] - py * 0.1, lam, delta)
    mem.look.z = THREE.MathUtils.damp(mem.look.z, mem.tl[2], lam, delta)

    camera.position.copy(mem.pos)
    camera.lookAt(mem.look)
  })

  return null
}
