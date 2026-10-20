import { statusOf } from './campaigns.ts'
import { formatDateTime } from './format.ts'
import type { Campaign, Contribution } from './types.ts'

export interface Availability {
  ok: boolean
  reason: string
}

/** Checks opening time, closing time, manual closure and automatic goal closure right now. */
export function contributionAvailability(
  campaign: Campaign,
  contributions: Contribution[],
  now = Date.now(),
): Availability {
  const status = statusOf(campaign, contributions, now)
  switch (status) {
    case 'active':
      return { ok: true, reason: '' }
    case 'draft':
      return { ok: false, reason: 'This campaign is not published yet, so it cannot accept contributions.' }
    case 'scheduled':
      return { ok: false, reason: `This campaign opens on ${formatDateTime(campaign.opensAt)}. Nothing has been donated.` }
    case 'completed':
      return {
        ok: false,
        reason: 'This campaign reached its goal and closed to new contributions. Nothing has been donated.',
      }
    case 'closed':
      return {
        ok: false,
        reason: campaign.manualClosedAt
          ? 'The organiser closed this campaign. Nothing has been donated.'
          : `This campaign closed on ${formatDateTime(campaign.closesAt)}. Nothing has been donated.`,
      }
    default:
      return { ok: false, reason: 'This campaign is not accepting contributions right now.' }
  }
}
