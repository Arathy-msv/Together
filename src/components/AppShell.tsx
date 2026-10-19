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

  if (playing) {
    return (
      <div className="app-shell">
        <main>
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell pro">
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
            onClick={() => setMenuPath(open ? null : pathname)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="site-nav" className={open ? 'topnav open' : 'topnav'}>
            <NavLink to="/explore">Explore campaigns</NavLink>
            <Link to="/#how-it-works">How it works</Link>
            <NavLink to="/dashboard">My campaigns</NavLink>
            <NavLink to="/create?new=1" className="btn btn-primary btn-sm">
              Create campaign
            </NavLink>
            <span className="demo-tag" title="Browser-only demo. No real money is collected.">
              Demo
            </span>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="pro-footer">Browser-only demo. No real money collected.</footer>
    </div>
  )
}
