import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { formatINR } from '../lib/format.ts'
import { NotFoundPage } from './NotFound.tsx'

export function SuccessPage() {
  const { id = '', contributionId = '' } = useParams()
  const view = useCampaignView(id)
  const store = useDemoStore()
  const contribution = store.contributions.find((item) => item.id === contributionId && item.campaignId === id)

  useEffect(() => {
    document.title = 'Contribution successful — Together'
  }, [])

  if (!view) return <NotFoundPage />
  if (!contribution) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>We couldn’t find that contribution</h1>
          <p className="muted">It may belong to another browser, or the demo data was reset.</p>
          <Link to={`/campaigns/${view.campaign.id}`} className="btn btn-primary">
            Back to campaign
          </Link>
        </div>
      </div>
    )
  }

  const exactPercent = view.campaign.goalAmount > 0 ? Math.min(100, (view.raised / view.campaign.goalAmount) * 100) : 0

  return (
    <div className="container narrow page-pad success">
      <div className="success-check">
        <Icon name="check" size={40} />
      </div>
      <h1 className="center">Thank you for supporting {view.campaign.title}.</h1>
      <p className="center">
        <span className="success-pill">Contribution successful</span>
      </p>
      <section className="panel receipt-card">
        <div className="receipt-top">
          <CampaignCover campaign={view.campaign} />
          <div>
            <span className="eyebrow-label">Campaign</span>
            <h2>{view.campaign.title}</h2>
            <div className="receipt-facts">
              <div>
                <span className="eyebrow-label">Amount</span>
                <strong>{formatINR(contribution.amount)}</strong>
              </div>
              <div>
                <span className="eyebrow-label">Reference</span>
                <strong>{contribution.reference}</strong>
              </div>
            </div>
          </div>
        </div>
        {contribution.detail ? <p className="muted small">{contribution.detail}</p> : null}
        <div className="divider" />
        <div className="money-row big">
          <span>
            <strong>{formatINR(view.raised)}</strong> of {formatINR(view.campaign.goalAmount)}
          </span>
          <strong>{Number.isInteger(exactPercent) ? exactPercent : exactPercent.toFixed(1)}%</strong>
        </div>
        <ProgressBar value={exactPercent} tone="gold" />
        <p className="muted small">{view.supporters === 1 ? '1 simulated contribution' : `${view.supporters} simulated contributions`}</p>
      </section>
      <div className="center-actions">
        <Link to={`/campaigns/${view.campaign.id}`} className="btn btn-primary btn-lg">
          Back to campaign
        </Link>
        <Link to="/" className="btn btn-outline btn-lg">
          Return home
        </Link>
      </div>
      <p className="muted small center">Saved in this browser. No real money was collected.</p>
    </div>
  )
}
