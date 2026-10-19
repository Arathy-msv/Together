import { Link } from 'react-router-dom'
import { formatINR } from '../lib/format.ts'
import type { CampaignView } from '../lib/types.ts'
import { CampaignCover } from './CampaignImage.tsx'
import { ProgressBar } from './ProgressBar.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export function CampaignCard({ view, compact = false }: { view: CampaignView; compact?: boolean }) {
  const { campaign, raised, percent, supporters, status } = view
  if (compact) {
    return (
      <Link to={`/campaigns/${campaign.id}`} className="feature-campaign">
        <CampaignCover campaign={campaign} />
        <div>
          <h3>{campaign.title}</h3>
          {status === 'scheduled' ? (
            <StatusBadge status={status} />
          ) : (
            <>
              <div className="money-row">
                <span>
                  <strong>{formatINR(raised)}</strong> of {formatINR(campaign.goalAmount)}
                </span>
                <span>{percent}%</span>
              </div>
              <ProgressBar value={percent} />
            </>
          )}
        </div>
      </Link>
    )
  }
  return (
    <Link to={`/campaigns/${campaign.id}`} className="campaign-tile">
      <div className="campaign-tile-media">
        <CampaignCover campaign={campaign} />
        <StatusBadge status={status} />
      </div>
      <div className="campaign-tile-body">
        <p className="muted small">{campaign.organizerName}</p>
        <h3>{campaign.title}</h3>
        <div className="money-row">
          <span>
            <strong>{formatINR(raised)}</strong> of {formatINR(campaign.goalAmount)}
          </span>
          <span>{percent}%</span>
        </div>
        <ProgressBar value={percent} muted={status === 'scheduled' || status === 'closed'} />
        <p className="muted small">{supporters === 1 ? '1 contribution' : `${supporters} contributions`}</p>
      </div>
    </Link>
  )
}
