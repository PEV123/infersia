// Mutable, render-loop-friendly scroll state. GSAP ScrollTriggers write into it;
// the R3F frame loop reads (and damps) from it. No React re-renders involved.
export const scrollState = {
  p: 0, // global page progress 0..1
  intro: 0, // load-in choreography 0..1
  hero: 0,
  position: 0,
  capabilities: 0,
  sectors: 0,
  sovereignty: 0,
  contact: 0,
  morph: 0, // lattice -> continent, derived from sovereignty progress
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
}

export type TrackKey = { p: number; v: number[] }

// Piecewise keyframe track with smoothstep easing between keys.
export function sampleTrack(keys: TrackKey[], p: number, out: number[]): number[] {
  if (p <= keys[0].p) {
    for (let c = 0; c < out.length; c++) out[c] = keys[0].v[c]
    return out
  }
  const last = keys[keys.length - 1]
  if (p >= last.p) {
    for (let c = 0; c < out.length; c++) out[c] = last.v[c]
    return out
  }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p)
      const ts = t * t * (3 - 2 * t)
      for (let c = 0; c < out.length; c++) out[c] = a.v[c] + (b.v[c] - a.v[c]) * ts
      return out
    }
  }
  return out
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
