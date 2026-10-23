/** Deploy prefix without a trailing slash. Empty when the app is served from the domain root. */
export function appBase(): string {
  let raw = '/'
  try {
    const value = import.meta.env.BASE_URL
    if (typeof value === 'string' && value.length > 0) raw = value
  } catch {
    raw = '/'
  }
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

/** Root-absolute app path, including the GitHub Pages prefix when this build has one. */
export function appPath(path: string): string {
  if (!path.startsWith('/')) return path
  const base = appBase()
  if (!base || path === base || path.startsWith(`${base}/`)) return path
  return `${base}${path}`
}

/** Full address for a copied link. Router paths stay unprefixed; this adds the deploy prefix. */
export function absoluteAppUrl(path: string, origin = typeof window === 'undefined' ? '' : window.location.origin): string {
  return `${origin}${appPath(path)}`
}
