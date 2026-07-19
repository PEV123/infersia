import type { MouseEvent, ReactNode } from 'react'

function GlyphSlabs() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <rect x="12" y="7" width="20" height="8" rx="1" />
      <rect x="12" y="18" width="20" height="8" rx="1" />
      <rect x="12" y="29" width="20" height="8" rx="1" />
      <line className="g-seam s1" x1="12" y1="16.5" x2="32" y2="16.5" />
      <line className="g-seam s2" x1="12" y1="27.5" x2="32" y2="27.5" />
    </svg>
  )
}

function GlyphOrbit() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="14" strokeDasharray="3 4" />
      <circle className="g-fill" cx="22" cy="22" r="3.2" />
      <g className="g-orbit">
        <circle className="g-gold" cx="22" cy="8" r="2.2" />
      </g>
    </svg>
  )
}

function GlyphGrid() {
  const dots: ReactNode[] = []
  let k = 0
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const gold = r === 1 && c === 1
      dots.push(
        <circle
          key={k}
          className={gold ? 'g-dot g-gold' : 'g-dot'}
          style={{ animationDelay: `${k * 0.22}s` }}
          cx={12 + c * 10}
          cy={12 + r * 10}
          r="2.1"
        />
      )
      k++
    }
  }
  return <svg viewBox="0 0 44 44" aria-hidden="true">{dots}</svg>
}

function GlyphRadar() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <circle className="g-ring r1" cx="22" cy="22" r="6" />
      <circle className="g-ring r2" cx="22" cy="22" r="11" />
      <circle className="g-ring r3" cx="22" cy="22" r="16" />
      <circle className="g-fill g-gold" cx="22" cy="22" r="2" />
    </svg>
  )
}

const CAPS = [
  {
    n: '01',
    title: 'Sovereign Compute',
    body: 'Dedicated AI infrastructure that never leaves the country. Private capacity on Australian soil, reserved for you alone.',
    glyph: <GlyphSlabs />,
  },
  {
    n: '02',
    title: 'Private Endpoints',
    body: 'Run advanced models behind your own walls. Your prompts, your outputs, your data — training no one, visible to no one.',
    glyph: <GlyphOrbit />,
  },
  {
    n: '03',
    title: 'Managed Intelligence',
    body: 'AI operations for regulated environments — designed, deployed and governed to the standard your sector demands.',
    glyph: <GlyphGrid />,
  },
  {
    n: '04',
    title: 'National Scale',
    body: 'From a single dedicated deployment to a fleet across the continent. Capacity that grows without going offshore.',
    glyph: <GlyphRadar />,
  },
]

function sheen(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Capabilities() {
  return (
    <section id="capabilities" className="section">
      <div className="container">
        <p className="eyebrow" data-reveal>
          Capabilities
        </p>
        <h2 className="section-title" data-reveal>
          Capability, <em>held privately.</em>
        </h2>
        <div className="cards" data-reveal-group>
          {CAPS.map((c) => (
            <article className="card" key={c.n} onMouseMove={sheen}>
              <div className="card-top">
                <span className="card-n mono">{c.n}</span>
                <span className="card-glyph">{c.glyph}</span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
