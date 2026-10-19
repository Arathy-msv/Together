import { createSeed } from '../data/seed.ts'
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
  return {
    ...campaign,
    gameType: isGameType(campaign.gameType) ? campaign.gameType : 'garden',
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
    return {
      version: 1,
      campaigns: record.campaigns.filter(isCampaign).map(normalizeCampaign),
      contributions: record.contributions.filter(isContribution),
    }
  } catch {
    return recover()
  }
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
