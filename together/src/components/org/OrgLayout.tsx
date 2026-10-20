import { useEffect, useLayoutEffect, useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { DEFAULT_ORG_ID, organizerSection } from '../../lib/organizations.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { themeVars } from '../../lib/theme.ts'
import type { Organization } from '../../lib/types.ts'
import { OrgNotFound } from '../../pages/org/OrgNotFound.tsx'
import { OrgFooter, OrgHeader } from './OrgChrome.tsx'
import { OrgContext, orgContextValue } from './OrgContext.tsx'
import { OrganizerBar } from './OrganizerBar.tsx'

/** Applies an organization's theme tokens to the whole document, including dialogs rendered in portals. */
function useDocumentTheme(org: Organization) {
  const vars = useMemo(() => themeVars(org.branding), [org.branding])
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('org-theme')
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    return () => {
      root.classList.remove('org-theme')
      for (const name of Object.keys(vars)) root.style.removeProperty(name)
    }
  }, [vars])

  const icon = org.favicon || org.logo || '/favicon.svg'
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const previous = link.href
    link.href = icon
    return () => {
      link.href = previous
    }
  }, [icon])
}

export function OrgLayout() {
  const { organizationSlug = '' } = useParams()
  const { pathname, hash } = useLocation()
  const organizations = useOrganizations()
  const org = organizations.find((item) => item.slug === organizationSlug.toLowerCase())
  const shown = org ?? organizations.find((item) => item.id === DEFAULT_ORG_ID) ?? organizations[0]
  const value = useMemo(() => orgContextValue(shown), [shown])
  const section = org ? organizerSection(pathname, value.base) : null
  const playing = Boolean(org) && pathname.includes('/play')

  useDocumentTheme(shown)

  useEffect(() => {
    if (org && section) setActiveOrgId(org.id)
  }, [org, section])

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  if (playing) {
    return (
      <OrgContext.Provider value={value}>
        <div className="app-shell">
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
        <OrgHeader org={shown} base={value.base} />
        {section ? <OrganizerBar /> : null}
        <main id="main">{org ? <Outlet /> : <OrgNotFound kind="organization" slug={organizationSlug} />}</main>
        <OrgFooter org={shown} base={value.base} />
      </div>
    </OrgContext.Provider>
  )
}
