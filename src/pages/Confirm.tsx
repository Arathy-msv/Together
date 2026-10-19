import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoverArt, Icon, ScenicBand } from '../components/illustrations.tsx'
import { useCampaignView } from '../hooks/useDemoStore.ts'
import { addContribution, toView } from '../lib/campaigns.ts'
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
      setError('The garden game is not open on this campaign.')
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
    const saved = addContribution({
      id: current.token,
      campaignId: campaign.id,
      amount: current.amount,
      method: current.method,
      detail: current.detail,
    })
    clearPending()
    navigate(`/campaigns/${campaign.id}/success/${saved.id}`)
  }

  return (
    <div className="page confirm-page">
      <header className="confirm-head">
        <h1>Confirm your demo contribution</h1>
        <p>No payment details needed. No money will be collected.</p>
      </header>
      <section className="confirm-card">
        <div className="confirm-story">
          <CoverArt id={campaign.coverImageId} />
          <h2>{campaign.title}</h2>
          <p className="organizer">{campaign.organizerName}</p>
          <p>{campaign.description}</p>
        </div>
        <div className="confirm-summary">
          {pending ? (
            <>
              <dl>
                <div>
                  <dt>Contribution</dt>
                  <dd>{formatINR(pending.amount)}</dd>
                </div>
                <div>
                  <dt>Total simulated amount</dt>
                  <dd>{formatINR(pending.amount)}</dd>
                </div>
                <div>
                  <dt>Payment method</dt>
                  <dd>{pending.method === 'game' ? 'Game-based giving (illustrative)' : 'Direct donation (illustrative)'}</dd>
                </div>
              </dl>
              {pending.detail ? <p className="hint">{pending.detail}</p> : null}
              <div className="confirm-note">
                <Icon name="check" size={16} />
                Confirm once to add this contribution to demo progress.
              </div>
              {error ? <p className="field-error">{error}</p> : null}
              <button type="button" className="btn btn-primary btn-block" disabled={submitting} onClick={confirm}>
                {submitting ? 'Saving demo contribution…' : `Confirm simulated contribution — ${formatINR(pending.amount)}`}
                {submitting ? null : <Icon name="arrow" size={16} />}
              </button>
              <button
                type="button"
                className="text-button center-button"
                onClick={() => navigate(pending.method === 'game' ? `/campaigns/${campaign.id}/play` : `/campaigns/${campaign.id}`)}
              >
                Cancel and return
              </button>
              <div className="presenter-row">
                <span>For presenters (optional)</span>
                <button type="button" className="fail-button" onClick={() => setError('This simulated payment did not go through. No demo progress was updated.')}>
                  Simulate failed payment
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Nothing is waiting to confirm</h2>
              <p>Choose an amount on the campaign page. If you already confirmed, that simulated contribution is already included in the campaign progress.</p>
              <Link to={`/campaigns/${campaign.id}`} className="btn btn-primary">
                Back to campaign
              </Link>
            </div>
          )}
        </div>
      </section>
      <ScenicBand />
    </div>
  )
}
