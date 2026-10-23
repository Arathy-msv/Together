import { goalReached } from './campaigns.ts'
import type { Campaign, CampaignStatus, CampaignView, Milestone } from './types.ts'

/*
 * Three separate questions about a campaign, each with its own label:
 *   publication — is it public, in review, or approved and waiting to be published?
 *   fundraising — can people contribute right now, and has the target been met?
 *   delivery    — what has the organizer reported doing with the money?
 * Reaching the funding goal never says anything about delivery.
 */

export type PublicationState = 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'published'
export type FundraisingState = 'opens_soon' | 'accepting' | 'goal_reached' | 'closed' | 'not_public'
export type DeliveryState = 'not_started' | 'in_progress' | 'reported_complete'

export const PUBLICATION_LABEL: Record<PublicationState, string> = {
  draft: 'Draft',
  submitted: 'Submitted for review',
  changes_requested: 'Changes requested',
  approved: 'Approved · ready to publish',
  published: 'Published',
}

export const FUNDRAISING_LABEL: Record<FundraisingState, string> = {
  opens_soon: 'Opens soon',
  accepting: 'Accepting contributions',
  goal_reached: 'Funding goal reached',
  closed: 'Fundraising closed',
  not_public: 'Not public yet',
}

export const DELIVERY_LABEL: Record<DeliveryState, string> = {
  not_started: 'Delivery not started',
  in_progress: 'Delivery in progress',
  reported_complete: 'Organizer-reported complete',
}

/** Publication of the campaign itself. A live campaign with proposed changes is still `published`. */
export function publicationState(campaign: Campaign): PublicationState {
  const revision = campaign.pendingRevision
  if (!campaign.isDraft) return 'published'
  if (revision?.status === 'pending') return 'submitted'
  if (revision?.status === 'approved') return 'approved'
  if (revision?.status === 'rejected') return 'changes_requested'
  return 'draft'
}

/** Proposed changes to a live campaign, separate from the public version. */
export function revisionState(campaign: Campaign): PublicationState | null {
  if (campaign.isDraft || !campaign.pendingRevision) return null
  return publicationState({ ...campaign, isDraft: true })
}

/**
 * Fundraising label derived from the stored lifecycle status. `completed` (closed because the goal
 * was met) and an open campaign that has met its goal both read as “Funding goal reached”.
 */
export function fundraisingState(view: Pick<CampaignView, 'status' | 'raised' | 'campaign'>): FundraisingState {
  switch (view.status) {
    case 'draft':
    case 'pending_review':
    case 'approved':
      return 'not_public'
    case 'scheduled':
      return 'opens_soon'
    case 'completed':
      return 'goal_reached'
    case 'closed':
      return 'closed'
    default:
      return goalReached(view.raised, view.campaign.goalAmount) ? 'goal_reached' : 'accepting'
  }
}

/** Label for a stored lifecycle status, worded for whoever is looking. */
export function statusText(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return PUBLICATION_LABEL.draft
    case 'pending_review':
      return PUBLICATION_LABEL.submitted
    case 'approved':
      return PUBLICATION_LABEL.approved
    case 'scheduled':
      return FUNDRAISING_LABEL.opens_soon
    case 'completed':
      return FUNDRAISING_LABEL.goal_reached
    case 'closed':
      return FUNDRAISING_LABEL.closed
    default:
      return FUNDRAISING_LABEL.accepting
  }
}

/** Delivery is organizer-reported and counted in activities, not as a share of impact. */
export function deliveryState(milestones: Pick<Milestone, 'status'>[]): DeliveryState {
  if (milestones.length === 0) return 'not_started'
  if (milestones.every((item) => item.status === 'reported_complete')) return 'reported_complete'
  if (milestones.some((item) => item.status !== 'planned')) return 'in_progress'
  return 'not_started'
}

/** True when the campaign has met its target, whether or not it still accepts contributions. */
export function isFunded(view: Pick<CampaignView, 'status' | 'raised' | 'campaign'>): boolean {
  return fundraisingState(view) === 'goal_reached'
}
