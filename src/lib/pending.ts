import type { FlowerKind, PendingDonation } from './types.ts'

const PENDING_KEY = 'together.pending.v1'
const UNLOCK_KEY = 'together.unlocked.v1'

function isFlower(value: unknown): value is FlowerKind {
  return value === 'sunflower' || value === 'marigold' || value === 'lavender'
}

export function setPending(pending: PendingDonation): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export function getPending(campaignId?: string): PendingDonation | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const pending = parsed as PendingDonation
    if (typeof pending.token !== 'string' || typeof pending.campaignId !== 'string') return null
    if (typeof pending.amount !== 'number' || pending.amount <= 0) return null
    if (pending.method !== 'direct' && pending.method !== 'game') return null
    if (campaignId && pending.campaignId !== campaignId) return null
    if (pending.flowers && !Array.isArray(pending.flowers)) return null
    return pending
  } catch {
    return null
  }
}

export function clearPending(): void {
  sessionStorage.removeItem(PENDING_KEY)
}

export function newToken(): string {
  return crypto.randomUUID()
}

function readUnlocked(): string[] {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function isUnlocked(campaignId: string): boolean {
  return readUnlocked().includes(campaignId)
}

export function unlockCampaign(campaignId: string): void {
  const unlocked = new Set(readUnlocked())
  unlocked.add(campaignId)
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify([...unlocked]))
}

const gardenKey = (campaignId: string) => `together.garden.${campaignId}`

export function readGarden(campaignId: string): Array<FlowerKind | null> {
  try {
    const raw = sessionStorage.getItem(gardenKey(campaignId))
    if (!raw) return [null, null, null]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [null, null, null]
    const flowers = [0, 1, 2].map((index) => {
      const value = parsed[index]
      return isFlower(value) ? value : null
    })
    return flowers
  } catch {
    return [null, null, null]
  }
}

export function writeGarden(campaignId: string, flowers: Array<FlowerKind | null>): void {
  sessionStorage.setItem(gardenKey(campaignId), JSON.stringify(flowers))
}

export function flowerLabel(flower: FlowerKind): string {
  switch (flower) {
    case 'sunflower':
      return 'sunflower'
    case 'marigold':
      return 'marigold'
    case 'lavender':
      return 'lavender'
    default:
      return flower
  }
}

export function describePlanting(flowers: Array<FlowerKind | null>): string | undefined {
  const planted = flowers.filter(isFlower)
  if (planted.length === 0) return undefined
  const labels = planted.map(flowerLabel)
  if (labels.length === 1) return `Planted a ${labels[0]}.`
  if (labels.length === 2) return `Planted a ${labels[0]} and a ${labels[1]}.`
  return `Planted a ${labels[0]}, a ${labels[1]} and a ${labels[2]}.`
}

export const FLOWER_OPTIONS: { id: FlowerKind; name: string; meaning: string }[] = [
  { id: 'sunflower', name: 'Sunflower', meaning: 'Bright minds' },
  { id: 'marigold', name: 'Marigold', meaning: 'Brave tomorrows' },
  { id: 'lavender', name: 'Lavender', meaning: 'Kind communities' },
]
