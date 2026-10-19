import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { useCampaignView } from '../hooks/useDemoStore.ts'
import { addContribution, toView } from '../lib/campaigns.ts'
import { gameMeta } from '../lib/games.ts'
import { formatINR } from '../lib/format.ts'
import { clearPending, getPending } from '../lib/pending.ts'
import { loadStore } from '../lib/storage.ts'
import { NotFoundPage } from './NotFound.tsx'

export function ConfirmPage() {
  const { id = '' } = useParams()
  const view = useCampaignView(id)
  const navigate = useNavigate()
  const pending = getPending(id)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lock = useRef(false)

  useEffect(() => {
    document.title = 'Confirm your demo contribution — Together'
  }, [])

  if (!view) return <NotFoundPage />
  const { campaign } = view

  function confirm() {
    if (lock.current) return
    const current = getPending(campaign.id)
    if (!current) {
      setError('Choose an amount on the campaign page before confirming.')
      return
    }
    const fresh = toView(campaign, loadStore().contributions)
    if (!fresh.canGive) {
      setError('This campaign is not accepting contributions right now. Demo progress was not updated.')
      return
    }
    if (current.method === 'direct' && !campaign.participation.direct) {
      setError('Direct giving is not open on this campaign.')
      return
    }
    if (current.method === 'game' && !campaign.participation.game) {
      setError('Game-based giving is not open on this campaign.')
      return
    }
    if (campaign.donationMode === 'fixed' && !campaign.fixedAmounts.includes(current.amount)) {
      setError('That amount is not one of the suggested amounts for this campaign.')
      return
    }
    if (!Number.isInteger(current.amount) || current.amount <= 0 || current.amount > 10_000_000) {
      setError('Enter a whole amount greater than zero.')
      return
    }
    lock.current = true
    setSubmitting(true)
    try {
      const saved = addContribution({
        id: current.token,
        campaignId: campaign.id,
        amount: current.amount,
        method: current.method,
        detail: current.detail,
      })
      clearPending()
      navigate(`/campaigns/${campaign.id}/success/${saved.id}`)
    } catch (problem) {
      lock.current = false
      setSubmitting(false)
      setError(problem instanceof Error ? problem.message : 'The contribution could not be saved.')
    }
  }

  const backPath =
    pending?.method === 'game' ? `/campaigns/${campaign.id}/play/${campaign.gameType}` : `/campaigns/${campaign.id}`

  return (
    <div className="confirm-page-pro">
      <div className="confirm-bar">
        <Link to={backPath} className="back-link">
          <Icon name="back" size={16} />
          Back to campaign
        </Link>
      </div>
      <div className="container narrow">
        <header className="center-head">
          <h1>Confirm your contribution</h1>
          <p className="muted">
            You’re about to make a simulated contribution to support this campaign.
            <br />
            Please review the details below and confirm.
          </p>
        </header>
        {pending ? (
          <>
            <section className="panel confirm-summary-card">
              <div className="confirm-campaign">
                <CampaignCover campaign={campaign} />
                <div>
                  <span className="eyebrow-label">Campaign</span>
                  <h2>{campaign.title}</h2>
                  <p className="muted small">{campaign.organizerName}</p>
                </div>
              </div>
              <div className="confirm-amount">
                <div className="money-row">
                  <span className="eyebrow-label">Contribution</span>
                  <span className="sim-pill">Simulated payment</span>
                </div>
                <strong className="amount-big">{formatINR(pending.amount)}</strong>
                <p className="muted small">
                  {pending.method === 'game' ? `Via ${gameMeta(campaign.gameType).name}` : 'Direct donation'}
                </p>
                <div className="money-row total">
                  <span>Total</span>
                  <strong>{formatINR(pending.amount)}</strong>
                </div>
              </div>
            </section>
            {pending.detail ? <p className="muted small center">{pending.detail}</p> : null}
            {error ? (
              <div className="notice error" role="alert">
                {error}
              </div>
            ) : null}
            <button type="button" className="btn btn-primary btn-block btn-xl" disabled={submitting} onClick={confirm}>
              {submitting ? 'Saving…' : `Confirm demo contribution — ${formatINR(pending.amount)}`}
            </button>
            <button type="button" className="link-button center-block" onClick={() => navigate(backPath)}>
              Cancel
            </button>
            <div className="notice warn compact center-notice">
              <Icon name="info" size={18} />
              No payment details required. No payment will be collected.
            </div>
            <div className="presenter-row-pro">
              <span className="muted small">For presenters</span>
              <button
                type="button"
                className="btn btn-outline btn-sm danger-outline"
                onClick={() => setError('This simulated payment did not go through. No progress was updated.')}
              >
                Simulate failed payment
              </button>
            </div>
          </>
        ) : (
          <div className="panel empty">
            <h2>Nothing is waiting to confirm</h2>
            <p className="muted">
              Choose an amount on the campaign page. If you already confirmed, that contribution is already included.
            </p>
            <Link to={`/campaigns/${campaign.id}`} className="btn btn-primary">
              Back to campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
