import { createSeed } from '../data/seed.ts'
import { normalizeGameSettings } from './gameContribution.ts'
import { isGameType } from './games.ts'
import type { Campaign, Contribution, DemoStore } from './types.ts'

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
      return seeded
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return recover()
    const record = parsed as Partial<DemoStore>
    if (!Array.isArray(record.campaigns) || !Array.isArray(record.contributions)) return recover()
    const saved = record.campaigns.filter(isCampaign)
    const retired = saved.some((campaign) => RETIRED_SAMPLE_IDS.includes(campaign.id))
    const store = withDefaultCampaigns({
      version: 1,
      campaigns: saved.filter((campaign) => !RETIRED_SAMPLE_IDS.includes(campaign.id)).map(normalizeCampaign),
      contributions: record.contributions
        .filter(isContribution)
        .filter((contribution) => !RETIRED_SAMPLE_IDS.includes(contribution.campaignId)),
    })
    if (retired) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      } catch {
        // Keep the filtered list in memory.
      }
    }
    return store
  } catch {
    return recover()
  }
}

/** Sample campaigns for games that are no longer part of the demo. */
const RETIRED_SAMPLE_IDS = ['cmp_access', 'cmp_page', 'cmp_pencil']

/** Add any built-in sample campaigns that are not already saved in this browser. */
function withDefaultCampaigns(store: DemoStore): DemoStore {
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
  if (!changed && missing.length === 0) return store
  const next: DemoStore = { ...store, campaigns: [...campaigns, ...missing] }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Keep the merged list in memory if the browser cannot store it.
  }
  return next
}

function recover(): DemoStore {
  const seeded = createSeed()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    // Ignore quota or private-mode failures and keep the in-memory seed.
  }
  return seeded
}

export function saveStore(store: DemoStore): void {
  write(store)
}

export function resetStore(): DemoStore {
  const seeded = createSeed()
  write(seeded)
  return seeded
}
