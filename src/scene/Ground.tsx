import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scrollState } from '../lib/scrollState'

const vertexShader = /* glsl */ `
  varying vec3 vW;
  void main() {
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform vec3 uBase;
  uniform vec3 uLine;
  uniform vec3 uPool;
  varying vec3 vW;

  void main() {
    vec2 gv = vW.xz * 0.5;
    vec2 fw = fwidth(gv);
    vec2 g = abs(fract(gv) - 0.5) / fw;
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    // kill the uniform wash where derivatives degenerate (grazing angles / distance)
    line *= 1.0 - smoothstep(0.12, 0.38, max(fw.x, fw.y));
    float d = length(vW.xz);
    float fade = 1.0 - smoothstep(5.0, 26.0, d);
    float shimmer = 0.72 + 0.28 * sin(vW.x * 0.35 - uTime * 0.45) * sin(vW.z * 0.3 + uTime * 0.3);
    vec3 col = uBase + uLine * line * 0.16 * fade * shimmer;
    float pool = exp(-d * d * 0.3) * uGlow;
    col += uPool * pool * 0.35;
    // broad, faint wash so the mapped territory feels lit from beneath
    col += uPool * exp(-d * d * 0.045) * uGlow * 0.035;
    gl_FragColor = vec4(col, 1.0);
  }
`

// Colors passed as THREE.Color uniforms so they land in the renderer's linear
// working space and tone-map identically to the scene background.
export function Ground() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uBase: { value: new THREE.Color('#0a0e12') },
      uLine: { value: new THREE.Color('#5b7a8c') },
      uPool: { value: new THREE.Color('#d99a42') },
    }),
    []
  )
  const mat = useRef<THREE.ShaderMaterial>(null)

  useFrame((state) => {
    const t = scrollState.reducedMotion ? 20 : state.clock.elapsedTime
    const pulse = scrollState.reducedMotion ? 1 : 0.82 + 0.18 * Math.sin(t * 0.85)
    const u = mat.current?.uniforms
    if (u) {
      u.uTime.value = t
      u.uGlow.value = scrollState.intro * pulse * (0.4 + scrollState.morph * 0.32)
    }
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <shaderMaterial ref={mat} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  )
}
