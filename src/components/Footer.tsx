import { Link } from 'react-router-dom'
import { Mark } from './Mark'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p className="footer-brand">
          <Mark size={14} />
          <span className="mono">INFERSIA</span>
        </p>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/hosting">Models</Link>
          <Link to="/compute">Compute</Link>
          <Link to="/quote">Pricing</Link>
          <Link to="/#capabilities">Capabilities</Link>
          <Link to="/#sovereignty-wrap">Sovereignty</Link>
          <Link to="/news">News</Link>
          <Link to="/#contact">Contact</Link>
        </nav>
        <p className="footer-note">© 2026 Infersia Pty Ltd — built and operated on Australian soil.</p>
      </div>
    </footer>
  )
}
