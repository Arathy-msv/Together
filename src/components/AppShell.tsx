import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon, LeafMark } from './illustrations.tsx'

export function AppShell() {
  const { pathname } = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const open = menuPath === pathname

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label="Together home">
          <LeafMark />
          <span>Together</span>
        </NavLink>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setMenuPath(open ? null : pathname)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="site-nav" className={open ? 'site-nav open' : 'site-nav'}>
          <NavLink to="/explore">Explore campaigns</NavLink>
          <NavLink to="/dashboard">My demo campaigns</NavLink>
          <span className="demo-pill">
            <Icon name="spark" size={14} />
            Demo only
          </span>
          <NavLink to="/create?new=1" className="btn btn-primary header-cta">
            + Create a Campaign
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <LeafMark size={22} />
          <div>
            <strong>Together</strong>
            <p>A kinder, brighter community — together.</p>
          </div>
        </div>
        <p className="footer-note">Browser-only demo · No real money collected · All campaign data is simulated</p>
      </footer>
    </div>
  )
}
