import { DEFAULT_BRANDING } from './theme.ts'
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

/** Editable example text for first-time setup. Always shown as a sample to replace. */
export function sampleWebsiteContent(org: Pick<Organization, 'name' | 'type' | 'content'>) {
  const name = org.name.trim() || 'Our organization'
  const where = org.content.location.trim() ? ` in ${org.content.location.trim()}` : ''
  const noun = org.type === 'company' ? 'colleagues' : org.type === 'school' ? 'families and friends' : org.type === 'club' ? 'members and friends' : 'supporters'
  return {
    headline: `Help ${name} make a difference`,
    description: `Support our fundraisers. ${noun[0].toUpperCase() + noun.slice(1)} can give directly or join in with a short game.`,
    about: `${name} is based${where || ' in our community'}. Replace this sample with a few sentences about who you are and what you do.`,
    footerText: `${name} · Fundraising website`,
  }
}

/** essentials → review and publish */
export const SETUP_STEP_COUNT = 2

/**
 * Resume the current two-step setup. Older four- and five-step progress maps into it
 * without losing the visitor’s place.
 */
export function resumeSetupStep(onboarding: Organization['onboarding']): number {
  const step = onboarding?.step ?? 1
  if (onboarding?.flow === 2) return Math.min(SETUP_STEP_COUNT, Math.max(1, step))
  if (onboarding?.flow === 5) return step >= 4 ? 2 : 1
  if (onboarding?.flow === 4) return step >= 4 ? 2 : 1
  return step <= 1 ? 1 : 2
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface Task {
  id: string
  label: string
  hint: string
  done: boolean
  to: string
  action: string
}

/** Getting-started tasks, calculated from what is actually saved. */
export function setupTasks(stored: Organization, publishedCampaigns: number, workspace: string): Task[] {
  const org = previewOrganization(stored)
  const inSetup = stored.website.status === 'setup'
  const details = Boolean(org.name.trim()) && org.about.trim().length >= 10 && EMAIL.test(org.content.contactEmail.trim())
  const customized =
    Boolean(org.logo) || org.content.heroImage !== '/covers/hero-library.jpg' || org.branding.primary !== DEFAULT_BRANDING.primary || Boolean(org.content.headline.trim())
  return [
    { id: 'details', label: 'Add organization details', hint: 'Your name, a short description and a contact email.', done: details && !inSetup, to: inSetup ? `/start/${org.id}` : `${workspace}/website`, action: 'Add details' },
    { id: 'customize', label: 'Customize your website', hint: 'Choose your colours, photo and headline.', done: customized && !inSetup, to: inSetup ? `/start/${org.id}` : `${workspace}/website`, action: 'Customize website' },
    { id: 'publish', label: 'Publish your website', hint: 'Make it visible at your website address on this device.', done: isPubliclyAvailable(stored), to: inSetup ? `/start/${org.id}` : `${workspace}/website`, action: 'Review and publish' },
    {
      id: 'campaign',
      label: 'Create your first campaign',
      hint: 'Open your website and use Create a campaign there to describe your cause, set a goal and choose how people can contribute.',
      done: publishedCampaigns > 0,
      to: `/o/${org.slug}`,
      action: 'Open website',
    },
  ]
}

