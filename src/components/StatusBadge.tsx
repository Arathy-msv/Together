import { statusLabel } from '../lib/format.ts'
import type { CampaignStatus } from '../lib/types.ts'

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <i />
      {statusLabel(status)}
    </span>
  )
}
