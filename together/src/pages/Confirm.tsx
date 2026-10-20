import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { useOrgBase } from '../components/org/OrgContext.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { contributionAvailability } from '../lib/availability.ts'
import { addContribution, campaignDetailsPath, campaignPlayPath, findContribution, toView } from '../lib/campaigns.ts'
import {
  actionBreakdown,
  campaignGameSettings,
  contributionRuleMessage,
  formatPaise,
  gameConfig,
  PAISE_PER_RUPEE,
  returnToPending,
  selectedPaise,
  settleConfirmed,
  type GameLedger,
} from '../lib/gameContribution.ts'
import { readLedger, readProgress, writeLedger } from '../lib/gameLedger.ts'
import { parseWarmthProgress } from '../lib/warmth.ts'
import { gameMeta } from '../lib/games.ts'
import { formatINR } from '../lib/format.ts'
import { clearPending, getPending } from '../lib/pending.ts'
import { activeReferral, currentPlayer } from '../lib/players.ts'
import { loadStore } from '../lib/storage.ts'
import { checkoutReferral, snapshotReferral } from '../lib/attribution.ts'
import { ReferralCredit } from '../components/referral/ReferralCredit.tsx'
import type { CampaignView } from '../lib/types.ts'
import { NotFoundPage } from './NotFound.tsx'

export function ConfirmPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const sessionId = params.get('session')
  const view = useCampaignView(id)
  if (!view) return <NotFoundPage />
  if (sessionId) return <GameConfirm key={sessionId} view={view} sessionId={sessionId} />
  return <DirectConfirm view={view} />
}

/** Reads the ledger and settles a session whose contribution was already saved, e.g. after a refresh. */
function loadLedgerFor(view: CampaignView, sessionId: string): GameLedger {
  const ledger = readLedger(view.campaign.id, view.campaign.gameType)
  if (ledger.session?.id === sessionId && findContribution(sessionId)) {
    const settled = settleConfirmed(ledger, sessionId)
    writeLedger(settled)
    return settled
  }
  return ledger
}

function GameConfirm({ view, sessionId }: { view: CampaignView; sessionId: string }) {
  const navigate = useNavigate()
  const store = useDemoStore()
  const { campaign } = view
  const base = useOrgBase()
  const [ledger, setLedger] = useState(() => loadLedgerFor(view, sessionId))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lock = useRef(false)
  const session = ledger.session?.id === sessionId ? ledger.session : null
  const config = gameConfig(campaign.gameType)
  const playPath = campaignPlayPath(campaign.id, campaign.gameType, base)

  useEffect(() => {
    document.title = 'Review your game contribution — Together'
  }, [])

  const saved = store.contributions.find((item) => item.id === sessionId && item.campaignId === campaign.id)
  if (!session) {
    if (saved) return <Navigate to={`${base}/campaigns/${campaign.id}/success/${saved.id}`} replace />
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>Nothing is waiting to confirm</h1>
          <p className="muted">
            This game contribution was cancelled, or it belongs to another browser. Nothing was collected.
          </p>
          <Link to={playPath} className="btn btn-primary">
            Back to the game
          </Link>
        </div>
      </div>
    )
  }

  const amountPaise = selectedPaise(session)
  const custom = session.customPaise != null
  const live = campaignGameSettings(campaign)
  const availability = contributionAvailability(campaign, store.contributions)

  function validate(): string | null {
    const fresh = loadStore()
    const latest = fresh.campaigns.find((item) => item.id === campaign.id)
    if (!latest) return 'This campaign is no longer saved in this browser.'
    if (!latest.participation.game) return 'Game-based giving is no longer open on this campaign. Nothing was donated.'
    const check = contributionAvailability(latest, fresh.contributions)
    if (!check.ok) return check.reason
    const rule = contributionRuleMessage(amountPaise)
    if (rule) return rule
    if (custom && !campaignGameSettings(latest).allowCustom) {
      return 'This campaign now accepts the game-calculated amount only. Go back to the game and use Reset to game total.'
    }
    return null
  }

  function confirm() {
    if (lock.current) return
    const latestLedger = loadLedgerFor(view, sessionId)
    if (latestLedger.session?.id !== sessionId) {
      setLedger(latestLedger)
      return
    }
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    lock.current = true
    setSubmitting(true)
    try {
      const giver = currentPlayer(campaign.id)
      const jacketColor =
        campaign.gameType === 'jacket' ? readProgress(campaign.id, 'jacket', parseWarmthProgress)?.color : undefined
      const savedContribution = addContribution({
        id: sessionId,
        campaignId: campaign.id,
        amount: amountPaise / PAISE_PER_RUPEE,
        method: 'game',
        detail: `${gameMeta(campaign.gameType).name} · ${actionBreakdown(session!, config)} · suggestion ${formatPaise(
          session!.suggestedPaise,
        )}${custom ? ` · chosen ${formatPaise(amountPaise)}` : ''}${jacketColor ? ` · colour ${jacketColor}` : ''}`,
        playerId: giver?.id,
        playerName: giver?.name,
        referralCode: activeReferral(campaign.id, giver?.id),
        referralId: snapshotReferral(sessionId, campaign.id),
      })
      writeLedger(settleConfirmed(latestLedger, sessionId))
      navigate(`${base}/campaigns/${campaign.id}/success/${savedContribution.id}`, { replace: true })
    } catch (problem) {
      lock.current = false
      setSubmitting(false)
      setError(problem instanceof Error ? problem.message : 'The contribution could not be saved. Your suggestion is kept.')
    }
  }

  function backToGame() {
    const next = returnToPending(readLedger(campaign.id, campaign.gameType), sessionId)
    writeLedger(next)
    navigate(playPath)
  }

  return (
    <div className="confirm-page-pro">
      <div className="confirm-bar">
        <button type="button" className="back-link link-reset" onClick={backToGame}>
          <Icon name="back" size={16} />
          Back to the game
        </button>
      </div>
      <div className="container narrow">
        <header className="center-head">
          <h1>Review your game contribution</h1>
          <p className="muted">Check the details, then confirm. No real money will be collected.</p>
        </header>
        <ReferralCredit referralId={checkoutReferral(sessionId, campaign.id)} />
        <section className="panel confirm-summary-card">
          <div className="confirm-campaign">
            <CampaignCover campaign={campaign} />
            <div>
              <span className="eyebrow-label">Campaign</span>
              <h2>{campaign.title}</h2>
              <p className="muted small">Source game: {gameMeta(campaign.gameType).name}</p>
            </div>
          </div>
          <div className="confirm-amount">
            <div className="money-row">
              <span className="eyebrow-label">Your contribution</span>
              <span className="sim-pill">Simulated payment</span>
            </div>
            <strong className="amount-big">{formatPaise(amountPaise)}</strong>
            <p className="muted small">{custom ? 'Custom amount you chose' : 'Game-calculated amount'}</p>
          </div>
        </section>
        <section className="panel gc-checkout">
          <h2>Action breakdown</h2>
          {session.actions.length === 0 ? (
            <p className="gc-action-empty">No care actions in this suggestion yet.</p>
          ) : (
            <ul className="gc-action-list">
              {session.actions.map((action) => (
                <li key={action.id}>
                  <span className="gc-action-mark" aria-hidden="true">
                    <Icon name="check" size={14} />
                  </span>
                  <span className="gc-action-label">{action.label}</span>
                  <strong className="gc-action-amount">{formatPaise(action.amountPaise)}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className="gc-breakdown-foot">
            <div className="gc-suggest-row">
              <span className="gc-suggest-label">{actionBreakdown(session, config)}</span>
              <span className="gc-suggest-value">
                {amountPaise === session.suggestedPaise
                  ? 'Game suggestion'
                  : `Game suggestion ${formatPaise(session.suggestedPaise)}`}
              </span>
            </div>
            <div className="gc-total-row">
              <span>{amountPaise === session.suggestedPaise ? 'Total' : 'Final chosen amount'}</span>
              <strong>{formatPaise(amountPaise)}</strong>
            </div>
          </div>
          {session.capReached && session.capPaise != null ? (
            <p className="muted small">The game suggestion reached its cap of {formatPaise(session.capPaise)}.</p>
          ) : null}
          {custom && !live.allowCustom ? (
            <p className="notice warn compact">This campaign now accepts the game-calculated amount only.</p>
          ) : null}
        </section>
        {!availability.ok ? (
          <div className="notice warn" role="status">
            <div>
              <strong>This campaign can’t accept contributions right now.</strong>
              <p className="small">{availability.reason} Your pending suggestion is still saved in the game.</p>
            </div>
          </div>
        ) : null}
        {error ? (
          <div className="notice error" role="alert">
            {error}
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-block btn-xl"
          disabled={submitting || !availability.ok}
          onClick={confirm}
        >
          {submitting ? 'Saving…' : `Confirm simulated contribution — ${formatPaise(amountPaise)}`}
        </button>
        <button type="button" className="link-button center-block" onClick={backToGame}>
          Cancel and return to the game
        </button>
        <div className="notice warn compact center-notice">
          <Icon name="info" size={18} />
          No real money will be collected.
        </div>
        <div className="presenter-row-pro">
          <span className="muted small">For presenters</span>
          <button
            type="button"
            className="btn btn-outline btn-sm danger-outline"
            onClick={() =>
              setError('This simulated payment did not go through. Nothing was added, and your pending suggestion is kept for a retry.')
            }
          >
            Simulate failed payment
          </button>
        </div>
      </div>
    </div>
  )
}

function DirectConfirm({ view }: { view: CampaignView }) {
  const id = view.campaign.id
  const navigate = useNavigate()
  const pending = getPending(id)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lock = useRef(false)

  useEffect(() => {
    document.title = 'Confirm your demo contribution — Together'
  }, [])

  const { campaign } = view
  const base = useOrgBase()

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
    if (current.method !== 'direct') {
      setError('Game contributions are reviewed from the game. Nothing was donated.')
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
        playerId: current.playerId,
        playerName: current.playerName,
        referralCode: current.referralCode,
        referralId: current.referralId,
      })
      clearPending()
      navigate(`${base}/campaigns/${campaign.id}/success/${saved.id}`)
    } catch (problem) {
      lock.current = false
      setSubmitting(false)
      setError(problem instanceof Error ? problem.message : 'The contribution could not be saved.')
    }
  }

  const backPath = campaignDetailsPath(campaign.id, base)

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
        <ReferralCredit referralId={pending?.referralId} />
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
            <Link to={campaignDetailsPath(campaign.id, base)} className="btn btn-primary">
              Back to campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
