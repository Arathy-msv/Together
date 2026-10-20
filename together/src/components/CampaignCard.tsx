import { Link } from 'react-router-dom'
import { campaignSharePath } from '../lib/campaigns.ts'
import { formatINR } from '../lib/format.ts'
import { gameMeta } from '../lib/games.ts'
import type { CampaignView } from '../lib/types.ts'
import { CampaignCover } from './CampaignImage.tsx'
import { ProgressBar } from './ProgressBar.tsx'
import { StatusBadge } from './StatusBadge.tsx'
import { useOrgBase } from './org/OrgContext.tsx'

export function CampaignCard({ view, compact = false }: { view: CampaignView; compact?: boolean }) {
  const { campaign, raised, percent, supporters, status } = view
  const base = useOrgBase()
  const to = campaignSharePath(campaign.id, base)
  if (compact) {
    return (
      <Link to={to} className="feature-campaign">
        <CampaignCover campaign={campaign} />
        <div>
          <h3>{campaign.title}</h3>
          {status === 'scheduled' ? (
            <StatusBadge status={status} />
          ) : (
            <>
              <div className="money-row">
                <span>
                  <strong>{formatINR(raised, campaign.currency)}</strong> of {formatINR(campaign.goalAmount, campaign.currency)}
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
    <Link to={to} className="campaign-tile">
      <div className="campaign-tile-media">
        <CampaignCover campaign={campaign} />
        <StatusBadge status={status} />
      </div>
      <div className="campaign-tile-body">
        <p className="muted small">
          {campaign.organizerName}
          {campaign.participation.game ? ` · ${gameMeta(campaign.gameType).name}` : ''}
        </p>
        <h3>{campaign.title}</h3>
        <div className="money-row">
          <span>
            <strong>{formatINR(raised, campaign.currency)}</strong> of {formatINR(campaign.goalAmount, campaign.currency)}
          </span>
          <span>{percent}%</span>
        </div>
        <ProgressBar value={percent} muted={status === 'scheduled' || status === 'closed'} />
        <p className="muted small">{supporters === 1 ? '1 contribution' : `${supporters} contributions`}</p>
      </div>
    </Link>
  )
}
