import { Link, useLocation } from 'react-router-dom'
import { Mark } from './Mark'

export function Nav() {
  const { pathname } = useLocation()
  const offHome = pathname !== '/'
  return (
    <header id="site-nav" className={offHome ? 'nav scrolled' : 'nav'}>
      <Link className="nav-brand" to="/" aria-label="Infersia — home">
        <Mark />
        <span className="nav-word">INFERSIA</span>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        <Link to="/#capabilities">Capabilities</Link>
        <Link to="/compute" aria-current={pathname === '/compute' ? 'page' : undefined}>Compute</Link>
        <Link to="/#sovereignty-wrap">Sovereignty</Link>
        <Link to="/news" aria-current={pathname.startsWith('/news') ? 'page' : undefined}>News</Link>
        <Link to="/#contact">Contact</Link>
      </nav>
      <Link className="btn btn-outline nav-cta" to="/#contact">
        Request access
      </Link>
    </header>
  )
}
