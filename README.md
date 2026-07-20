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

Live at **https://infersia.onrender.com** — Render **web service** `infersia`
(`srv-d9elv55aeets73bfcri0`, Mediapedia workspace, Singapore region, starter plan),
auto-deploying from `main` on [PEV123/infersia](https://github.com/PEV123/infersia).
Build `npm ci && npm run build`, start `npm start` (Express serves `dist/` + the API).
A 1GB persistent disk is mounted at `/data` for analytics, leads, bookings and
calendar settings. Env: `NODE_VERSION=22`, `DATA_DIR=/data`, `ADMIN_PASSWORD`
(rotate in the Render dashboard). To ship: commit to `main` and push.

## Quote builder, analytics & admin

- **`/quote`** — the Sovereign Quote Builder. Model registry in
  [src/data/models.json](src/data/models.json) and tiers/API prices in
  [src/data/pricing.json](src/data/pricing.json) — both plain JSON, editable in
  GitHub; a push auto-deploys. Flip Kimi K3's `"badge"` to `"available"`,
  `"quotable": true` and set its `priceLine` the day weights ship (due 27 July).
  **Review cadence: model registry and API list prices monthly** — bump
  `verifiedDate` in pricing.json (rendered in the page footer).
- **Developer logos**: rendered as neutral text wordmark chips by design. If you
  later source official brand assets per each developer's brand guidelines, add a
  `logo` field and swap the chip — never scrape or invent marks.
- **Analytics** — the quote page posts first-party events (`model_selected`,
  `usage_changed`, `comparator_changed`, `quote_viewed` incl. computed saving,
  `quote_submitted`) to `POST /api/track`. No cookies, no PII; a per-tab session
  id groups events. Stored as NDJSON on the disk.
- **Leads** — "Lock this quote" posts to `POST /api/quote-lead` with the full
  quote context (model, tier, usage, term, comparator, figures). Leads dedupe by
  email and accumulate context.
- **`/book`** — public call booking. Slots are generated server-side from the
  availability settings (timezone-correct, minus existing bookings, with buffer,
  minimum notice and horizon), rendered in the visitor's timezone. A booking
  creates/links a lead automatically and rejects just-taken slots (409).
- **`/admin`** — password-gated CRM (`ADMIN_PASSWORD` env; `x-admin-key` header),
  four tabs: **Dashboard** (usage intelligence: models picked, comparators, usage
  levels, terms, event feed) · **Leads** (pipeline new → contacted → qualified →
  quoted → won/lost, notes timeline, quote context, linked calls, manual add) ·
  **Calendar** (month grid, per-day bookings with complete/cancel, manual
  bookings, next-up rail) · **Availability** (timezone, call length, buffer,
  minimum notice, horizon, weekly windows, blackout dates). Not linked anywhere;
  `robots.txt` disallows it. Data lives in plain JSON on the disk — no external
  CRM required.

Local dev: `npm run dev` (Vite, port 5180) + `npm run dev:api` (Express on 8790;
Vite proxies `/api`). Set `ADMIN_PASSWORD` locally to use the admin page.

## Calendar sync (Google)

Two layers, both optional:

1. **ICS feed (zero setup)** — `/api/calendar.ics?key=$CALENDAR_FEED_KEY` serves all
   bookings + availability blocks. The exact URL is shown in Admin → Availability →
   Calendar sync; add it in Google Calendar via *Other calendars → + → From URL*.
   Google refreshes subscribed feeds every few hours.
2. **Google Calendar API (instant, with Meet links + customer invites)** — one-time
   setup (~8 min):
   1. console.cloud.google.com → create/select a project → *APIs & Services →
      Library* → enable **Google Calendar API**.
   2. *OAuth consent screen*: External, app name "Infersia Admin", add your Google
      account as a test user (Testing publishing status is fine for personal use).
   3. *Credentials → Create credentials → OAuth client ID → Web application*;
      authorised redirect URI exactly: `https://www.infersia.com.au/api/google/callback`
   4. Put the client ID/secret in Render env as `GOOGLE_CLIENT_ID` and
      `GOOGLE_CLIENT_SECRET` (service redeploys automatically).
   5. Admin → Availability → Calendar sync → **Connect Google Calendar** → approve.

   Once connected: every confirmed booking creates a Calendar event with a Google
   Meet link, the customer receives a calendar invite by email (`sendUpdates=all`),
   the Meet link shows on the public confirmation screen and in the admin calendar,
   and cancelling a booking removes the event. The refresh token lives in
   `google.json` on the persistent disk; Disconnect revokes it.

## SEO

- **Server-injected meta**: Express replaces the `<!--%SEO%-->` marker in the built
  shell with per-route title/description/canonical/OG/JSON-LD (see
  [server/seo.mjs](server/seo.mjs)); shared content lives in
  [src/seo/shared.mjs](src/seo/shared.mjs) and is reused client-side by
  `usePageMeta` so SPA navigation stays in sync. `/sitemap.xml` is generated from
  the same registry; `robots.txt` advertises it; `infersia.onrender.com` and the
  bare apex 301 to `https://www.infersia.com.au`; `/admin` is noindex.
- **/hosting** pillar ("Australian hosted LLM") + **/hosting/:modelId** pages
  ("Australia hosted Qwen/GLM/Kimi…") are generated from
  [src/data/models.json](src/data/models.json) — adding a model there creates its
  hosting page, sitemap entry, Service/FAQ schema and quote-calculator entry in
  one edit.
- **Traffic analytics**: every page view posts a first-party `page_view` event
  (path + referrer hostname, no cookies/PII); the admin Dashboard shows daily
  views, pages and referrers alongside the quote-intelligence panels.
- After each deploy touching routes: resubmit `/sitemap.xml` in Google Search
  Console (one-time setup: verify the domain property, submit the sitemap).
- Keyword strategy, competitor SERP map and the 90-day plan live in
  `SEO-REPORT-AU-AI-HOSTING.md` (local only, not committed).

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
