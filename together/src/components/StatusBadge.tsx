import { DELIVERY_LABEL, fundraisingState, FUNDRAISING_LABEL, statusText, type DeliveryState } from '../lib/lifecycle.ts'
import type { CampaignStatus, CampaignView } from '../lib/types.ts'

/** Stored lifecycle status. Prefer FundraisingBadge when a CampaignView is available. */
export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <i aria-hidden="true" />
      {statusText(status)}
    </span>
  )
}

/** Fundraising only: opens soon, accepting, goal reached, closed. Says nothing about delivery. */
export function FundraisingBadge({ view }: { view: Pick<CampaignView, 'status' | 'raised' | 'campaign'> }) {
  const state = fundraisingState(view)
  const tone = state === 'goal_reached' ? 'completed' : state === 'accepting' ? 'active' : state === 'opens_soon' ? 'scheduled' : state === 'closed' ? 'closed' : view.status
  return (
    <span className={`status-badge status-${tone}`}>
      <i aria-hidden="true" />
      {FUNDRAISING_LABEL[state]}
    </span>
  )
}

export function DeliveryBadge({ state }: { state: DeliveryState }) {
  return (
    <span className={`status-badge delivery-${state}`}>
      <i aria-hidden="true" />
      <span className="sr-only">Delivery: </span>
      {DELIVERY_LABEL[state]}
    </span>
  )
}
