import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from './BrandMark.tsx'

export function AppShell() {
  const { pathname, hash } = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const open = menuPath === pathname
  const playing = pathname.includes('/play')

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuPath(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (playing) {
    return (
      <div className="app-shell">
        <main id="main">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell pro">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Together home">
            <BrandMark />
            <span>Together</span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuPath(open ? null : pathname)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="site-nav" className={open ? 'topnav open' : 'topnav'} aria-label="Primary">
            <NavLink to="/explore">Explore campaigns</NavLink>
            <NavLink to="/how-it-works">How it works</NavLink>
            <NavLink to="/dashboard">My campaigns</NavLink>
            <NavLink to="/create?new=1" className="btn btn-primary btn-sm">
              Create campaign
            </NavLink>
            <span className="demo-tag">Demo</span>
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="pro-footer">
        <div className="footer-inner">
          <p>
            <strong>Together</strong>
            <span>Browser-only demo. No real money is collected.</span>
          </p>
          <nav aria-label="Footer">
            <Link to="/explore">Explore</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/dashboard">My campaigns</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
