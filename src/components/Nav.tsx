import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mark } from './Mark'

const LINKS: { to: string; label: string; match: (p: string) => boolean }[] = [
  { to: '/hosting', label: 'Models', match: (p) => p.startsWith('/hosting') },
  { to: '/compute', label: 'Compute', match: (p) => p === '/compute' },
  { to: '/quote', label: 'Pricing', match: (p) => p === '/quote' },
  { to: '/#sovereignty-wrap', label: 'Sovereignty', match: () => false },
  { to: '/news', label: 'News', match: (p) => p.startsWith('/news') },
  { to: '/#contact', label: 'Contact', match: () => false },
]

export function Nav() {
  const { pathname } = useLocation()
  const offHome = pathname !== '/'
  const [open, setOpen] = useState(false)

  // close the drawer on route change and lock body scroll while open
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header id="site-nav" className={offHome ? 'nav scrolled' : 'nav'}>
      <Link className="nav-brand" to="/" aria-label="Infersia — home">
        <Mark />
        <span className="nav-word">INFERSIA</span>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} aria-current={l.match(pathname) ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      <Link className="btn btn-outline nav-cta" to="/#contact">
        Request access
      </Link>

      <button
        type="button"
        className={open ? 'nav-burger open' : 'nav-burger'}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={open ? 'nav-drawer open' : 'nav-drawer'} aria-hidden={!open}>
        <nav className="nav-drawer-links" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={l.match(pathname) ? 'active' : undefined}>
              {l.label}
            </Link>
          ))}
          <Link className="btn btn-gold nav-drawer-cta" to="/#contact">
            Request access
          </Link>
        </nav>
      </div>
    </header>
  )
}
