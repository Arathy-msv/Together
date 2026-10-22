import { useEffect, useLayoutEffect, useMemo } from 'react'
import { appPath } from '../lib/publicUrl.ts'
import { themeVars } from '../lib/theme.ts'
import type { OrgBranding } from '../lib/types.ts'

/** Applies theme tokens to the whole document, including dialogs rendered in portals. */
export function useDocumentTheme(branding: OrgBranding, icon = '/favicon.svg') {
  const vars = useMemo(() => themeVars(branding), [branding])
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('org-theme')
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
    return () => {
      root.classList.remove('org-theme')
      for (const name of Object.keys(vars)) root.style.removeProperty(name)
    }
  }, [vars])

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const previous = link.href
    link.href = appPath(icon)
    return () => {
      link.href = previous
    }
  }, [icon])
}

/** Scrolls to the hash target or the top on navigation. */
export function useScrollOnNavigate(pathname: string, hash: string) {
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
}
