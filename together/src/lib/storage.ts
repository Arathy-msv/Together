import { createSeed, translateSampleCampaign, translateSampleReferral, translateSampleUpdate } from '../data/seed.ts'
import { normalizeGameSettings } from './gameContribution.ts'
import { clearPlayers, ensureSampleRoster } from './players.ts'
import { isGameType } from './games.ts'
import { isCurrencyCode } from './format.ts'
import {
  normalizeCampaignExtras,
  normalizeContributionReferral,
  normalizeDocument,
  normalizeExpense,
  normalizeMilestone,
  normalizeReferral,
  normalizeUpdate,
} from './records.ts'
import type { Campaign, CampaignUpdate, Contribution, DemoStore, Referral } from './types.ts'

export const STORAGE_KEY = 'together.demo.v1'

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

/** Lets other storage modules (organizations) refresh subscribed views. */
export function notifyChange(): void {
  emit()
}

/** Campaigns saved before organizations existed belong to the default Together organization. */
export const LEGACY_ORG_ID = 'org_together'

function isCampaign(value: unknown): value is Campaign {
  if (!value || typeof value !== 'object') return false
  const campaign = value as Campaign
  return (
    typeof campaign.id === 'string' &&
    campaign.id.length > 0 &&
    typeof campaign.title === 'string' &&
    typeof campaign.description === 'string' &&
    typeof campaign.coverImageId === 'string' &&
    typeof campaign.organizerName === 'string' &&
    (campaign.access === 'open' || campaign.access === 'closed') &&
    typeof campaign.goalAmount === 'number' &&
    Number.isFinite(campaign.goalAmount) &&
    (campaign.donationMode === 'fixed' || campaign.donationMode === 'custom') &&
    Array.isArray(campaign.fixedAmounts) &&
    campaign.fixedAmounts.every((amount) => typeof amount === 'number' && Number.isFinite(amount)) &&
    typeof campaign.opensAt === 'string' &&
    typeof campaign.closesAt === 'string' &&
    typeof campaign.autoCloseOnGoal === 'boolean' &&
    !!campaign.participation &&
    typeof campaign.participation.direct === 'boolean' &&
    typeof campaign.participation.game === 'boolean' &&
    typeof campaign.createdAt === 'string'
  )
}

function normalizeCampaign(campaign: Campaign): Campaign {
  const gameType = isGameType(campaign.gameType) ? campaign.gameType : 'garden'
  return {
    ...campaign,
    organizationId:
      typeof campaign.organizationId === 'string' && campaign.organizationId ? campaign.organizationId : LEGACY_ORG_ID,
    currency: isCurrencyCode(campaign.currency) ? campaign.currency : 'INR',
    gameType,
    gameSettings: campaign.gameSettings ? normalizeGameSettings(gameType, campaign.gameSettings) : undefined,
    coverImageData:
      typeof campaign.coverImageData === 'string' && campaign.coverImageData.startsWith('data:image/')
        ? campaign.coverImageData
        : undefined,
    logoData:
      typeof campaign.logoData === 'string' && campaign.logoData.startsWith('data:image/')
        ? campaign.logoData
        : undefined,
    puzzleImageData:
      typeof campaign.puzzleImageData === 'string' && campaign.puzzleImageData.startsWith('data:image/')
        ? campaign.puzzleImageData
        : undefined,
  }
}

function isContribution(value: unknown): value is Contribution {
  if (!value || typeof value !== 'object') return false
  const contribution = value as Contribution
  return (
    typeof contribution.id === 'string' &&
    typeof contribution.campaignId === 'string' &&
    typeof contribution.amount === 'number' &&
    Number.isFinite(contribution.amount) &&
    contribution.amount > 0 &&
    (contribution.method === 'direct' || contribution.method === 'game') &&
    typeof contribution.reference === 'string' &&
    typeof contribution.createdAt === 'string' &&
    contribution.status === 'success'
  )
}

export class StorageFullError extends Error {
  constructor() {
    super('This browser’s demo storage is full. Try a smaller image, or reset demo data.')
  }
}

function write(store: DemoStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    throw new StorageFullError()
  }
  emit()
}

export function loadStore(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = createSeed()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      ensureSampleRoster(seeded.campaigns.map((campaign) => campaign.id))
      return seeded
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return recover()
    const record = parsed as Partial<Omit<DemoStore, 'version'>> & { version?: number }
    if (!Array.isArray(record.campaigns) || !Array.isArray(record.contributions)) return recover()
    const version = typeof record.version === 'number' ? record.version : 1
    const saved = record.campaigns.filter(isCampaign)
    const retired = saved.some((campaign) => RETIRED_SAMPLE_IDS.includes(campaign.id))
    const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
    let draft: RawStore = {
      campaigns: saved.filter((campaign) => !RETIRED_SAMPLE_IDS.includes(campaign.id)).map(normalizeCampaign),
      contributions: record.contributions
        .filter(isContribution)
        .filter((contribution) => !RETIRED_SAMPLE_IDS.includes(contribution.campaignId)),
      referrals: list(record.referrals),
      milestones: list(record.milestones),
      campaignUpdates: list(record.campaignUpdates),
      expenses: list(record.expenses),
      supportingDocuments: list(record.supportingDocuments),
    }
    const merged = withDefaultCampaigns(draft)
    const changed = merged.changed || retired || version !== 4
    draft = merged.store
    if (version < 3) draft = withSeededTransparency(draft)
    if (version < 4) draft = withSeededTranslations(draft)
    const store = withRelationships(draft)
    if (changed) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      } catch {
        // Keep the migrated store in memory if the browser cannot save it.
      }
    }
    ensureSampleRoster(store.campaigns.map((campaign) => campaign.id))
    return store
  } catch {
    return recover()
  }
}

/** Store contents before relationship checks. Unknown records are validated in withRelationships. */
interface RawStore {
  campaigns: Campaign[]
  contributions: Contribution[]
  referrals: unknown[]
  milestones: unknown[]
  campaignUpdates: unknown[]
  expenses: unknown[]
  supportingDocuments: unknown[]
}

/** Validates every record against the campaigns that actually exist. Orphans are dropped individually. */
function withRelationships(raw: RawStore): DemoStore {
  const campaigns = raw.campaigns.map(normalizeCampaignExtras)
  const byId = new Map(campaigns.map((campaign) => [campaign.id, campaign]))
  const ids = new Set(byId.keys())
  const unique = <T extends { id: string }>(items: Array<T | null>): T[] => {
    const seen = new Set<string>()
    return items.filter((item): item is T => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }
  const referrals = unique(raw.referrals.map((item) => normalizeReferral(item, byId)))
  const codes = new Set<string>()
  const uniqueReferrals = referrals.filter((referral) => (codes.has(referral.code) ? false : (codes.add(referral.code), true)))
  const milestones = unique(raw.milestones.map((item) => normalizeMilestone(item, ids)))
  const milestoneIds = new Set(milestones.map((item) => item.id))
  const expenses = unique(raw.expenses.map((item) => normalizeExpense(item, ids, milestoneIds)))
  const expenseMap = new Map(expenses.map((item) => [item.id, item]))
  const referralMap = new Map(uniqueReferrals.map((item) => [item.id, item]))
  return {
    version: 4,
    campaigns,
    contributions: raw.contributions.map((contribution) => normalizeContributionReferral(contribution, referralMap)),
    referrals: uniqueReferrals,
    milestones,
    campaignUpdates: unique(raw.campaignUpdates.map((item) => normalizeUpdate(item, ids, milestoneIds, expenseMap))),
    expenses,
    supportingDocuments: unique(raw.supportingDocuments.map((item) => normalizeDocument(item, byId))),
  }
}

/** One-time v2 → v3 migration: adds sample stories, milestones, updates and referrals for sample campaigns. */
function withSeededTransparency(store: RawStore): RawStore {
  const seed = createSeed()
  const sampleById = new Map(seed.campaigns.map((campaign) => [campaign.id, campaign]))
  const campaigns = store.campaigns.map((campaign) => {
    const sample = sampleById.get(campaign.id)
    if (!sample || campaign.title !== sample.title || campaign.story) return campaign
    const { category, story, budget, impactExamples, demoVerification, fundingNote } = sample
    return { ...campaign, category, story, budget, impactExamples, demoVerification, fundingNote }
  })
  const present = new Set(campaigns.map((campaign) => campaign.id))
  const add = (current: unknown[], seeded: Array<{ id: string; campaignId: string }>) => {
    const known = new Set(current.map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined)))
    return [...current, ...seeded.filter((item) => present.has(item.campaignId) && !known.has(item.id))]
  }
  const knownGifts = new Set(store.contributions.map((contribution) => contribution.id))
  return {
    campaigns,
    contributions: [
      ...store.contributions,
      ...seed.contributions.filter((gift) => gift.referralId && present.has(gift.campaignId) && !knownGifts.has(gift.id)),
    ],
    referrals: add(store.referrals, seed.referrals),
    milestones: add(store.milestones, seed.milestones),
    campaignUpdates: add(store.campaignUpdates, seed.campaignUpdates),
    expenses: add(store.expenses, seed.expenses),
    supportingDocuments: add(store.supportingDocuments, seed.supportingDocuments),
  }
}

/** One-time v3 → v4 migration: adds the reviewed sample translations to unchanged sample records. */
function withSeededTranslations(store: RawStore): RawStore {
  const touch = <T,>(items: unknown[], translate: (item: T) => T) =>
    items.map((item) => (item && typeof item === 'object' && !('translations' in item) ? translate(item as T) : item))
  return {
    ...store,
    campaigns: store.campaigns.map(translateSampleCampaign),
    campaignUpdates: touch<CampaignUpdate>(store.campaignUpdates, translateSampleUpdate),
    referrals: touch<Referral>(store.referrals, translateSampleReferral),
  }
}

/** Sample campaigns for games that are no longer part of the demo. */
const RETIRED_SAMPLE_IDS = ['cmp_access', 'cmp_page', 'cmp_pencil']

/** Add any built-in sample campaigns that are not already saved in this browser. */
function withDefaultCampaigns(store: RawStore): { store: RawStore; changed: boolean } {
  const seeded = createSeed()
  const byId = new Map(seeded.campaigns.map((campaign) => [campaign.id, campaign]))
  let changed = false
  const campaigns = store.campaigns.map((campaign) => {
    const sample = byId.get(campaign.id)
    if (!sample || campaign.title !== sample.title) return campaign
    if (sample.gameType === campaign.gameType && sample.coverImageId === campaign.coverImageId) return campaign
    changed = true
    return { ...campaign, gameType: sample.gameType, coverImageId: sample.coverImageId }
  })
  const present = new Set(campaigns.map((campaign) => campaign.id))
  const missing = seeded.campaigns.filter((campaign) => !present.has(campaign.id))
  if (!changed && missing.length === 0) return { store, changed: false }
  const missingIds = new Set(missing.map((campaign) => campaign.id))
  const knownGifts = new Set(store.contributions.map((contribution) => contribution.id))
  const sampleGifts = seeded.contributions.filter(
    (contribution) => missingIds.has(contribution.campaignId) && !knownGifts.has(contribution.id),
  )
  const sampleRecords = <T extends { campaignId: string }>(items: T[]) => items.filter((item) => missingIds.has(item.campaignId))
  return {
    changed: true,
    store: {
      ...store,
      campaigns: [...campaigns, ...missing],
      contributions: [...store.contributions, ...sampleGifts],
      referrals: [...store.referrals, ...sampleRecords(seeded.referrals)],
      milestones: [...store.milestones, ...sampleRecords(seeded.milestones)],
      campaignUpdates: [...store.campaignUpdates, ...sampleRecords(seeded.campaignUpdates)],
      expenses: [...store.expenses, ...sampleRecords(seeded.expenses)],
      supportingDocuments: [...store.supportingDocuments, ...sampleRecords(seeded.supportingDocuments)],
    },
  }
}

function recover(): DemoStore {
  const seeded = createSeed()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    // Ignore quota or private-mode failures and keep the in-memory seed.
  }
  ensureSampleRoster(seeded.campaigns.map((campaign) => campaign.id))
  return seeded
}

export function saveStore(store: DemoStore): void {
  write(store)
}

export function resetStore(): DemoStore {
  const seeded = createSeed()
  clearPlayers()
  ensureSampleRoster(seeded.campaigns.map((campaign) => campaign.id))
  write(seeded)
  return seeded
}
