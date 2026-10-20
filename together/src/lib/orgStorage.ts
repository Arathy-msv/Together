import { createOrganizationSeed } from '../data/organizations.ts'
import { recommendedFeatures } from './features.ts'
import { DEFAULT_ORG_ID, normalizeOrganization } from './organizations.ts'
import { notifyChange, StorageFullError } from './storage.ts'
import type { Organization, PlanId } from './types.ts'
import { websiteConfigOf } from './website.ts'

export const ORG_STORAGE_KEY = 'together.organizations.v1'
export const ACTIVE_ORG_KEY = 'together.activeOrg.v1'

interface OrgStore {
  version: 2
  organizations: Organization[]
}

function persist(organizations: Organization[]): void {
  const payload: OrgStore = { version: 2, organizations }
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(payload))
}

/** Gives later duplicates a unique slug so every organization stays reachable. */
function dedupeSlugs(organizations: Organization[]): Organization[] {
  const used = new Set<string>()
  return organizations.map((org) => {
    let slug = org.slug
    for (let index = 2; used.has(slug); index += 1) slug = `${org.slug}-${index}`
    used.add(slug)
    return slug === org.slug ? org : { ...org, slug }
  })
}

/**
 * Reads organizations record by record. A broken record is skipped or repaired on its own;
 * built-in demo organizations that are missing are added back.
 */
export function loadOrganizations(): Organization[] {
  const seeds = createOrganizationSeed()
  let saved: Organization[] = []
  let raw: string | null = null
  try {
    raw = localStorage.getItem(ORG_STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      const list = parsed && typeof parsed === 'object' ? (parsed as Partial<OrgStore>).organizations : undefined
      if (Array.isArray(list)) {
        const seen = new Set<string>()
        saved = list
          .map(normalizeOrganization)
          .filter((org): org is Organization => {
            if (!org || seen.has(org.id)) return false
            seen.add(org.id)
            return true
          })
      }
    }
  } catch {
    saved = []
  }
  const present = new Set(saved.map((org) => org.id))
  const missing = seeds.filter((seed) => !present.has(seed.id))
  const organizations = dedupeSlugs([...saved, ...missing])
  const outdated = Boolean(raw) && !raw!.includes('"version":2')
  if (!raw || missing.length > 0 || outdated) {
    try {
      persist(organizations)
    } catch {
      // Keep the merged list in memory if the browser cannot store it.
    }
  }
  return organizations
}

export function findOrganizationBySlug(slug: string | undefined): Organization | undefined {
  if (!slug) return undefined
  return loadOrganizations().find((org) => org.slug === slug.toLowerCase())
}

export function findOrganization(id: string | undefined): Organization | undefined {
  if (!id) return undefined
  return loadOrganizations().find((org) => org.id === id)
}

/** Saves one organization. Throws StorageFullError when the browser quota is exceeded. */
export function saveOrganization(org: Organization): Organization {
  const organizations = loadOrganizations()
  const next = { ...org, updatedAt: new Date().toISOString() }
  const index = organizations.findIndex((item) => item.id === org.id)
  if (index >= 0) organizations[index] = next
  else organizations.push(next)
  try {
    persist(organizations)
  } catch {
    throw new StorageFullError()
  }
  notifyChange()
  return next
}

/** Starts a new organization in "setup" with the chosen demo plan. Only saved in this browser. */
export function createOrganization(planId: PlanId): Organization {
  const now = new Date().toISOString()
  const id = `org_${crypto.randomUUID().slice(0, 12)}`
  const base = normalizeOrganization({ id, name: '', slug: `new-${id.slice(4, 10)}`, type: 'school', updatedAt: now, createdAt: now })!
  const org: Organization = {
    ...base,
    name: '',
    content: { ...base.content, headline: '', description: '', footerText: '' },
    plan: { id: planId, selectedAt: now },
    features: recommendedFeatures('school', planId),
    website: { status: 'setup', updatedAt: now },
    onboarding: { step: 1, updatedAt: now, flow: 5 },
  }
  org.website.draft = websiteConfigOf(org)
  return saveOrganization(org)
}

/** Removes an organization whose setup was never finished. Published organizations are kept. */
export function discardUnfinishedOrganization(id: string): void {
  const organizations = loadOrganizations()
  const org = organizations.find((item) => item.id === id)
  if (!org || org.website.status !== 'setup') return
  try {
    persist(organizations.filter((item) => item.id !== id))
  } catch {
    throw new StorageFullError()
  }
  notifyChange()
}

export function resetOrganizations(): void {
  try {
    persist(createOrganizationSeed())
  } catch {
    localStorage.removeItem(ORG_STORAGE_KEY)
  }
  notifyChange()
}

/* ---------- Demo organization switcher ---------- */

export function getActiveOrgId(): string {
  try {
    return localStorage.getItem(ACTIVE_ORG_KEY) || DEFAULT_ORG_ID
  } catch {
    return DEFAULT_ORG_ID
  }
}

export function setActiveOrgId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ORG_KEY, id)
  } catch {
    // The switcher still works for this page view.
  }
}

export function activeOrganization(): Organization {
  const organizations = loadOrganizations()
  const activeId = getActiveOrgId()
  return organizations.find((org) => org.id === activeId) ?? organizations.find((org) => org.id === DEFAULT_ORG_ID) ?? organizations[0]
}
