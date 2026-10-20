import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark.tsx'
import { useDocumentTheme, useScrollOnNavigate } from '../../hooks/useDocumentTheme.ts'
import { DEFAULT_BRANDING } from '../../lib/theme.ts'

/** Together, the product provider. Organization fundraising content lives on each organization's own site. */
export function PlatformLayout() {
  const { pathname, hash } = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const open = menuPath === pathname + hash
  useDocumentTheme(DEFAULT_BRANDING)
  useScrollOnNavigate(pathname, hash)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuPath(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="app-shell pro org-frame platform">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="oh-header platform-header">
        <div className="oh-header-inner">
          <Link to="/" className="oh-brand" aria-label="Together home">
            <BrandMark size={34} />
            <span className="oh-brand-text">
              <strong>Together</strong>
              <em>Fundraising websites for communities</em>
            </span>
          </Link>
          <button
            type="button"
            className="oh-menu-toggle"
            aria-expanded={open}
            aria-controls="platform-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuPath(open ? null : pathname + hash)}
          >
            {open ? 'Close' : 'Menu'}
          </button>
          <nav id="platform-nav" className={open ? 'oh-nav open' : 'oh-nav'} aria-label="Together">
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#examples">Examples</Link>
            <NavLink to="/plans">Demo plans</NavLink>
            <NavLink to="/workspace" className="btn btn-outline btn-sm" end>
              Open demo workspace
            </NavLink>
            <NavLink to="/plans" className="btn btn-primary btn-sm" end>
              Create your organization website
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="oh-footer">
        <div className="oh-footer-inner">
          <div className="oh-footer-brand">
            <BrandMark size={36} />
            <div>
              <strong>Together</strong>
              <p>A browser-only prototype. Plans are demos, no payment is collected, and websites you create exist only in this browser.</p>
            </div>
          </div>
          <div className="oh-footer-side">
            <nav aria-label="Footer">
              <Link to="/#features">Features</Link>
              <Link to="/#examples">Examples</Link>
              <Link to="/plans">Demo plans</Link>
              <Link to="/start">Continue a setup</Link>
              <Link to="/workspace">Demo workspace</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
