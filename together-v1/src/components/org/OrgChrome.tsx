import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { can } from '../../lib/permissions.ts'
import { publicOffers } from '../../lib/vouchers.ts'
import { orgInitials } from '../../lib/organizations.ts'
import type { Organization } from '../../lib/types.ts'
import { BrandMark } from '../BrandMark.tsx'
import { DemoToolsMenu } from '../identity/DemoToolsMenu.tsx'

export function OrgLogoMark({ org, size = 36 }: { org: Pick<Organization, 'name' | 'logo'>; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = org.logo && failed !== org.logo
  return (
    <span className={showImage ? 'org-mark has-image' : 'org-mark'} style={{ width: size, height: size }} aria-hidden="true">
      {showImage ? (
        <img className="keep-image" src={org.logo} alt="" onError={() => setFailed(org.logo)} />
      ) : (
        <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>{orgInitials(org.name)}</span>
      )}
    </span>
  )
}

export function PoweredBy() {
  return (
    <span className="powered-by">
      <BrandMark size={16} />
      Powered by Together
    </span>
  )
}

function OrgBrandLink({ org, base }: { org: Organization; base: string }) {
  return (
    <Link to={base} className="oh-brand" aria-label={`${org.name} home`}>
      <OrgLogoMark org={org} size={36} />
      <span className="oh-brand-text">
        <strong>{org.name}</strong>
        {org.tagline ? <em>{org.tagline}</em> : null}
      </span>
    </Link>
  )
}

export function OrgHeader({ org, base, workspace }: { org: Organization; base: string; workspace?: string }) {
  const { pathname } = useLocation()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const open = menuPath === pathname
  const vouchers = useVoucherStore()
  const demo = useDemoStore()
  const hasOffers = publicOffers(org, vouchers, demo).length > 0
  const user = useCurrentUser()
  const canCreate = Boolean(workspace) && can(user, 'campaign.create', { organizationId: org.id })
  const canOpenWorkspace = Boolean(workspace) && can(user, 'workspace.view', { organizationId: org.id })

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuPath(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="oh-header">
      <div className="oh-header-inner">
        <OrgBrandLink org={org} base={base} />
        <button
          type="button"
          className="oh-menu-toggle"
          aria-expanded={open}
          aria-controls="org-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuPath(open ? null : pathname)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="org-nav" className={open ? 'oh-nav open' : 'oh-nav'} aria-label="Primary">
          <NavLink to={`${base}/campaigns`}>Campaigns</NavLink>
          {hasOffers ? <NavLink to={`${base}/offers`}>Partner offers</NavLink> : null}
        </nav>
        <div className="oh-header-tools">
          {canCreate ? (
            <Link to={`${base}/create`} className="btn btn-primary btn-sm">
              Create a campaign
            </Link>
          ) : canOpenWorkspace ? (
            <Link to={`${workspace}/overview`} className="btn btn-outline btn-sm">
              Open workspace
            </Link>
          ) : null}
          <DemoToolsMenu compact />
        </div>
      </div>
    </header>
  )
}

/** Static header for the settings preview: same look, no navigation. */
export function OrgHeaderPreview({ org }: { org: Organization }) {
  return (
    <header className="oh-header">
      <div className="oh-header-inner">
        <span className="oh-brand">
          <OrgLogoMark org={org} size={36} />
          <span className="oh-brand-text">
            <strong>{org.name || 'Organization name'}</strong>
            {org.tagline ? <em>{org.tagline}</em> : null}
          </span>
        </span>
        <span className="oh-menu-toggle preview-only" aria-hidden="true">
          Menu
        </span>
        <nav className="oh-nav" aria-label="Preview navigation">
          <span className="oh-nav-item">Campaigns</span>
        </nav>
      </div>
    </header>
  )
}

export function OrgFooter({ org, workspace, preview = false }: { org: Organization; base?: string; workspace?: string; preview?: boolean }) {
  const { content } = org
  const user = useCurrentUser()
  const canManage = Boolean(workspace) && can(user, 'workspace.view', { organizationId: org.id })
  const links = [
    ...(content.website ? [{ label: 'Website', url: content.website }] : []),
    ...content.socialLinks.filter((link) => link.label.trim() && link.url.trim()),
  ]
  const blurb = content.footerText || 'Browser-only demo.'
  return (
    <footer className="oh-footer">
      <div className="oh-footer-inner">
        <div className="oh-footer-brand">
          <OrgLogoMark org={org} size={22} />
          <strong>{org.name || 'Organization name'}</strong>
          <span className="oh-footer-blurb">{blurb}</span>
        </div>
        <div className="oh-footer-side">
          {links.length > 0 ? (
            <nav aria-label="Footer">
              {links.map((link) =>
                preview ? (
                  <span key={`${link.label}-${link.url}`}>{link.label}</span>
                ) : (
                  <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ),
              )}
            </nav>
          ) : null}
          {org.visibility.poweredBy ? (
            preview ? (
              <PoweredBy />
            ) : (
              <Link to="/" className="powered-link">
                <PoweredBy />
              </Link>
            )
          ) : null}
          {canManage && !preview ? (
            <Link to={`${workspace}/overview`} className="manage-link">
              Manage this website <span className="demo-badge small-badge">Demo</span>
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
