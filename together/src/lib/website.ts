import type { Organization, WebsiteConfig, WebsiteStatus } from './types.ts'

/*
 * Website lifecycle. The organization's top-level presentation fields are what the public website
 * shows (once published). Unpublished edits live in `website.draft`. Publishing copies the draft
 * over the public fields; it never publishes campaign drafts.
 */

export function websiteConfigOf(org: Organization): WebsiteConfig {
  return {
    name: org.name,
    tagline: org.tagline,
    about: org.about,
    logo: org.logo,
    favicon: org.favicon,
    branding: org.branding,
    content: org.content,
    visibility: { impactStories: org.visibility.impactStories, poweredBy: org.visibility.poweredBy },
  }
}

/** What the organizer is editing: the draft if there is one, otherwise the published settings. */
export function workingConfig(org: Organization): WebsiteConfig {
  return org.website.draft ?? websiteConfigOf(org)
}

export function applyConfig(org: Organization, config: WebsiteConfig): Organization {
  return {
    ...org,
    name: config.name,
    tagline: config.tagline,
    about: config.about,
    logo: config.logo,
    favicon: config.favicon,
    branding: config.branding,
    content: config.content,
    visibility: { ...org.visibility, ...config.visibility },
  }
}

/** The organization as it would look with unpublished changes — for previews only. */
export function previewOrganization(org: Organization): Organization {
  return applyConfig(org, workingConfig(org))
}

export function isPubliclyAvailable(org: Organization): boolean {
  return org.website.status === 'published'
}

export function hasUnpublishedChanges(org: Organization): boolean {
  return Boolean(org.website.draft) && JSON.stringify(org.website.draft) !== JSON.stringify(websiteConfigOf(org))
}

export function withWebsiteDraft(org: Organization, config: WebsiteConfig): Organization {
  return { ...org, website: { ...org.website, draft: config, updatedAt: new Date().toISOString() } }
}

export function withDraftDiscarded(org: Organization): Organization {
  return { ...org, website: { ...org.website, draft: undefined, updatedAt: new Date().toISOString() } }
}

export function withPublishedWebsite(org: Organization): Organization {
  const now = new Date().toISOString()
  return {
    ...applyConfig(org, workingConfig(org)),
    website: { status: 'published', draft: undefined, publishedAt: now, updatedAt: now },
    onboarding: undefined,
  }
}

export const STATUS_LABEL: Record<WebsiteStatus, string> = {
  setup: 'Setup in progress',
  draft: 'Draft — not published',
  published: 'Published',
}

export function websiteStatusLabel(org: Organization): string {
  if (org.website.status === 'published' && hasUnpublishedChanges(org)) return 'Published · unpublished changes'
  return STATUS_LABEL[org.website.status]
}

export function publicWebsiteUrl(org: Pick<Organization, 'slug'>, origin = typeof window === 'undefined' ? '' : window.location.origin): string {
  return `${origin}/o/${org.slug}`
}

export function workspacePath(org: Pick<Organization, 'id'>, section = 'overview'): string {
  return `/workspace/${org.id}/${section}`
}

/* ---------- Organizer preview (demo control) ---------- */

const PREVIEW_KEY = 'together.websitePreview.v1'

/** Lets the organizer browse their own public site with unpublished settings on this device. */
export function setWebsitePreview(orgId: string | null): void {
  try {
    if (orgId) sessionStorage.setItem(PREVIEW_KEY, orgId)
    else sessionStorage.removeItem(PREVIEW_KEY)
  } catch {
    // Preview simply stays off.
  }
}

export function isPreviewingWebsite(orgId: string): boolean {
  try {
    return sessionStorage.getItem(PREVIEW_KEY) === orgId
  } catch {
    return false
  }
}
