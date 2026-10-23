import { canUseFeature, campaignNeedsApproval } from './features.ts'
import { loadOrganizations } from './orgStorage.ts'
import { loadStore, saveStore } from './storage.ts'
import { addCampaignToScope, membership, orgAdmins, recordAudit } from './identity.ts'
import { assertCan, canCurrent, PermissionError } from './permissions.ts'
import type { Campaign, CampaignForm, CampaignRevision, CampaignSnapshot, Organization } from './types.ts'
import { eligibleOffersForCampaign, loadVoucherStore } from './vouchers.ts'
import { formToCampaign, planMilestoneId } from './wizard.ts'

/** Rejects a feature action when the organization cannot use it. */
export function assertCanUseFeature(org: Organization, key: Parameters<typeof canUseFeature>[1]): void {
  if (!canUseFeature(org, key)) {
    throw new Error(`“${key}” is not enabled for this organization.`)
  }
}

export function organizationForCampaign(campaign: Pick<Campaign, 'organizationId'>): Organization | null {
  return loadOrganizations().find((item) => item.id === campaign.organizationId) ?? null
}

export interface PublishResult {
  mode: 'published' | 'pending_review'
  /** False when no Organization Admin other than the author can review this revision. */
  reviewerAvailable: boolean
}

function revisionId(): string {
  return `rev_${crypto.randomUUID().slice(0, 12)}`
}

/** Campaign fields that make up a reviewable revision. */
export function snapshotOf(campaign: Campaign): CampaignSnapshot {
  const { pendingRevision: _pending, revisionHistory: _history, ...snapshot } = campaign
  void _pending
  void _history
  return snapshot
}

/** Admins other than the author who could review a revision. */
export function eligibleReviewers(organizationId: string, authorId: string): string[] {
  return orgAdmins(organizationId).filter((id) => id !== authorId)
}

export const NO_REVIEWER_MESSAGE =
  'No other Organization Admin can review this revision. Ask an Organization Admin to assign another admin under Members — revisions are never approved automatically.'

/**
 * Publish, or submit a revision for review when the organization requires approval. When a
 * published campaign is revised, supporters keep seeing the last published version until an
 * admin who did not author the revision approves it.
 */
export function publishWithPolicy(campaign: Campaign, plan: { id?: string; title: string; due: string }[] = []): PublishResult {
  const org = organizationForCampaign(campaign)
  if (!org) throw new Error('Organization not found.')
  if (campaign.sponsorEnabled) assertCanUseFeature(org, 'sponsorPlay')
  if (campaign.nextUpdateAt) assertCanUseFeature(org, 'updateCommitments')

  const existing = loadStore().campaigns.find((item) => item.id === campaign.id)
  if (existing && existing.organizationId !== org.id) throw new PermissionError('This campaign belongs to another organization.')
  const actor = existing
    ? assertCan('campaign.edit', { campaign: existing, organization: org }, 'You can only edit campaigns assigned to you.')
    : assertCan('campaign.create', { organization: org }, 'Only members of this organization can create campaigns.')
  if (!existing && membership(actor.id, org.id)?.role === 'campaign_organizer') addCampaignToScope(actor.id, org.id, campaign.id)

  const now = new Date().toISOString()
  const history = [...(existing?.revisionHistory ?? [])]
  const base: Campaign = {
    ...campaign,
    organizationId: org.id,
    createdBy: existing?.createdBy ?? actor.id,
    approvedRevisionId: existing?.approvedRevisionId,
  }

  if (campaignNeedsApproval(org)) {
    const id = revisionId()
    // A change after approval replaces the approved revision, so it needs review again.
    if (existing?.pendingRevision && existing.pendingRevision.status !== 'rejected') history.push({ revisionId: existing.pendingRevision.id, action: 'superseded', actorId: actor.id, at: now })
    history.push({ revisionId: id, action: 'submitted', actorId: actor.id, at: now })
    const pendingRevision: CampaignRevision = { id, authorId: actor.id, submittedAt: now, status: 'pending', snapshot: snapshotOf({ ...base, isDraft: false }) }
    const livePublished = existing && !existing.isDraft
    const record: Campaign = livePublished
      ? { ...existing, pendingRevision, revisionHistory: history }
      : { ...base, isDraft: true, approvalStatus: 'pending_review', pendingRevision, revisionHistory: history }
    writeCampaign(record, livePublished ? [] : plan)
    recordAudit('campaign.revision.submitted', { organizationId: org.id, targetId: campaign.id, detail: id })
    return { mode: 'pending_review', reviewerAvailable: eligibleReviewers(org.id, actor.id).length > 0 }
  }

  assertCan('campaign.publish', { campaign: base, organization: org }, 'Your organization requires an Organization Admin to publish this campaign.')
  history.push({ revisionId: revisionId(), action: 'published', actorId: actor.id, at: now })
  writeCampaign({ ...base, isDraft: false, pendingRevision: undefined, revisionHistory: history }, plan)
  recordAudit('campaign.published', { organizationId: org.id, targetId: campaign.id })
  return { mode: 'published', reviewerAvailable: true }
}

/** Fields that keep their live value when an approved revision is published (they are not part of review). */
const LIVE_FIELDS = ['manualClosedAt', 'finalReport', 'fundingNote', 'translations', 'demoVerification'] as const

/**
 * An Organization Admin approves or rejects one specific revision. Authors can never review their
 * own revision, and an approval never carries over to a later revision. Approval does not publish:
 * the approved revision waits for an explicit `publishApprovedRevision`.
 */
export function reviewRevision(campaignId: string, revisionIdToReview: string, decision: 'approve' | 'reject', note = ''): Campaign {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaignId)
  if (index < 0) throw new Error('Campaign not found.')
  const campaign = store.campaigns[index]
  const org = organizationForCampaign(campaign)
  if (!org) throw new Error('Organization not found.')
  const actor = assertCan('campaign.review', { campaign, organization: org }, 'Only an Organization Admin can review campaigns.')
  const revision = campaign.pendingRevision
  if (!revision || revision.status !== 'pending' || revision.id !== revisionIdToReview) {
    throw new Error('This revision is no longer waiting for review. Open the campaign again to review the latest submission.')
  }
  if (revision.authorId === actor.id) throw new PermissionError('You can’t review your own revision. Another Organization Admin must review it.')

  const now = new Date().toISOString()
  const reviewNote = note.trim().slice(0, 400) || undefined
  const history = [...(campaign.revisionHistory ?? []), { revisionId: revision.id, action: decision === 'approve' ? ('approved' as const) : ('rejected' as const), actorId: actor.id, at: now, note: reviewNote }]
  const next: Campaign =
    decision === 'approve'
      ? {
          ...campaign,
          approvalStatus: campaign.isDraft ? 'approved' : campaign.approvalStatus,
          approvalNote: reviewNote,
          approvedRevisionId: revision.id,
          pendingRevision: { ...revision, status: 'approved', reviewNote, reviewedBy: actor.id, reviewedAt: now },
          revisionHistory: history,
        }
      : {
          ...campaign,
          approvalStatus: campaign.isDraft ? 'rejected' : campaign.approvalStatus,
          approvalNote: reviewNote,
          pendingRevision: { ...revision, status: 'rejected', reviewNote, reviewedBy: actor.id, reviewedAt: now },
          revisionHistory: history,
        }
  store.campaigns[index] = next
  saveStore(store)
  recordAudit(decision === 'approve' ? 'campaign.revision.approved' : 'campaign.revision.rejected', { organizationId: org.id, targetId: campaignId, detail: revision.id })
  return next
}

/** Who may press Publish on an approved revision: any Organization Admin, or an organizer assigned to the campaign. */
export function canPublishApproved(campaign: Campaign, org: Organization | null = organizationForCampaign(campaign)): boolean {
  if (!org || campaign.pendingRevision?.status !== 'approved') return false
  return canCurrent('campaign.publish', { campaign, organization: org }) || canCurrent('campaign.submit', { campaign, organization: org })
}

/**
 * Makes an approved revision public. Exactly the reviewed snapshot is published; anything changed
 * after approval would have created a new revision that needs review again.
 */
export function publishApprovedRevision(campaignId: string, revisionIdToPublish: string): Campaign {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaignId)
  if (index < 0) throw new Error('Campaign not found.')
  const campaign = store.campaigns[index]
  const org = organizationForCampaign(campaign)
  if (!org) throw new Error('Organization not found.')
  const revision = campaign.pendingRevision
  if (!revision || revision.status !== 'approved' || revision.id !== revisionIdToPublish) {
    throw new Error('This revision is not approved for publishing. Open the campaign again to see its current review state.')
  }
  if (!canPublishApproved(campaign, org)) throw new PermissionError('Only an Organization Admin or the campaign’s organizer can publish this approved revision.')
  const actor = assertCan('campaign.view', { campaign, organization: org })
  const now = new Date().toISOString()
  const live: Partial<Campaign> = {}
  for (const key of LIVE_FIELDS) (live as Record<string, unknown>)[key] = campaign[key]
  const next: Campaign = {
    ...revision.snapshot,
    ...live,
    id: campaign.id,
    organizationId: campaign.organizationId,
    createdBy: campaign.createdBy ?? revision.snapshot.createdBy,
    createdAt: campaign.createdAt,
    isDraft: false,
    approvalStatus: 'approved',
    approvalNote: campaign.approvalNote,
    approvedRevisionId: revision.id,
    pendingRevision: undefined,
    revisionHistory: [...(campaign.revisionHistory ?? []), { revisionId: revision.id, action: 'published', actorId: actor.id, at: now }],
  }
  store.campaigns[index] = next
  saveStore(store)
  recordAudit('campaign.published', { organizationId: org.id, targetId: campaignId, detail: revision.id })
  return next
}

function writeCampaign(campaign: Campaign, plan: { id?: string; title: string; due: string }[]): void {
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
          id: planMilestoneId(item.id ?? crypto.randomUUID()),
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

export function duplicateCampaign(source: Campaign): Campaign {
  const org = organizationForCampaign(source)
  if (!org) throw new Error('Organization not found.')
  assertCanUseFeature(org, 'campaignDuplication')
  assertCan('campaign.view', { campaign: source, organization: org }, 'You can only reuse campaigns you can see.')
  const actor = assertCan('campaign.create', { organization: org })
  const copy: Campaign = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (copy)`.slice(0, 80),
    createdAt: new Date().toISOString(),
    createdBy: actor.id,
    isDraft: true,
    manualClosedAt: undefined,
    approvalStatus: campaignNeedsApproval(org) ? 'draft' : undefined,
    approvalNote: undefined,
    approvedRevisionId: undefined,
    pendingRevision: undefined,
    revisionHistory: [],
    finalReport: undefined,
  }
  const store = loadStore()
  store.campaigns.unshift(copy)
  saveStore(store)
  if (membership(actor.id, org.id)?.role === 'campaign_organizer') addCampaignToScope(actor.id, org.id, copy.id)
  recordAudit('campaign.duplicated', { organizationId: org.id, targetId: copy.id, detail: source.id })
  return copy
}

export function exportOrganizationRecords(org: Organization): string {
  const stored = loadOrganizations().find((item) => item.id === org.id)
  if (!stored) throw new Error('Organization not found.')
  assertCanUseFeature(stored, 'recordExports')
  assertCan('org.exportRecords', { organization: stored }, 'Only an Organization Admin can export records.')
  const store = loadStore()
  const campaigns = store.campaigns.filter((item) => item.organizationId === org.id)
  const ids = new Set(campaigns.map((item) => item.id))
  const payload = {
    exportedAt: new Date().toISOString(),
    organizationId: org.id,
    organizationName: org.name,
    note: 'Demo export from this browser only. Not a bank statement. Supporter profiles are not included.',
    campaigns: campaigns.map((item) => snapshotOf(item)),
    contributions: store.contributions.filter((item) => ids.has(item.campaignId)).map(({ supporterId: _owner, playerId: _player, ...rest }) => {
      void _owner
      void _player
      return rest
    }),
    expenses: store.expenses.filter((item) => ids.has(item.campaignId)),
    milestones: store.milestones.filter((item) => ids.has(item.campaignId)),
    updates: store.campaignUpdates.filter((item) => ids.has(item.campaignId)),
  }
  recordAudit('records.exported', { organizationId: org.id })
  return JSON.stringify(payload, null, 2)
}

/** Keeps only offers this organization can currently attach to a campaign in this currency. */
function eligiblePartnerOffers(form: CampaignForm, org: Organization): string[] {
  if (!canUseFeature(org, 'partnerVouchers') || form.partnerOfferIds.length === 0) return []
  const eligible = new Set(eligibleOffersForCampaign(org, loadVoucherStore(), { currency: form.currency, organizationId: org.id }).map((offer) => offer.id))
  return form.partnerOfferIds.filter((id) => eligible.has(id))
}

function sponsorSetByAdmin(form: CampaignForm): boolean {
  if (!form.id) return false
  return Boolean(loadStore().campaigns.find((item) => item.id === form.id)?.sponsorEnabled)
}

/** Strip feature fields the organization cannot use before save. */
export function sanitizeFormForOrg(form: CampaignForm, org: Organization): CampaignForm {
  return {
    ...form,
    // Sponsor confirmations are managed by Organization Admins; organizers keep what an admin set.
    sponsorEnabled:
      canUseFeature(org, 'sponsorPlay') && form.gameType === 'memory'
        ? canCurrent('org.manageSponsors', { organization: org })
          ? form.sponsorEnabled
          : sponsorSetByAdmin(form)
        : false,
    nextUpdateAt: canUseFeature(org, 'updateCommitments') ? form.nextUpdateAt : '',
    partnerOfferIds: eligiblePartnerOffers(form, org),
  }
}

export function formCampaignForOrg(form: CampaignForm, org: Organization, options: { isDraft: boolean; existing?: Campaign }): Campaign {
  const clean = sanitizeFormForOrg(form, org)
  // Offers already saved on this campaign stay recorded even while paused, so re-enabling restores them.
  const kept = (options.existing?.partnerOfferIds ?? []).filter((id) => form.partnerOfferIds.includes(id))
  clean.partnerOfferIds = [...new Set([...clean.partnerOfferIds, ...kept])]
  return formToCampaign(clean, options)
}
