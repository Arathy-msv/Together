import { canUseFeature, campaignNeedsApproval } from './features.ts'
import { loadOrganizations } from './orgStorage.ts'
import { loadStore, saveStore } from './storage.ts'
import type { Campaign, CampaignForm, Organization } from './types.ts'
import { formToCampaign } from './wizard.ts'

/** Rejects a feature action when the organization cannot use it. */
export function assertCanUseFeature(org: Organization, key: Parameters<typeof canUseFeature>[1]): void {
  if (!canUseFeature(org, key)) {
    throw new Error(`“${key}” is not enabled for this organization.`)
  }
}

export function organizationForCampaign(campaign: Pick<Campaign, 'organizationId'>): Organization | null {
  return loadOrganizations().find((item) => item.id === campaign.organizationId) ?? null
}

/** Publish, or submit for review when reviewApproval is on. */
export function publishWithPolicy(campaign: Campaign, plan: { title: string; due: string }[] = []): { mode: 'published' | 'pending_review' } {
  const org = organizationForCampaign(campaign)
  if (!org) throw new Error('Organization not found.')
  if (campaign.sponsorEnabled) assertCanUseFeature(org, 'sponsorPlay')
  if (campaign.nextUpdateAt) assertCanUseFeature(org, 'updateCommitments')

  let next = { ...campaign, isDraft: false as boolean | undefined }
  if (campaignNeedsApproval(org) && campaign.approvalStatus !== 'approved') {
    next = { ...next, approvalStatus: 'pending_review', isDraft: true }
    writeCampaign(next, plan)
    return { mode: 'pending_review' }
  }
  next = { ...next, approvalStatus: campaignNeedsApproval(org) ? 'approved' : campaign.approvalStatus, isDraft: false }
  writeCampaign(next, plan)
  return { mode: 'published' }
}

function writeCampaign(campaign: Campaign, plan: { title: string; due: string }[]): void {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaign.id)
  if (index >= 0) store.campaigns[index] = campaign
  else store.campaigns.unshift(campaign)
  const now = new Date().toISOString()
  const hasMilestones = store.milestones.some((milestone) => milestone.campaignId === campaign.id)
  if (!hasMilestones) {
    plan
      .filter((item) => item.title.trim())
      .forEach((item, order) => {
        const due = item.due && !Number.isNaN(Date.parse(item.due)) ? new Date(item.due).toISOString() : campaign.closesAt
        store.milestones.push({
          id: `ms_${crypto.randomUUID()}`,
          campaignId: campaign.id,
          title: item.title.trim().slice(0, 120),
          description: '',
          dueDate: due,
          status: 'planned',
          progressNote: '',
          order: order + 1,
          createdAt: now,
          updatedAt: now,
        })
      })
  }
  saveStore(store)
}

export function setApprovalStatus(campaignId: string, status: 'approved' | 'rejected' | 'draft', note = ''): void {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === campaignId)
  if (!campaign) return
  const org = organizationForCampaign(campaign)
  if (!org || !canUseFeature(org, 'reviewApproval')) throw new Error('Review and approval is not enabled.')
  campaign.approvalStatus = status
  campaign.approvalNote = note.slice(0, 400) || undefined
  if (status === 'approved') campaign.isDraft = false
  if (status === 'rejected' || status === 'draft') campaign.isDraft = true
  saveStore(store)
}

export function duplicateCampaign(source: Campaign): Campaign {
  const org = organizationForCampaign(source)
  if (!org) throw new Error('Organization not found.')
  assertCanUseFeature(org, 'campaignDuplication')
  const copy: Campaign = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (copy)`.slice(0, 80),
    createdAt: new Date().toISOString(),
    isDraft: true,
    manualClosedAt: undefined,
    approvalStatus: campaignNeedsApproval(org) ? 'draft' : undefined,
    approvalNote: undefined,
    finalReport: undefined,
  }
  const store = loadStore()
  store.campaigns.unshift(copy)
  saveStore(store)
  return copy
}

export function exportOrganizationRecords(org: Organization): string {
  assertCanUseFeature(org, 'recordExports')
  const store = loadStore()
  const campaigns = store.campaigns.filter((item) => item.organizationId === org.id)
  const ids = new Set(campaigns.map((item) => item.id))
  const payload = {
    exportedAt: new Date().toISOString(),
    organizationId: org.id,
    organizationName: org.name,
    note: 'Demo export from this browser only. Not a bank statement.',
    campaigns,
    contributions: store.contributions.filter((item) => ids.has(item.campaignId)),
    expenses: store.expenses.filter((item) => ids.has(item.campaignId)),
    milestones: store.milestones.filter((item) => ids.has(item.campaignId)),
    updates: store.campaignUpdates.filter((item) => ids.has(item.campaignId)),
  }
  return JSON.stringify(payload, null, 2)
}

/** Strip feature fields the organization cannot use before save. */
export function sanitizeFormForOrg(form: CampaignForm, org: Organization): CampaignForm {
  return {
    ...form,
    sponsorEnabled: canUseFeature(org, 'sponsorPlay') ? form.sponsorEnabled : false,
    nextUpdateAt: canUseFeature(org, 'updateCommitments') ? form.nextUpdateAt : '',
  }
}

export function formCampaignForOrg(form: CampaignForm, org: Organization, options: { isDraft: boolean; existing?: Campaign }): Campaign {
  const clean = sanitizeFormForOrg(form, org)
  return formToCampaign(clean, options)
}
