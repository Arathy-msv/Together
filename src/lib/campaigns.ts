import { progressPercent } from './format.ts'
import { clearGameData } from './gameLedger.ts'
import { clearCampaignSession } from './pending.ts'
import { clearPlayers } from './players.ts'
import { loadStore, saveStore } from './storage.ts'
import type {
  Campaign,
  CampaignStatus,
  CampaignView,
  Contribution,
  ContributionMethod,
} from './types.ts'

export function raisedOf(campaignId: string, contributions: Contribution[]): number {
  return contributions
    .filter((contribution) => contribution.campaignId === campaignId && contribution.status === 'success')
    .reduce((sum, contribution) => sum + contribution.amount, 0)
}

export function supporterCount(campaignId: string, contributions: Contribution[]): number {
  return contributions.filter(
    (contribution) => contribution.campaignId === campaignId && contribution.status === 'success',
  ).length
}

export function statusOf(campaign: Campaign, contributions: Contribution[], now = Date.now()): CampaignStatus {
  if (campaign.isDraft) return 'draft'
  if (campaign.manualClosedAt) return 'closed'
  const open = Date.parse(campaign.opensAt)
  const close = Date.parse(campaign.closesAt)
  if (Number.isNaN(open) || Number.isNaN(close)) return 'closed'
  const raised = raisedOf(campaign.id, contributions)
  const goalMet = campaign.goalAmount > 0 && raised >= campaign.goalAmount
  if (now < open) return 'scheduled'
  if (now > close) return goalMet ? 'completed' : 'closed'
  if (campaign.autoCloseOnGoal && goalMet) return 'completed'
  return 'active'
}

export function toView(campaign: Campaign, contributions: Contribution[], now = Date.now()): CampaignView {
  const raised = raisedOf(campaign.id, contributions)
  const status = statusOf(campaign, contributions, now)
  return {
    campaign,
    raised,
    supporters: supporterCount(campaign.id, contributions),
    status,
    percent: progressPercent(raised, campaign.goalAmount),
    canGive: status === 'active',
  }
}

export function getCampaign(id: string): Campaign | undefined {
  return loadStore().campaigns.find((campaign) => campaign.id === id)
}

export function upsertCampaign(campaign: Campaign): void {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaign.id)
  if (index >= 0) store.campaigns[index] = campaign
  else store.campaigns.unshift(campaign)
  saveStore(store)
}

export function removeCampaign(id: string): void {
  const store = loadStore()
  store.campaigns = store.campaigns.filter((campaign) => campaign.id !== id)
  store.contributions = store.contributions.filter((contribution) => contribution.campaignId !== id)
  saveStore(store)
}

/** Removes a campaign and its contributions, then clears related session data. */
export function deleteCampaign(id: string): void {
  removeCampaign(id)
  clearCampaignSession(id)
  clearGameData(id)
  clearPlayers(id)
}

export function closeCampaign(id: string): void {
  const campaign = getCampaign(id)
  if (!campaign || campaign.isDraft || campaign.manualClosedAt) return
  upsertCampaign({ ...campaign, manualClosedAt: new Date().toISOString(), isDraft: false })
}

export interface NewContribution {
  id: string
  campaignId: string
  amount: number
  method: ContributionMethod
  detail?: string
  playerId?: string
  playerName?: string
  referralCode?: string
}

function nextReference(contributions: Contribution[]): string {
  let max = 1041
  for (const contribution of contributions) {
    const match = /^DEMO-(\d+)$/.exec(contribution.reference)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `DEMO-${max + 1}`
}

export function addContribution(input: NewContribution): Contribution {
  const store = loadStore()
  const existing = store.contributions.find((contribution) => contribution.id === input.id)
  if (existing) return existing
  const contribution: Contribution = {
    id: input.id,
    campaignId: input.campaignId,
    amount: input.amount,
    method: input.method,
    detail: input.detail,
    playerId: input.playerId,
    playerName: input.playerName,
    referralCode: input.referralCode,
    reference: nextReference(store.contributions),
    createdAt: new Date().toISOString(),
    status: 'success',
  }
  store.contributions.push(contribution)
  saveStore(store)
  return contribution
}

export function findContribution(id: string): Contribution | undefined {
  return loadStore().contributions.find((contribution) => contribution.id === id)
}

export function makeAccessCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

export function campaignSharePath(id: string): string {
  return `/campaigns/${id}`
}

/** Campaign story and direct giving. The plain campaign link opens the game when one is enabled. */
export function campaignDetailsPath(id: string): string {
  return `/campaigns/${id}?view=details`
}
