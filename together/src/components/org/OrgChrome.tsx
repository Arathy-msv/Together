import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { hasActivity } from '../../lib/follows.ts'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser, useSupporterId } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { can } from '../../lib/permissions.ts'
import { canUseFeature } from '../../lib/features.ts'
import { holderVouchers, publicOffers } from '../../lib/vouchers.ts'
import { orgInitials } from '../../lib/organizations.ts'
import type { Organization } from '../../lib/types.ts'
import { BrandMark } from '../BrandMark.tsx'

export function OrgLogoMark({ org, size = 36 }: { org: Pick<Organization, 'name' | 'logo'>; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = org.logo && failed !== org.logo
  return (
    <span className={showImage ? 'org-mark has-image' : 'org-mark'} style={{ width: size, height: size }} aria-hidden="true">
      {showImage ? (
        <img src={org.logo} alt="" onError={() => setFailed(org.logo)} />
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
  const canCreate = can(user, 'campaign.create', { organizationId: org.id })
  const canManageSite = can(user, 'org.manageWebsite', { organizationId: org.id })
  const supporterId = useSupporterId()
  const showActivity = hasActivity(
    demo.campaigns.filter((item) => item.organizationId === org.id).map((item) => item.id),
    holderVouchers(vouchers, org.id, supporterId).length > 0,
    canUseFeature(org, 'supporterHistory'),
  )

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
          <NavLink to={base} end>
            Home
          </NavLink>
          <NavLink to={`${base}/campaigns`}>Campaigns</NavLink>
          <NavLink to={`${base}/about`}>About</NavLink>
          {hasOffers ? <NavLink to={`${base}/offers`}>Partner offers</NavLink> : null}
          {showActivity ? <NavLink to={`${base}/my-activity`}>My activity</NavLink> : null}
          {workspace && canCreate ? (
            <div className="oh-nav-organizer">
              <span className="oh-nav-organizer-label">
                Organizer tools <span className="demo-badge small-badge">Demo</span>
              </span>
              <Link to={`${workspace}/campaigns/new`} className="oh-nav-manage primary">
                Create a campaign
              </Link>
              <Link to={`${workspace}/campaigns`} className="oh-nav-manage">
                Manage campaigns
              </Link>
              {canManageSite ? (
                <Link to={`${workspace}/overview`} className="oh-nav-manage">
                  Manage this website
                </Link>
              ) : null}
            </div>
          ) : null}
        </nav>
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
          <span className="oh-nav-item">Home</span>
          <span className="oh-nav-item">Campaigns</span>
          <span className="oh-nav-item">About</span>
        </nav>
      </div>
    </header>
  )
}

export function OrgFooter({ org, base, workspace, preview = false }: { org: Organization; base: string; workspace?: string; preview?: boolean }) {
  const { content } = org
  const vouchers = useVoucherStore()
  const supporterId = useSupporterId()
  const user = useCurrentUser()
  const holdsVouchers = holderVouchers(vouchers, org.id, supporterId).length > 0
  const canManage = Boolean(workspace) && can(user, 'workspace.view', { organizationId: org.id })
  const links = [
    ...(content.website ? [{ label: 'Website', url: content.website }] : []),
    ...content.socialLinks.filter((link) => link.label.trim() && link.url.trim()),
  ]
  return (
    <footer className="oh-footer">
      <div className="oh-footer-inner">
        <div className="oh-footer-brand">
          <OrgLogoMark org={org} size={40} />
          <div>
            <strong>{org.name || 'Organization name'}</strong>
            <p>{content.footerText || 'Browser-only demo. No real money is collected.'}</p>
            {content.location ? <p>{content.location}</p> : null}
            {content.contactEmail ? (
              <p>
                Contact{' '}
                {preview ? <span className="oh-link">{content.contactEmail}</span> : <a href={`mailto:${content.contactEmail}`}>{content.contactEmail}</a>}
              </p>
            ) : null}
          </div>
        </div>
        <div className="oh-footer-side">
          <nav aria-label="Footer">
            {preview ? (
              <>
                <span>Campaigns</span>
                <span>How it works</span>
              </>
            ) : (
              <>
                <Link to={`${base}/campaigns`}>Campaigns</Link>
                <Link to={`${base}/about`}>About</Link>
                <Link to={`${base}/how-it-works`}>How giving works</Link>
                {canUseFeature(org, 'supporterHistory') || holdsVouchers ? <Link to={`${base}/my-activity`}>My activity</Link> : null}
              </>
            )}
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
