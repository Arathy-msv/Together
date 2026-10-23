import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { OrgContext, orgContextValue } from '../../components/org/OrgContext.tsx'
import { OrgSwitcher } from '../../components/org/OrgSwitcher.tsx'
import { AccessDenied } from '../../components/identity/AccessDenied.tsx'
import { DemoToolsMenu } from '../../components/identity/DemoToolsMenu.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { membership, ROLE_LABEL } from '../../lib/identity.ts'
import { can, SECTION_PERMISSION } from '../../lib/permissions.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { canUseFeature } from '../../lib/features.ts'
import { orgVouchers } from '../../lib/vouchers.ts'
import { setDisplayTimeZone } from '../../lib/format.ts'
import { clearLowData } from '../../lib/lowData.ts'
import { useDocumentTheme, useScrollOnNavigate } from '../../hooks/useDocumentTheme.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { orgTypeLabel } from '../../lib/organizations.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { DEFAULT_BRANDING } from '../../lib/theme.ts'
import { isPubliclyAvailable, previewOrganization, publicWebsiteUrl, setWebsitePreview, websiteStatusLabel } from '../../lib/website.ts'

/**
 * Management workspace for one organization (/workspace/:organizationId). Only members of the
 * organization can open it, and each section checks the member’s role. Demo identities are
 * simulated; this is not production access control.
 */
export function WorkspaceLayout() {
  const { organizationId = '' } = useParams()
  const { pathname, hash } = useLocation()
  const organizations = useOrganizations()
  const stored = organizations.find((org) => org.id === organizationId)
  const org = useMemo(() => (stored ? previewOrganization(stored) : null), [stored])
  const value = useMemo(() => (org ? orgContextValue(org) : null), [org])
  const voucherStore = useVoucherStore()
  const user = useCurrentUser()
  useDocumentTheme(org?.branding ?? DEFAULT_BRANDING)
  useScrollOnNavigate(pathname, hash)
  setDisplayTimeZone(org?.timezone)
  clearLowData()
  useEffect(() => () => setDisplayTimeZone(undefined), [])

  const member = stored && user ? membership(user.id, stored.id) : undefined
  useEffect(() => {
    if (stored && member) setActiveOrgId(stored.id)
  }, [stored, member])

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
  if (!member) {
    return (
      <div className="app-shell pro workspace-shell">
        <header className="ws-top">
          <div className="ws-top-inner">
            <Link to="/" className="ws-platform-link" aria-label="Together platform home">
              Together
            </Link>
            <DemoToolsMenu compact />
          </div>
        </header>
        <main id="main">
          <AccessDenied reason="Only members of this organization can open its workspace. A Platform Admin manages organizations from the platform admin page, without access to their supporter records." />
        </main>
      </div>
    )
  }
  const section = pathname.slice(root.length + 1).split('/')[0] || 'overview'
  const sectionPermission = SECTION_PERMISSION[section]
  const allowed = (key: string) => can(user, SECTION_PERMISSION[key], { organization: stored })
  const sectionAllowed = !sectionPermission || allowed(section)
  const offersVisible = allowed('offers') && (canUseFeature(org, 'partnerVouchers') || orgVouchers(voucherStore, org.id).length > 0)
  const moreActive = ['offers', 'members', 'sponsors', 'settings', 'plan', 'features'].includes(section)
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
            <span className="ws-role">{ROLE_LABEL[member.role]}</span>
            <OrgSwitcher currentId={org.id} />
            <DemoToolsMenu compact />
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
            {allowed('website') ? <WebsiteActions stored={stored} /> : null}
          </div>
          <nav className="ws-nav" aria-label="Workspace">
            <NavLink to={`${root}/overview`}>Home</NavLink>
            {allowed('website') ? <NavLink to={`${root}/website`}>Website</NavLink> : null}
            <NavLink to={`${root}/campaigns`} end={false}>
              Campaigns
            </NavLink>
            <details key={pathname} className={moreActive ? 'ws-more active' : 'ws-more'}>
              <summary>More</summary>
              <div className="ws-more-menu">
                {offersVisible ? <Link to={`${root}/offers`}>Partner offers</Link> : null}
                {allowed('members') ? <Link to={`${root}/members`}>Members</Link> : null}
                {allowed('sponsors') && canUseFeature(org, 'sponsorPlay') ? <Link to={`${root}/sponsors`}>Sponsors</Link> : null}
                {allowed('settings') ? (
                  <>
                    <Link to={`${root}/settings`}>Settings</Link>
                    <Link to={`${root}/plan`}>Your demo plan</Link>
                    <Link to={`${root}/features`}>Website features</Link>
                    <Link to={`${root}/overview?checklist=1`}>Setup checklist</Link>
                  </>
                ) : null}
                <Link to={`/o/${org.slug}/how-it-works`}>How giving works for supporters</Link>
                {allowed('website') ? <CopyWebsiteLink stored={stored} /> : null}
                <p className="muted small">Everything is saved on this device only.</p>
              </div>
            </details>
          </nav>
        </div>
        {stored.website.status === 'setup' && member.role === 'org_admin' ? (
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
        <Breadcrumbs root={root} pathname={pathname} />
        <main id="main">{sectionAllowed ? <Outlet /> : <AccessDenied reason={`${ROLE_LABEL[member.role]}s can’t open this section. Organization branding, plans, features and memberships are managed by an Organization Admin.`} />}</main>
      </div>
    </OrgContext.Provider>
  )
}

function WebsiteActions({ stored }: { stored: Parameters<typeof isPubliclyAvailable>[0] }) {
  const navigate = useNavigate()
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
    </div>
  )
}

function CopyWebsiteLink({ stored }: { stored: Parameters<typeof publicWebsiteUrl>[0] }) {
  const [copied, setCopied] = useState(false)
  const url = publicWebsiteUrl(stored)
  return (
    <button
      type="button"
      className="ws-more-action"
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
  )
}

const SECTION_LABEL: Record<string, string> = {
  overview: 'Home',
  website: 'Website',
  campaigns: 'Campaigns',
  offers: 'Partner offers',
  members: 'Members',
  sponsors: 'Sponsors',
  settings: 'Settings',
  plan: 'Your demo plan',
  features: 'Website features',
}

const CAMPAIGN_TAB_LABEL: Record<string, string> = {
  overview: 'Overview',
  story: 'Story & settings',
  referrals: 'Sharing pages',
  milestones: 'Milestones',
  updates: 'Updates',
  expenses: 'Expenses',
  trust: 'Documents',
  report: 'Final report',
}

/** Where you are inside the workspace. Hidden on top-level sections, which the tabs already show. */
function Breadcrumbs({ root, pathname }: { root: string; pathname: string }) {
  const store = useDemoStore()
  const parts = pathname.slice(root.length + 1).split('/').filter(Boolean)
  const trail: Array<{ label: string; to?: string }> = [{ label: 'Home', to: `${root}/overview` }]
  if (parts[0] === 'campaigns' && parts[1]) {
    trail.push({ label: 'Campaigns', to: `${root}/campaigns` })
    if (parts[1] === 'new') trail.push({ label: 'New campaign' })
    else {
      const title = store.campaigns.find((item) => item.id === parts[1])?.title ?? 'Campaign'
      if (parts[2]) trail.push({ label: title, to: `${root}/campaigns/${parts[1]}` }, { label: CAMPAIGN_TAB_LABEL[parts[2]] ?? parts[2] })
      else trail.push({ label: title })
    }
  } else if (parts[0] === 'plan' || parts[0] === 'features' || parts[0] === 'settings' || parts[0] === 'members' || parts[0] === 'sponsors' || parts[0] === 'offers') {
    trail.push({ label: 'More' }, { label: SECTION_LABEL[parts[0]] ?? parts[0] })
  } else {
    return null
  }
  return (
    <nav className="container ws-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
