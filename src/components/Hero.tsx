import { Link } from 'react-router-dom'

export function Hero() {
  return (
    <section id="hero" className="hero">
      <div className="hero-inner">
        <p className="eyebrow hero-rise">Sovereign AI infrastructure · Australia</p>
        <h1 className="wordmark hero-rise">INFERSIA</h1>
        <p className="tagline hero-rise">
          Sovereign <em>intelligence.</em> Grounded in <em>Australia.</em>
        </p>
        <div className="hero-cta hero-rise">
          <Link className="btn btn-gold" to="/#contact">
            Request access
          </Link>
        </div>
      </div>
      <p className="hero-corner hero-corner-l mono" aria-hidden="true">
        Dedicated — Private — Onshore
      </p>
      <p className="hero-corner hero-corner-r mono" aria-hidden="true">
        <span className="scroll-cue">
          <span className="scroll-line" />
          Scroll
        </span>
      </p>
    </section>
  )
}
