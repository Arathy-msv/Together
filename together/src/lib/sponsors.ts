import { trackJourney } from './analytics.ts'
import { loadStore, saveStore } from './storage.ts'
import { assertCan, PermissionError } from './permissions.ts'
import { currentUser } from './identity.ts'
import { findOrganization } from './orgStorage.ts'
import { canUseFeature } from './features.ts'
import type { SponsorAllocation, SponsorCommitment, SponsorUnlock } from './types.ts'

export interface SponsorOffer {
  commitment: SponsorCommitment
  pledgedMinor: number
  pendingMinor: number
  confirmedMinor: number
  remainingMinor: number
  /** Next reward this participant would unlock, or null when none remain. */
  next: { unlock: SponsorUnlock; amountMinor: number } | null
  exhausted: boolean
  dateOpen: boolean
}

function allocationsFor(commitmentId: string): SponsorAllocation[] {
  return loadStore().sponsorAllocations.filter((item) => item.commitmentId === commitmentId)
}

export function sponsorBalance(commitment: SponsorCommitment, now = Date.now()) {
  const rows = allocationsFor(commitment.id)
  const pendingMinor = rows.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amountMinor, 0)
  const confirmedMinor = rows.filter((item) => item.status === 'confirmed').reduce((sum, item) => sum + item.amountMinor, 0)
  const remainingMinor = Math.max(0, commitment.pledgedMinor - pendingMinor - confirmedMinor)
  const start = Date.parse(commitment.startsAt)
  const end = Date.parse(commitment.endsAt)
  const dateOpen = Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end
  return { pendingMinor, confirmedMinor, remainingMinor, dateOpen }
}

/** Active sponsor offer for a campaign, or null when play is not sponsored. */
export function sponsorOffer(campaignId: string, participantId: string, now = Date.now()): SponsorOffer | null {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === campaignId)
  if (!campaign?.sponsorEnabled) return null
  const org = findOrganization(campaign.organizationId)
  if (!org || !canUseFeature(org, 'sponsorPlay')) return null
  const commitment = store.sponsorCommitments.find((item) => item.campaignId === campaignId && item.organizationId === org.id)
  if (!commitment) return null
  const balance = sponsorBalance(commitment, now)
  const mine = store.sponsorAllocations.filter((item) => item.commitmentId === commitment.id && item.participantId === participantId)
  const used = new Set(mine.map((item) => item.unlockId))
  const spent = mine.reduce((sum, item) => sum + item.amountMinor, 0)
  const capLeft = Math.max(0, commitment.perParticipantCapMinor - spent)
  const nextUnlock = commitment.unlocks.find((item) => !used.has(item.id))
  let next: SponsorOffer['next'] = null
  if (nextUnlock && balance.dateOpen && balance.remainingMinor > 0 && capLeft > 0) {
    const amountMinor = Math.min(nextUnlock.rewardMinor, balance.remainingMinor, capLeft)
    if (amountMinor > 0) next = { unlock: nextUnlock, amountMinor }
  }
  return {
    commitment,
    pledgedMinor: commitment.pledgedMinor,
    ...balance,
    next,
    exhausted: !next,
  }
}

export function createSponsorCommitment(input: Omit<SponsorCommitment, 'id' | 'createdAt'>): SponsorCommitment {
  const org = findOrganization(input.organizationId)
  if (!org) throw new Error('Organization not found.')
  if (!canUseFeature(org, 'sponsorPlay')) throw new PermissionError('Turn on sponsor-funded play for this organization first.')
  assertCan('org.manageSponsors', { organization: org }, 'Only an Organization Admin can add a sponsor commitment.')
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === input.campaignId && item.organizationId === org.id)
  if (!campaign) throw new Error('Choose a campaign in this organization.')
  if (store.sponsorCommitments.some((item) => item.campaignId === campaign.id)) throw new Error('This campaign already has a sponsor commitment.')
  if (input.pledgedMinor <= 0 || input.perParticipantCapMinor <= 0) throw new Error('Enter a pledge and a per-person cap greater than zero.')
  if (input.unlocks.length === 0) throw new Error('Add at least one eligible game milestone.')
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) throw new Error('The sponsorship must end after it starts.')
  const commitment: SponsorCommitment = { ...input, id: `spn_${crypto.randomUUID()}`, createdAt: new Date().toISOString() }
  store.sponsorCommitments.push(commitment)
  if (!campaign.sponsorEnabled) {
    const index = store.campaigns.findIndex((item) => item.id === campaign.id)
    store.campaigns[index] = { ...campaign, sponsorEnabled: true }
  }
  saveStore(store)
  return commitment
}

/**
 * Records one eligible game action for sponsor-funded play. The same person cannot unlock the same
 * milestone again, including after a new board. Returns the pending allocation, or null.
 */
export function unlockSponsorMilestone(campaignId: string, participantId: string): SponsorAllocation | null {
  if (!participantId) return null
  const offer = sponsorOffer(campaignId, participantId)
  if (!offer?.next || !offer.dateOpen) return null
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === campaignId)
  if (!campaign) return null
  const open = Date.parse(campaign.opensAt)
  const close = Date.parse(campaign.closesAt)
  const now = Date.now()
  if (campaign.manualClosedAt || (Number.isFinite(open) && now < open) || (Number.isFinite(close) && now > close)) return null
  const allocation: SponsorAllocation = {
    id: `spa_${crypto.randomUUID()}`,
    commitmentId: offer.commitment.id,
    campaignId,
    organizationId: offer.commitment.organizationId,
    participantId,
    unlockId: offer.next.unlock.id,
    amountMinor: offer.next.amountMinor,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  store.sponsorAllocations.push(allocation)
  saveStore(store)
  return allocation
}

/** Confirms simulated sponsor funds once. Does not add anything to a supporter checkout. */
export function confirmSponsorAllocation(allocationId: string): SponsorAllocation {
  const store = loadStore()
  const index = store.sponsorAllocations.findIndex((item) => item.id === allocationId)
  if (index < 0) throw new Error('That sponsor allocation is no longer here.')
  const current = store.sponsorAllocations[index]
  const org = findOrganization(current.organizationId)
  if (!org) throw new Error('Organization not found.')
  assertCan('org.manageSponsors', { organization: org }, 'Only an Organization Admin can confirm sponsor funds.')
  if (current.status === 'confirmed') return current
  const contributionId = `spn_gift_${current.id}`
  if (!store.contributions.some((item) => item.id === contributionId)) {
    const major = Math.round(current.amountMinor / 100)
    if (major <= 0) throw new Error('This reward is too small to add to the campaign total.')
    store.contributions.push({
      id: contributionId,
      campaignId: current.campaignId,
      amount: major,
      method: 'direct',
      reference: `SPONSOR-${store.contributions.length + 1}`,
      createdAt: new Date().toISOString(),
      status: 'success',
      detail: `Simulated sponsor funds (${current.unlockId})`,
      source: 'sponsor',
    })
  }
  const confirmed: SponsorAllocation = { ...current, status: 'confirmed', confirmedAt: current.confirmedAt ?? new Date().toISOString() }
  store.sponsorAllocations[index] = confirmed
  saveStore(store)
  trackJourney('contribution_confirmed', { campaignId: current.campaignId, mode: 'sponsor' })
  return confirmed
}

export function actingParticipantId(): string {
  return currentUser()?.id ?? 'guest'
}
