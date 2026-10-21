import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useDocumentTheme, useScrollOnNavigate } from '../../hooks/useDocumentTheme.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { canUseFeature } from '../../lib/features.ts'
import { setDisplayTimeZone } from '../../lib/format.ts'
import { readStoredLowData, setLowDataActive } from '../../lib/lowData.ts'
import { DEFAULT_BRANDING } from '../../lib/theme.ts'
import { isPreviewingWebsite, isPubliclyAvailable, previewOrganization, setWebsitePreview, websiteStatusLabel, workspacePath } from '../../lib/website.ts'
import { OrgNotFound } from '../../pages/org/OrgNotFound.tsx'
import { LowDataToggle } from './LowDataToggle.tsx'
import { OrgFooter, OrgHeader } from './OrgChrome.tsx'
import { OrgContext, orgContextValue, useOrg } from './OrgContext.tsx'

/**
 * Public organization website. Shows the *published* website settings. Organizers can preview
 * unpublished settings on this device through a clearly labelled demo control.
 */
export function OrgLayout() {
  const { organizationSlug = '' } = useParams()
  const { pathname, hash } = useLocation()
  const organizations = useOrganizations()
  const org = organizations.find((item) => item.slug.toLowerCase() === organizationSlug.toLowerCase())
  const [previewTick, setPreviewTick] = useState(0)
  const previewing = Boolean(org) && isPreviewingWebsite(org!.id)
  const shown = useMemo(() => (org ? (previewing ? previewOrganization(org) : org) : null), [org, previewing, previewTick]) // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => (shown ? orgContextValue(shown) : null), [shown])
  const playing = pathname.includes('/play')
  const available = Boolean(org) && (isPubliclyAvailable(org!) || previewing)

  useDocumentTheme(available && shown ? shown.branding : DEFAULT_BRANDING, available && shown ? shown.favicon || shown.logo || '/favicon.svg' : '/favicon.svg')
  useScrollOnNavigate(pathname, hash)
  setDisplayTimeZone(shown?.timezone)
  const lowDataOn = Boolean(shown && available && canUseFeature(shown, 'lowDataMode') && readStoredLowData())
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('low-data', lowDataOn)
  setLowDataActive(lowDataOn)
  useEffect(() => () => setDisplayTimeZone(undefined), [])

  if (!org || !value || !shown) {
    return (
      <div className="app-shell pro">
        <main id="main">
          <OrgNotFound kind="organization" slug={organizationSlug} />
        </main>
      </div>
    )
  }
  if (!available) return <WebsiteUnavailable orgId={org.id} name={org.name || 'This organization'} />

  const banner = previewing ? (
    <div className="preview-banner" role="region" aria-label="Organizer preview">
      <span className="demo-badge">Demo control</span>
      <span>
        Previewing <strong>unpublished website settings</strong> on this device. {websiteStatusLabel(org)}.
      </span>
      <Link to={workspacePath(org, 'website')}>Back to your website</Link>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setWebsitePreview(null)
          setPreviewTick((tick) => tick + 1)
        }}
      >
        Exit preview
      </button>
    </div>
  ) : null

  if (playing) {
    return (
      <OrgContext.Provider value={value}>
        <div className="app-shell">
          {banner}
          <main id="main">
            <Outlet />
          </main>
        </div>
      </OrgContext.Provider>
    )
  }

  return (
    <OrgContext.Provider value={value}>
      <div className="app-shell pro org-frame">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {banner}
        <OrgHeader org={shown} base={value.base} workspace={value.workspace} />
        <LowDataToggle org={shown} />
        <main id="main">
          <Outlet />
        </main>
        <OrgFooter org={shown} base={value.base} workspace={value.workspace} />
      </div>
    </OrgContext.Provider>
  )
}

function WebsiteUnavailable({ orgId, name }: { orgId: string; name: string }) {
  return (
    <div className="app-shell pro">
      <main id="main" className="container narrow page-pad">
        <div className="panel empty not-found">
          <span className="not-found-code" aria-hidden="true">
            Soon
          </span>
          <h1>{name}’s website isn’t published yet</h1>
          <p className="muted">The organizer is still setting it up. Please check back later.</p>
          <p className="muted small">
            Are you the organizer? Open the demo workspace to finish setup or preview your website. This is a demo control, not a sign-in.
          </p>
          <div className="inline-actions center">
            <Link to={workspacePath({ id: orgId }, 'overview')} className="btn btn-primary">
              Open demo workspace
            </Link>
            <Link to="/" className="btn btn-outline">
              Together home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

/** Old organizer URLs under /o/:slug now live in the workspace. */
export function OrgWorkspaceRedirect({ section }: { section: string }) {
  const { workspace } = useOrg()
  const { campaignId, tab } = useParams()
  const { search } = useLocation()
  const path = section === 'campaign' ? `campaigns/${campaignId}${tab ? `/${tab}` : ''}` : section
  return <Navigate to={`${workspace}/${path}${search}`} replace />
}
