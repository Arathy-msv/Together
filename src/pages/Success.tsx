import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CoverArt, Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { formatINR, plural } from '../lib/format.ts'
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
      <div className="page narrow empty-state">
        <h1>We could not find that demo contribution</h1>
        <p>It may belong to another browser, or the demo data was reset.</p>
        <Link to={`/campaigns/${view.campaign.id}`} className="btn btn-primary">
          Back to campaign
        </Link>
      </div>
    )
  }

  return (
    <div className="page success-page">
      <div className="success-layout">
        <div>
          <p className="eyebrow">Contribution successful</p>
          <h1>Thank you for helping this campaign grow.</h1>
          <div className="success-callout">
            <Icon name="check" />
            <div>
              <strong>Simulated contribution successful</strong>
              <p>Your support helps the demo progress bar move. No real money was collected.</p>
            </div>
          </div>
          <article className="receipt">
            <CoverArt id={view.campaign.coverImageId} />
            <div>
              <p className="eyebrow">Campaign</p>
              <h2>{view.campaign.title}</h2>
              <div className="receipt-meta">
                <span>
                  Contribution amount
                  <strong>{formatINR(contribution.amount)}</strong>
                </span>
                <span>
                  Reference number
                  <strong>{contribution.reference}</strong>
                </span>
              </div>
              {contribution.detail ? <p className="hint">{contribution.detail}</p> : null}
            </div>
          </article>
          <section className="progress-block">
            <div className="section-head">
              <h2>Campaign progress (demo)</h2>
              <span>{plural(view.supporters, 'successful demo contribution')}</span>
            </div>
            <ProgressBar value={view.percent} />
            <div className="raised-line">
              <strong>
                {formatINR(view.raised)} of {formatINR(view.campaign.goalAmount)}
              </strong>
              <span>{view.percent}%</span>
            </div>
            <p className="hint">
              {plural(view.supporters, 'person has', 'people have')} contributed to this campaign in the demo.
            </p>
          </section>
          <div className="success-actions">
            <Link to={`/campaigns/${view.campaign.id}`} className="btn btn-primary">
              <Icon name="back" size={16} />
              Back to campaign
            </Link>
            <Link to="/" className="btn btn-secondary">
              <Icon name="home" size={16} />
              Return home
            </Link>
          </div>
          <p className="fine-print">Saved in this browser. No real money was collected.</p>
        </div>
        <div className="success-art">
          <CoverArt id="readers" label="Children reading together outdoors" />
          <div className="soon-grid">
            <article className="soon-card">
              <Icon name="game" />
              <h3>Try another game</h3>
              <p>New ways to support this campaign are on the way.</p>
              <span className="coming-badge">Coming soon</span>
            </article>
            <article className="soon-card">
              <Icon name="gift" />
              <h3>Voucher rewards</h3>
              <p>Thank-you rewards for contributors will be available here soon.</p>
              <span className="coming-badge">Coming soon</span>
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}
