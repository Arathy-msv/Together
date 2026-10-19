import { Link } from 'react-router-dom'
import { formatINR } from '../lib/format.ts'
import type { CampaignView } from '../lib/types.ts'
import { CoverArt } from './illustrations.tsx'
import { ProgressBar } from './ProgressBar.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export function CampaignCard({ view }: { view: CampaignView }) {
  const { campaign, raised, percent, supporters, status } = view
  return (
    <Link to={`/campaigns/${campaign.id}`} className="campaign-card">
      <div className="campaign-card-media">
        <CoverArt id={campaign.coverImageId} />
        <StatusBadge status={status} />
      </div>
      <div className="campaign-card-body">
        <h3>{campaign.title}</h3>
        <p className="organizer">{campaign.organizerName}</p>
        {status === 'scheduled' ? (
          <p className="scheduled-note">Opens {new Date(campaign.opensAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
        ) : (
          <div className="raised-line">
            <span>
              <strong>{formatINR(raised)}</strong> raised of {formatINR(campaign.goalAmount)}
            </span>
            <b>{percent}%</b>
          </div>
        )}
        <ProgressBar value={percent} muted={status === 'scheduled' || status === 'closed'} />
        <div className="card-foot">
          <span>{supporters} demo contributions</span>
          <span>Demo data</span>
        </div>
      </div>
    </Link>
  )
}
