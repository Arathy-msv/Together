import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { OrgContext, orgContextValue } from '../../components/org/OrgContext.tsx'
import { OrgSwitcher } from '../../components/org/OrgSwitcher.tsx'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { canUseFeature } from '../../lib/features.ts'
import { orgVouchers } from '../../lib/vouchers.ts'
import { useDocumentTheme, useScrollOnNavigate } from '../../hooks/useDocumentTheme.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { orgTypeLabel } from '../../lib/organizations.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { DEFAULT_BRANDING } from '../../lib/theme.ts'
import { isPubliclyAvailable, previewOrganization, publicWebsiteUrl, setWebsitePreview, websiteStatusLabel } from '../../lib/website.ts'

/**
 * Management workspace for one organization (/workspace/:organizationId). Demo controls only —
 * anyone using this browser can open any workspace.
 */
export function WorkspaceLayout() {
  const { organizationId = '' } = useParams()
  const { pathname, hash } = useLocation()
  const organizations = useOrganizations()
  const stored = organizations.find((org) => org.id === organizationId)
  const org = useMemo(() => (stored ? previewOrganization(stored) : null), [stored])
  const value = useMemo(() => (org ? orgContextValue(org) : null), [org])
  const voucherStore = useVoucherStore()
  useDocumentTheme(org?.branding ?? DEFAULT_BRANDING)
  useScrollOnNavigate(pathname, hash)

  useEffect(() => {
    if (stored) setActiveOrgId(stored.id)
  }, [stored])

  if (!stored || !org || !value) {
    return (
      <div className="app-shell pro">
        <main id="main" className="container narrow page-pad">
          <div className="panel empty">
            <h1>We couldn’t find that workspace</h1>
            <p className="muted">The organization may have been removed, or it was created in another browser.</p>
            <Link to="/workspace" className="btn btn-primary">
              Choose a demo workspace
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const root = `/workspace/${org.id}`
  return (
    <OrgContext.Provider value={value}>
      <div className="app-shell pro workspace-shell">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="ws-top">
          <div className="ws-top-inner">
            <Link to="/" className="ws-platform-link" aria-label="Together platform home">
              Together
            </Link>
            <span className="demo-badge">Demo workspace</span>
            <OrgSwitcher currentId={org.id} />
          </div>
        </header>
        <div className="ws-org-head">
          <div className="ws-org-inner">
            <div className="example-brand">
              <OrgLogoMark org={org} size={48} />
              <div>
                <strong className="ws-org-name">{org.name || 'Untitled organization'}</strong>
                <span className="muted small">{orgTypeLabel(org.type)}</span>
              </div>
            </div>
            <div className="ws-site">
              <span className={`status-pill ${stored.website.status}`}>{websiteStatusLabel(stored)}</span>
              <code>{publicWebsiteUrl(org)}</code>
            </div>
            <WebsiteActions stored={stored} />
          </div>
          <nav className="ws-nav" aria-label="Workspace">
            <NavLink to={`${root}/overview`}>Overview</NavLink>
            <NavLink to={`${root}/website`}>My website</NavLink>
            <NavLink to={`${root}/campaigns`} end={false} className={({ isActive }) => (isActive || pathname.startsWith(`${root}/assistant`) ? 'active' : '')}>
              Campaigns
            </NavLink>
            {canUseFeature(org, 'partnerVouchers') || orgVouchers(voucherStore, org.id).length > 0 ? <NavLink to={`${root}/offers`}>Partner offers</NavLink> : null}
            <NavLink to={`${root}/settings`} className={({ isActive }) => (isActive || pathname.startsWith(`${root}/plan`) ? 'active' : '')}>
              Settings
            </NavLink>
            <details className="ws-help">
              <summary>Help</summary>
              <div className="ws-help-menu">
                <Link to={`${root}/overview?checklist=1`}>Setup checklist</Link>
                <Link to={`${root}/plan`}>Your demo plan</Link>
                <Link to={`${root}/features`}>Website features</Link>
                <Link to={`/o/${org.slug}/how-it-works`}>How giving works for supporters</Link>
                <p className="muted small">Everything is saved on this device only.</p>
              </div>
            </details>
          </nav>
        </div>
        {stored.website.status === 'setup' ? (
          <div className="container">
            <div className="notice warn">
              <div>
                <strong>Setup isn’t finished yet.</strong>
                <p className="small">Finish the guided setup to choose your address and publish your website.</p>
              </div>
              <Link to={`/start/${org.id}`} className="btn btn-primary btn-sm">
                Continue setup
              </Link>
            </div>
          </div>
        ) : null}
        <main id="main">
          <Outlet />
        </main>
      </div>
    </OrgContext.Provider>
  )
}

function WebsiteActions({ stored }: { stored: Parameters<typeof isPubliclyAvailable>[0] }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const url = publicWebsiteUrl(stored)
  const live = isPubliclyAvailable(stored)
  return (
    <div className="inline-actions ws-actions">
      {live ? (
        <Link to={`/o/${stored.slug}`} className="btn btn-outline btn-sm" onClick={() => setWebsitePreview(null)}>
          Open website
        </Link>
      ) : (
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setWebsitePreview(stored.id)
            navigate(`/o/${stored.slug}`)
          }}
        >
          Preview website
        </button>
      )}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2500)
          } catch {
            setCopied(false)
          }
        }}
      >
        {copied ? 'Link copied.' : 'Copy website link'}
      </button>
      <span className="sr-only" role="status">
        {copied ? 'Link copied.' : ''}
      </span>
    </div>
  )
}
