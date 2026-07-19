# Infersia

Immersive 3D marketing site for Infersia — sovereign AI compute infrastructure, Australia.

Dark, cinematic site: a slab-stack monolith with a molten gold core stands on a grid terrain;
as you scroll, the camera rises to an aerial view and the Australian coastline etches itself
in gold around the tower — the "jurisdiction line". A routed News section carries articles.

## Stack

- **Vite + React 19 + TypeScript + React Router**
- **React Three Fiber + drei** — WebGL scene (monolith, boundary trace, procedural env lighting)
- **@react-three/postprocessing** — bloom + vignette
- **GSAP ScrollTrigger + Lenis** — smooth scroll, scroll-driven camera and reveals
- **Fonts** (self-hosted via Fontsource): Inter Variable, Instrument Serif (italic accents), IBM Plex Mono

## Run

```bash
npm install
npm run dev        # http://localhost:5180  (https://infersia.test once added to the hub manifest)
npm run build      # type-checks then bundles to dist/
```

## Deploy

Live at **https://infersia.onrender.com** — Render static site `infersia`
(`srv-d9e3t8v41pts73e6mrmg`, Mediapedia workspace), auto-deploying from
`main` on [PEV123/infersia](https://github.com/PEV123/infersia).
Build: `npm ci && npm run build` → publish `dist/`, `NODE_VERSION=22`,
SPA rewrite `/* → /index.html` (so `/compute` and `/news/...` load directly).
To ship: commit to `main` and push.

## Structure

- `src/pages/` — routes: `HomePage` (the 3D single-page experience), `ComputePage` (`/compute` —
  badged GPU platform catalogue in two tiers with workload filters and a mailto enquiry form),
  `NewsIndex` (`/news`), `ArticlePage` (`/news/:slug`).
- `src/news/articles.tsx` — article registry; each entry carries metadata plus its body as JSX.
- `src/scene/` — the WebGL layer. `CameraRig` owns the scroll-keyed camera path and the shared
  damped morph value; `Boundary` traces the coastline via Line2 `instanceCount`; `Ground` is a
  shader grid with the gold pool; `Env` is a fully procedural Lightformer environment (no
  network HDRIs).
- `src/components/` — DOM sections (hero, manifesto, capabilities, sectors, sovereignty,
  closing) plus shared `Nav`/`Footer` (router-aware; `/#hash` links smooth-scroll on home).
- `src/lib/scrollState.ts` — mutable scroll/progress state bridging ScrollTrigger → R3F frame loop.
- `src/lib/useSiteMotion.ts` — Lenis + ScrollTrigger wiring, reveals, intro, reduced-motion paths.
  Cleans up fully on unmount (route changes); the intro ceremony only plays in full once.
- `src/lib/rafShim.ts` — dev-only: keeps rAF ticking in hidden preview tabs (worker-driven timer).

Note: it's an SPA — production hosting needs a rewrite of all paths to `index.html`.

## Gotchas learned the hard way

- **R3F v9 merges the `uniforms` prop into the material's own uniforms object.** Never mutate the
  object you passed as a prop — grab the material ref and write `ref.current.uniforms.x.value`.
- **Guard point sprites near the camera plane**: `7.0 / -mv.z` explodes to ±Inf when a drifting
  particle crosses the plane, which can corrupt the whole render pass on Metal. Clamp the depth
  (`max(-mv.z, 0.6)`), cap `gl_PointSize`, and fade near points.
- Editing shader strings requires a full page reload — HMR swaps the strings without recompiling
  the program.
- Reduced motion: no Lenis, no reveals/tweens, static-ish camera; CSS kills glyph/grain loops.
