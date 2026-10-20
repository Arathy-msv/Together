import { slugify } from './organizations.ts'
import { loadStore, saveStore } from './storage.ts'
import type { CampaignView, Contribution, Referral } from './types.ts'

/* Personalized sharing pages. A referral only changes the introduction; campaign facts, totals and
   the contribution destination always come from the original campaign. */

const MINE_KEY = 'together.myReferrals.v1'

export function referralPath(base: string, campaignId: string, code: string): string {
  return `${base}/campaigns/${campaignId}/r/${code}`
}

export function shareWorkspacePath(base: string, campaignId: string, code?: string): string {
  return `${base}/campaigns/${campaignId}/share${code ? `/${code}` : ''}`
}

/** Open, published campaigns that are running or about to open can have sharing pages. */
export function canHaveSharingPages(view: CampaignView): boolean {
  return !view.campaign.isDraft && view.campaign.access === 'open' && (view.status === 'active' || view.status === 'scheduled')
}

export function makeReferralCode(name: string, taken: Set<string>, random: () => number = Math.random): string {
  const stem = slugify(name).slice(0, 24).replace(/-+$/g, '') || 'friend'
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let suffix = ''
    for (let index = 0; index < 4; index += 1) suffix += alphabet[Math.floor(random() * alphabet.length)]
    const code = `${stem}-${suffix}`
    if (!taken.has(code)) return code
  }
  return `${stem}-${crypto.randomUUID().slice(0, 8)}`
}

export interface ReferralInput {
  displayName: string
  headline: string
  message: string
  avatarData?: string
  personalTarget?: number
  coverImage?: string
}

export type ReferralErrors = Partial<Record<keyof ReferralInput, string>>

export function validateReferral(input: ReferralInput): ReferralErrors {
  const errors: ReferralErrors = {}
  const name = input.displayName.trim()
  if (name.length < 2) errors.displayName = 'Add the name you want supporters to see (at least 2 characters).'
  else if (name.length > 60) errors.displayName = 'Keep your name to 60 characters or fewer.'
  const headline = input.headline.trim()
  if (headline.length < 3) errors.headline = 'Add a short headline (at least 3 characters).'
  else if (headline.length > 120) errors.headline = 'Keep the headline to 120 characters or fewer.'
  const message = input.message.trim()
  if (message.length < 20) errors.message = 'Tell supporters why you care (at least 20 characters).'
  else if (message.length > 1200) errors.message = 'Keep your message to 1,200 characters or fewer.'
  if (input.personalTarget !== undefined && (!Number.isSafeInteger(input.personalTarget) || input.personalTarget <= 0)) {
    errors.personalTarget = 'Enter a whole amount greater than zero, or leave it empty.'
  }
  return errors
}

function personalFields(input: ReferralInput) {
  return {
    displayName: input.displayName.trim(),
    headline: input.headline.trim(),
    message: input.message.trim(),
    avatarData: input.avatarData || undefined,
    personalTarget: input.personalTarget,
    coverImage: input.coverImage || undefined,
  }
}

/** Creates a sharing page for an existing campaign. Throws StorageFullError if it cannot be stored. */
export function createReferral(campaignId: string, input: ReferralInput): Referral {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === campaignId)
  if (!campaign) throw new Error('This campaign is no longer saved in this browser.')
  const now = new Date().toISOString()
  const referral: Referral = {
    id: `ref_${crypto.randomUUID()}`,
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    code: makeReferralCode(input.displayName, new Set(store.referrals.map((item) => item.code))),
    ...personalFields(input),
    createdAt: now,
    updatedAt: now,
  }
  store.referrals.push(referral)
  saveStore(store)
  rememberMine(referral.id)
  return referral
}

/** Updates only the personal introduction. Code, campaign and organization never change. */
export function updateReferral(id: string, input: ReferralInput): Referral | null {
  const store = loadStore()
  const index = store.referrals.findIndex((item) => item.id === id)
  if (index < 0) return null
  const next: Referral = { ...store.referrals[index], ...personalFields(input), updatedAt: new Date().toISOString() }
  store.referrals[index] = next
  saveStore(store)
  return next
}

export interface ReferralTotals {
  amount: number
  count: number
  /** Percent of the personal target, when one is set. */
  percent: number | null
}

/** Amount credited to one sharing page. These gifts are already part of the campaign total — never add them again. */
export function referralTotals(referral: Referral, contributions: Contribution[]): ReferralTotals {
  const credited = contributions.filter(
    (item) => item.referralId === referral.id && item.campaignId === referral.campaignId && item.status === 'success',
  )
  const amount = credited.reduce((sum, item) => sum + item.amount, 0)
  const percent = referral.personalTarget ? Math.min(100, Math.round((amount / referral.personalTarget) * 100)) : null
  return { amount, count: credited.length, percent }
}

/* ---------- Demo workspace: pages created on this device ---------- */

function readMine(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function rememberMine(id: string): void {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify([...new Set([...readMine(), id])]))
  } catch {
    // The page still exists; it just will not appear in this device's list.
  }
}

/** Demo convenience only: the device that created a page can edit it. This is not access control. */
export function isMyReferral(id: string): boolean {
  return readMine().includes(id)
}
