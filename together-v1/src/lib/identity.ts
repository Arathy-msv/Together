import { notifyChange, StorageFullError } from './storage.ts'

/*
 * Simulated demo identities. There is no sign-in, password or server: anyone using this browser
 * can pick any demo identity from the clearly labelled switcher. Roles and checks demonstrate how
 * access would work; they are not production authentication or security.
 */

export const IDENTITY_KEY = 'together.identity.v1'
const PROFILES_KEY = 'together.supporterProfiles.v1'

export type Role = 'platform_admin' | 'org_admin' | 'campaign_organizer' | 'merchant' | 'supporter'
export type OrgRole = Extract<Role, 'org_admin' | 'campaign_organizer'>

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: 'Platform Admin',
  org_admin: 'Organization Admin',
  campaign_organizer: 'Campaign Organizer',
  merchant: 'Merchant',
  supporter: 'Supporter',
}

export interface DemoUser {
  id: string
  name: string
  /** Platform Admin is a platform-wide flag, never granted through an organization. */
  platformAdmin: boolean
  /** Local supporter profile that owns this person’s receipts, vouchers and sharing pages. */
  supporterProfileId: string
  createdAt: string
}

export interface OrgMembership {
  userId: string
  organizationId: string
  role: OrgRole
  /** Campaign Organizers only act on these campaigns (plus ones they created, which are added here). */
  campaignIds: string[]
  addedBy: string
  addedAt: string
}

export interface MerchantAccess {
  userId: string
  merchantId: string
  /** Branch ids this person may redeem at, or 'all' for every branch of the store. */
  branchIds: string[] | 'all'
  /** Organization whose admin granted access. Access never extends to that organization’s records. */
  grantedByOrganizationId: string
  grantedBy: string
  grantedAt: string
}

export interface AuditEntry {
  id: string
  at: string
  /** Demo user id, or 'guest'. */
  actorId: string
  action: string
  organizationId?: string
  targetId?: string
  detail?: string
}

interface IdentityStore {
  version: 1
  users: DemoUser[]
  memberships: OrgMembership[]
  merchantAccess: MerchantAccess[]
  /** null = guest visitor (supporter) using this device’s guest profile. */
  currentUserId: string | null
  guestProfileId: string | null
  audit: AuditEntry[]
}

export const GUEST = 'guest'
const AUDIT_LIMIT = 500
const SEEDED_AT = '2026-01-01T00:00:00.000Z'

/* Seed identities for the built-in demo organizations. Ids are fixed so tests and docs can refer to them. */
export const DEMO_USERS = {
  platformAdmin: 'usr_platform_pat',
  togetherAdmin: 'usr_together_admin',
  lumenAdmin: 'usr_lumen_leah',
  lumenAdmin2: 'usr_lumen_omar',
  lumenOrganizer: 'usr_lumen_nina',
  mapleAdmin: 'usr_maple_maya',
  mapleOrganizer: 'usr_maple_sam',
  harbourAdmin: 'usr_harbour_hana',
  riversideAdmin: 'usr_riverside_raj',
  merchant: 'usr_merchant_mo',
  supporter: 'usr_supporter_asha',
} as const

function seedUser(id: string, name: string, platformAdmin = false): DemoUser {
  return { id, name, platformAdmin, supporterProfileId: `sup_${id}`, createdAt: SEEDED_AT }
}

function seedMembership(userId: string, organizationId: string, role: OrgRole, campaignIds: string[] = []): OrgMembership {
  return { userId, organizationId, role, campaignIds, addedBy: 'seed', addedAt: SEEDED_AT }
}

function seedStore(): IdentityStore {
  const u = DEMO_USERS
  return {
    version: 1,
    users: [
      seedUser(u.platformAdmin, 'Pat Rivera', true),
      seedUser(u.togetherAdmin, 'Tara Okafor'),
      seedUser(u.lumenAdmin, 'Leah Fernandes'),
      seedUser(u.lumenAdmin2, 'Omar Haddad'),
      seedUser(u.lumenOrganizer, 'Nina Park'),
      seedUser(u.mapleAdmin, 'Maya Thomas'),
      seedUser(u.mapleOrganizer, 'Sam Joseph'),
      seedUser(u.harbourAdmin, 'Hana Ito'),
      seedUser(u.riversideAdmin, 'Raj Menon'),
      seedUser(u.merchant, 'Mo Ali'),
      seedUser(u.supporter, 'Asha Varghese'),
    ],
    memberships: [
      seedMembership(u.togetherAdmin, 'org_together', 'org_admin'),
      seedMembership(u.lumenAdmin, 'org_lumen', 'org_admin'),
      seedMembership(u.lumenAdmin2, 'org_lumen', 'org_admin'),
      seedMembership(u.lumenOrganizer, 'org_lumen', 'campaign_organizer', ['cmp_lumen_coats']),
      seedMembership(u.mapleAdmin, 'org_maple', 'org_admin'),
      seedMembership(u.mapleOrganizer, 'org_maple', 'campaign_organizer', ['cmp_maple_lab']),
      seedMembership(u.harbourAdmin, 'org_harbour', 'org_admin'),
      seedMembership(u.riversideAdmin, 'org_riverside_runners', 'org_admin'),
    ],
    merchantAccess: [],
    currentUserId: null,
    guestProfileId: null,
    audit: [],
  }
}

const list = <T>(value: unknown, keep: (item: Record<string, unknown>) => boolean): T[] =>
  Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object' && keep(item as Record<string, unknown>)) as T[]) : []

let cache: { raw: string | null; store: IdentityStore } | null = null

export function loadIdentityStore(): IdentityStore {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(IDENTITY_KEY)
  } catch {
    raw = null
  }
  if (cache && cache.raw === raw) return structuredClone(cache.store)
  let store: IdentityStore
  if (!raw) {
    store = seedStore()
  } else {
    try {
      const parsed = JSON.parse(raw) as Partial<IdentityStore>
      const users = list<DemoUser>(parsed.users, (item) => typeof item.id === 'string' && typeof item.name === 'string').map((user) => ({
        ...user,
        platformAdmin: user.platformAdmin === true,
        supporterProfileId: typeof user.supporterProfileId === 'string' ? user.supporterProfileId : `sup_${user.id}`,
      }))
      const ids = new Set(users.map((user) => user.id))
      store = {
        version: 1,
        users,
        memberships: list<OrgMembership>(
          parsed.memberships,
          (item) => ids.has(item.userId as string) && typeof item.organizationId === 'string' && (item.role === 'org_admin' || item.role === 'campaign_organizer'),
        ).map((item) => ({ ...item, campaignIds: Array.isArray(item.campaignIds) ? item.campaignIds.filter((id) => typeof id === 'string') : [] })),
        merchantAccess: list<MerchantAccess>(parsed.merchantAccess, (item) => ids.has(item.userId as string) && typeof item.merchantId === 'string').map((item) => ({
          ...item,
          branchIds: item.branchIds === 'all' ? 'all' : Array.isArray(item.branchIds) ? item.branchIds.filter((id) => typeof id === 'string') : [],
        })),
        currentUserId: typeof parsed.currentUserId === 'string' && ids.has(parsed.currentUserId) ? parsed.currentUserId : null,
        guestProfileId: typeof parsed.guestProfileId === 'string' ? parsed.guestProfileId : null,
        audit: list<AuditEntry>(parsed.audit, (item) => typeof item.action === 'string' && typeof item.at === 'string').slice(-AUDIT_LIMIT),
      }
    } catch {
      store = seedStore()
    }
  }
  cache = { raw, store }
  return structuredClone(store)
}

function saveIdentityStore(store: IdentityStore): void {
  const raw = JSON.stringify({ ...store, audit: store.audit.slice(-AUDIT_LIMIT) })
  try {
    localStorage.setItem(IDENTITY_KEY, raw)
  } catch {
    throw new StorageFullError()
  }
  cache = { raw, store: structuredClone(store) }
  notifyChange()
}

/* ---------- Current identity ---------- */

export function currentUser(): DemoUser | null {
  const store = loadIdentityStore()
  return store.users.find((user) => user.id === store.currentUserId) ?? null
}

export function currentActorId(): string {
  return currentUser()?.id ?? GUEST
}

export function listUsers(): DemoUser[] {
  return loadIdentityStore().users
}

export function findUser(id: string): DemoUser | undefined {
  return loadIdentityStore().users.find((user) => user.id === id)
}

export function userName(id: string | undefined): string {
  if (!id || id === GUEST) return 'Guest visitor'
  if (id === 'legacy' || id === 'seed') return 'Earlier demo data'
  return findUser(id)?.name ?? 'Removed demo identity'
}

/** Points the local supporter profile at whoever is acting, so wallets and receipts follow the identity. */
function syncSupporterProfile(store: IdentityStore): void {
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? 'null') as { currentId?: string; profiles?: { id: string; name: string; createdAt: string }[] } | null
    const profiles = Array.isArray(raw?.profiles) ? raw!.profiles : []
    const user = store.users.find((item) => item.id === store.currentUserId)
    let id: string
    let name: string
    if (user) {
      id = user.supporterProfileId
      name = user.name
    } else {
      if (!store.guestProfileId) store.guestProfileId = `sup_guest_${crypto.randomUUID().slice(0, 8)}`
      id = store.guestProfileId
      name = 'Guest on this device'
    }
    if (!profiles.some((profile) => profile.id === id)) profiles.push({ id, name, createdAt: new Date().toISOString() })
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ currentId: id, profiles }))
  } catch {
    // Wallet falls back to an empty view.
  }
}

/** Switch demo identity. Pass null for a guest visitor. Callers remount private views afterwards. */
export function switchIdentity(userId: string | null): void {
  const store = loadIdentityStore()
  if (userId !== null && !store.users.some((user) => user.id === userId)) throw new Error('That demo identity no longer exists.')
  store.currentUserId = userId
  syncSupporterProfile(store)
  saveIdentityStore(store)
}

/** The supporter profile that owns private records for whoever is acting now. */
export function currentSupporterId(): string {
  const store = loadIdentityStore()
  const user = store.users.find((item) => item.id === store.currentUserId)
  if (user) return user.supporterProfileId
  if (!store.guestProfileId) {
    syncSupporterProfile(store)
    saveIdentityStore(store)
  }
  return store.guestProfileId!
}

export function createDemoUser(rawName: string): DemoUser {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (name.length < 2) throw new Error('Give the demo identity a name.')
  const store = loadIdentityStore()
  const id = `usr_${crypto.randomUUID().slice(0, 12)}`
  const user: DemoUser = { id, name, platformAdmin: false, supporterProfileId: `sup_${id}`, createdAt: new Date().toISOString() }
  store.users.push(user)
  store.audit.push(entry(store, 'identity.created', { targetId: id, detail: name }))
  saveIdentityStore(store)
  return user
}

/* ---------- Memberships ---------- */

export function membershipsFor(userId: string | undefined): OrgMembership[] {
  if (!userId) return []
  return loadIdentityStore().memberships.filter((item) => item.userId === userId)
}

export function membership(userId: string | undefined, organizationId: string): OrgMembership | undefined {
  if (!userId) return undefined
  return loadIdentityStore().memberships.find((item) => item.userId === userId && item.organizationId === organizationId)
}

export function orgMembers(organizationId: string): OrgMembership[] {
  return loadIdentityStore().memberships.filter((item) => item.organizationId === organizationId)
}

export function orgAdmins(organizationId: string): string[] {
  return orgMembers(organizationId)
    .filter((item) => item.role === 'org_admin')
    .map((item) => item.userId)
}

export function merchantAccessFor(userId: string | undefined): MerchantAccess[] {
  if (!userId) return []
  return loadIdentityStore().merchantAccess.filter((item) => item.userId === userId)
}

export function merchantStaff(merchantId: string): MerchantAccess[] {
  return loadIdentityStore().merchantAccess.filter((item) => item.merchantId === merchantId)
}

/* ---------- Low-level writes. Permission checks live in permissions.ts / members.ts. ---------- */

function entry(store: IdentityStore, action: string, extra: Omit<AuditEntry, 'id' | 'at' | 'actorId' | 'action'> = {}): AuditEntry {
  return { id: crypto.randomUUID(), at: new Date().toISOString(), actorId: store.currentUserId ?? GUEST, action, ...extra }
}

/** Records an important action with the acting identity and a timestamp. */
export function recordAudit(action: string, extra: Omit<AuditEntry, 'id' | 'at' | 'actorId' | 'action'> = {}): void {
  const store = loadIdentityStore()
  store.audit.push(entry(store, action, extra))
  saveIdentityStore(store)
}

export function auditFor(organizationId: string): AuditEntry[] {
  return loadIdentityStore()
    .audit.filter((item) => item.organizationId === organizationId)
    .reverse()
}

export function writeMembership(next: OrgMembership | null, match: { userId: string; organizationId: string }, audit: Omit<AuditEntry, 'id' | 'at' | 'actorId'>): void {
  const store = loadIdentityStore()
  store.memberships = store.memberships.filter((item) => !(item.userId === match.userId && item.organizationId === match.organizationId))
  if (next) store.memberships.push(next)
  store.audit.push(entry(store, audit.action, audit))
  saveIdentityStore(store)
}

export function writeMerchantAccess(next: MerchantAccess | null, match: { userId: string; merchantId: string }, audit: Omit<AuditEntry, 'id' | 'at' | 'actorId'>): void {
  const store = loadIdentityStore()
  store.merchantAccess = store.merchantAccess.filter((item) => !(item.userId === match.userId && item.merchantId === match.merchantId))
  if (next) store.merchantAccess.push(next)
  store.audit.push(entry(store, audit.action, audit))
  saveIdentityStore(store)
}

/** Adds a campaign to an organizer’s explicit scope (used when an organizer creates a campaign). */
export function addCampaignToScope(userId: string, organizationId: string, campaignId: string): void {
  const store = loadIdentityStore()
  const item = store.memberships.find((m) => m.userId === userId && m.organizationId === organizationId)
  if (!item || item.role !== 'campaign_organizer' || item.campaignIds.includes(campaignId)) return
  item.campaignIds.push(campaignId)
  saveIdentityStore(store)
}

/**
 * Whoever creates an organization becomes its first Organization Admin. A guest gets a new demo
 * identity for this, because every organization needs at least one admin.
 */
export function grantCreatorAdmin(organizationId: string): DemoUser {
  const store = loadIdentityStore()
  let user = store.users.find((item) => item.id === store.currentUserId)
  if (!user) {
    const id = `usr_${crypto.randomUUID().slice(0, 12)}`
    user = { id, name: 'New organization admin', platformAdmin: false, supporterProfileId: `sup_${id}`, createdAt: new Date().toISOString() }
    store.users.push(user)
    store.currentUserId = id
    syncSupporterProfile(store)
  }
  if (!store.memberships.some((item) => item.userId === user!.id && item.organizationId === organizationId)) {
    store.memberships.push({ userId: user.id, organizationId, role: 'org_admin', campaignIds: [], addedBy: user.id, addedAt: new Date().toISOString() })
  }
  store.audit.push(entry(store, 'organization.created', { organizationId, targetId: user.id }))
  saveIdentityStore(store)
  return user
}

/**
 * Organizations saved before roles existed get one demo Organization Admin, so they stay manageable.
 * Nobody else gains access: no organizer, merchant or platform role is inferred.
 */
export function ensureOrganizationAdmins(organizations: { id: string; name: string }[]): void {
  const store = loadIdentityStore()
  let changed = !localStorageHas(IDENTITY_KEY)
  for (const org of organizations) {
    if (store.memberships.some((item) => item.organizationId === org.id && item.role === 'org_admin')) continue
    const id = `usr_admin_${org.id.replace(/^org_/, '').slice(0, 24)}`
    if (!store.users.some((user) => user.id === id)) {
      store.users.push({ id, name: `Admin · ${org.name || 'Untitled organization'}`, platformAdmin: false, supporterProfileId: `sup_${id}`, createdAt: new Date().toISOString() })
    }
    store.memberships.push({ userId: id, organizationId: org.id, role: 'org_admin', campaignIds: [], addedBy: 'legacy', addedAt: new Date().toISOString() })
    changed = true
  }
  if (changed) saveIdentityStoreQuiet(store)
}

function localStorageHas(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

/** Migration writes must not notify subscribers (they run while lists are being read). */
function saveIdentityStoreQuiet(store: IdentityStore): void {
  const raw = JSON.stringify(store)
  try {
    localStorage.setItem(IDENTITY_KEY, raw)
    cache = { raw, store: structuredClone(store) }
  } catch {
    // Keep working from memory.
  }
}

export function resetIdentities(): void {
  try {
    localStorage.removeItem(IDENTITY_KEY)
  } catch {
    // Nothing to reset.
  }
  cache = null
  notifyChange()
}

/** One-line role summary for a demo identity, e.g. “Organization Admin · Lumen Labs”. */
export function roleSummary(user: DemoUser, orgName: (id: string) => string): string {
  const store = loadIdentityStore()
  const parts: string[] = []
  if (user.platformAdmin) parts.push(ROLE_LABEL.platform_admin)
  for (const item of store.memberships.filter((m) => m.userId === user.id)) parts.push(`${ROLE_LABEL[item.role]} · ${orgName(item.organizationId)}`)
  if (store.merchantAccess.some((item) => item.userId === user.id)) parts.push(ROLE_LABEL.merchant)
  return parts.length > 0 ? parts.join(', ') : ROLE_LABEL.supporter
}
