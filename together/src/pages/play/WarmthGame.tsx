import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { LeafMark } from '../../components/illustrations.tsx'
import { OrgGameBrand } from '../../components/org/OrgGameBrand.tsx'
import { useCampaignBackPath } from '../../hooks/useBackPath.ts'
import { useOrgBase } from '../../components/org/OrgContext.tsx'
import { CoinFlight, type Point } from './giving-tree/CoinFlight.tsx'
import { useGameContribution } from '../../hooks/useGameContribution.ts'
import { contributionAvailability } from '../../lib/availability.ts'
import { goalReached } from '../../lib/campaigns.ts'
import {
  contributionRuleMessage,
  formatPaise,
  hasAction,
  PAISE_PER_RUPEE,
  parseRupeesToPaise,
  selectedPaise,
} from '../../lib/gameContribution.ts'
import { newRoundId, readLedger, readProgress, writeProgress } from '../../lib/gameLedger.ts'
import { currencySymbol, formatINR } from '../../lib/format.ts'
import { loadStore } from '../../lib/storage.ts'
import type { CampaignView } from '../../lib/types.ts'
import {
  JACKET_COLORS,
  WARMTH_ACTIONS,
  WARMTH_QUICK_RUPEES,
  jacketImage,
  parseWarmthProgress,
  warmthAction,
  type WarmthActionId,
  type WarmthProgress,
} from '../../lib/warmth.ts'
import '../../styles/warmth.css'

function freshProgress(): WarmthProgress {
  return { roundId: newRoundId(), color: 'navy' }
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export function WarmthGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const contribution = useGameContribution({ view, game: 'jacket', preview })
  const reduced = useReducedMotion()
  const campaign = view.campaign
  const campaignId = campaign.id
  const base = useOrgBase()
  const backPath = useCampaignBackPath(campaignId)
  const [progress, setProgress] = useState<WarmthProgress>(() => {
    if (preview) return freshProgress()
    return readProgress(campaignId, 'jacket', parseWarmthProgress) ?? freshProgress()
  })
  const [zip, setZipState] = useState(0)
  const zipRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [review, setReview] = useState(false)
  const [amountText, setAmountText] = useState('')
  const [amountError, setAmountError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const [flying, setFlying] = useState<{ id: number; label: string } | null>(null)
  const drag = useRef({ y: 0, zip: 0 })

  function setZip(value: number) {
    zipRef.current = value
    setZipState(value)
  }
  const jacketRef = useRef<HTMLDivElement>(null)
  const cartRef = useRef<HTMLButtonElement>(null)
  const roundRef = useRef(progress.roundId)

  useEffect(() => {
    roundRef.current = progress.roundId
    if (!preview) writeProgress(campaignId, 'jacket', progress)
  }, [campaignId, preview, progress])

  useEffect(() => {
    if (preview) return
    const ledger = readLedger(campaignId, 'jacket')
    const stale =
      !ledger.session && WARMTH_ACTIONS.some((action) => hasAction(ledger, `${progress.roundId}:${action.id}`))
    if (!stale) return
    setProgress(freshProgress())
    setZip(0)
    // Only reset a round whose actions were already confirmed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, preview])

  const done = useMemo(() => {
    const ids = new Set(contribution.session?.actions.map((action) => action.id) ?? [])
    return WARMTH_ACTIONS.map((action) => action.id).filter((id) => ids.has(`${progress.roundId}:${id}`))
  }, [contribution.session, progress.roundId])

  useEffect(() => {
    if (done.includes('zip')) setZip(1)
  }, [done])

  const suggestion = contribution.session?.suggestedPaise ?? 0
  const zipped = done.includes('zip')
  const lined = done.includes('lining')
  const tagged = done.includes('tag')
  const wrapped = zipped && lined && tagged
  const finished = !preview && goalReached(view.raised, campaign.goalAmount)
  const percent = campaign.goalAmount > 0 ? Math.min(100, Math.round((view.raised / campaign.goalAmount) * 1000) / 10) : 0
  const allowCustom = contribution.settings.allowCustom
  const availability = contributionAvailability(campaign, loadStore().contributions)

  function actionId(id: WarmthActionId) {
    return `${roundRef.current}:${id}`
  }

  function addAction(id: WarmthActionId, origin: () => Point | null) {
    const action = warmthAction(id)
    const added = contribution.record({
      actionId: actionId(id),
      roundId: roundRef.current,
      label: action.label,
      amountPaise: action.pricePaise,
      heading: action.label,
      quiet: true,
    })
    if (!added) return
    setAnnounce(`${formatPaise(action.pricePaise)} added to your suggested contribution.`)
    setToast(`${formatPaise(action.pricePaise)} added to your suggested contribution.`)
    cartRef.current?.classList.remove('is-pulse')
    if (reduced) {
      cartRef.current?.classList.add('is-pulse')
      return
    }
    setFlying({ id: Date.now(), label: `+${formatPaise(action.pricePaise)}` })
    flightFrom.current = origin
  }

  const flightFrom = useRef<() => Point | null>(() => null)

  function jacketPoint(): Point | null {
    const box = jacketRef.current?.getBoundingClientRect()
    if (!box) return null
    return { x: box.left + box.width * 0.55, y: box.top + box.height * 0.42 }
  }

  function cartPoint(): Point | null {
    const box = cartRef.current?.getBoundingClientRect()
    if (!box) return null
    return { x: box.left + box.width * 0.72, y: box.top + box.height / 2 }
  }

  function completeZip() {
    if (zipped || contribution.paused) return
    setZip(1)
    addAction('zip', jacketPoint)
  }

  function onZipDown(event: ReactPointerEvent<HTMLElement>) {
    if (zipped || reduced) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragging(true)
    drag.current = { y: event.clientY, zip }
  }

  function onZipMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging || zipped) return
    const next = Math.min(1, Math.max(0, drag.current.zip + (drag.current.y - event.clientY) / 240))
    setZip(next)
  }

  function onZipUp() {
    if (!dragging) return
    setDragging(false)
    if (zipRef.current >= 0.97) completeZip()
    else if (!zipped) setZip(0)
  }

  function openReview() {
    const current = contribution.session ? selectedPaise(contribution.session) : suggestion
    setAmountText(current > 0 ? String(current / PAISE_PER_RUPEE) : '')
    setAmountError('')
    setReview(true)
    setToast(null)
  }

  function proceed() {
    const session = contribution.session
    if (!session || session.actions.length === 0) {
      setAmountError('Prepare the jacket to start a suggestion.')
      return
    }
    if (!availability.ok) {
      setAmountError(availability.reason)
      return
    }
    const parsed = allowCustom ? parseRupeesToPaise(amountText) : session.suggestedPaise
    const rule = contributionRuleMessage(parsed)
    if (rule || parsed == null) {
      setAmountError(rule ?? 'Enter an amount greater than zero.')
      return
    }
    const choice = parsed === session.suggestedPaise ? null : parsed
    contribution.saveChoice(choice)
    const message = contribution.donate(choice)
    if (message) setAmountError(message)
  }

  const copy = wrapped
    ? { kicker: 'Ready to share', title: 'A little care makes a difference.', body: 'Your jacket is folded and ready. Review the suggestion whenever you like.' }
    : tagged
      ? { kicker: 'Kindness tag', title: 'A little care makes a difference.', body: 'The tag is a reminder that someone cared. Nothing has been delivered.' }
      : zipped
        ? { kicker: 'Stage 03', title: 'A thoughtful finishing touch.', body: 'A small tag makes this jacket feel extra special.' }
        : lined
          ? { kicker: 'Stage 02', title: 'Zip it with care.', body: 'Zip it up to add warmth and keep out the cold.' }
          : { kicker: 'Choose a little warmth', title: 'Small actions. A little more warmth.', body: 'Choose a colour, then add a warm lining.' }

  if (finished) {
    return (
      <div className="wm-shell">
        <WarmthHeader backTo={preview ? undefined : backPath} preview={preview} />
        <section className="wm-goal">
          <img src="/games/warmth/clothing-rail.jpg" alt="A rail of navy and forest jackets above folded sweaters" />
          <div>
            <p className="wm-kicker">Wrap someone in warmth</p>
            <h1>Together, we shared more than clothes.</h1>
            <p className="wm-goal-lead">We shared care. Thank you for helping this campaign reach its goal.</p>
            <p className="wm-goal-figures">
              <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)} · 100%
              <span className="wm-badge">Goal reached</span>
            </p>
            <p className="wm-goal-note">This clothing rail is a symbol of the goal. It is not a count of garments bought or delivered.</p>
            <div className="wm-goal-actions">
              <Link className="wm-btn" to={backPath}>
                View campaign story
              </Link>
              <Link className="wm-btn wm-btn-ghost" to={`${base}/campaigns`}>
                Explore other campaigns
              </Link>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={`wm-shell${review ? ' is-review' : ''}`}>
      <WarmthHeader backTo={preview ? undefined : backPath} preview={preview} />
      <div className="wm-strip">
        <div className="wm-campaign">
          <LeafMark size={18} />
          <div>
            <strong>{campaign.title}</strong>
            <span>Warm layers. Brighter days.</span>
          </div>
          <p>
            <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)} · {Number.isInteger(percent) ? percent : percent.toFixed(1)}%
          </p>
          <div className="wm-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label="Shared campaign progress">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="wm-cart"
          ref={cartRef}
          onClick={openReview}
          onAnimationEnd={(event) => event.currentTarget.classList.remove('is-pulse')}
        >
          <span>Suggested contribution</span>
          <strong>{formatPaise(suggestion)}</strong>
        </button>
      </div>

      <div className="wm-layout">
        <div className="wm-play">
          <div className="wm-intro">
            <p className="wm-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p className="wm-lead">{copy.body}</p>
          </div>
          <div className="wm-jacket" ref={jacketRef}>
            <img
              src={jacketImage(progress.color, 'open')}
              alt=""
              style={{ opacity: !lined && !zipped && !wrapped ? 1 : 0 }}
              draggable={false}
            />
            <img
              src={jacketImage(progress.color, 'lining')}
              alt={lined && !zipped && !wrapped ? `${progress.color} jacket with a sage quilted lining` : ''}
              style={{ opacity: lined && !zipped && !wrapped ? 1 : 0 }}
              draggable={false}
            />
            <img
              src={jacketImage(progress.color, 'zipped')}
              alt={zipped && !wrapped ? `Zipped ${progress.color} jacket` : ''}
              style={{ opacity: zipped && !wrapped ? 1 : 0 }}
              draggable={false}
            />
            <img
              src={jacketImage(progress.color, 'folded')}
              alt={wrapped ? `Folded ${progress.color} jacket tied with a ribbon` : ''}
              style={{ opacity: wrapped ? 1 : 0 }}
              draggable={false}
            />
            {tagged ? (
              <span className={`wm-kindness${wrapped ? ' is-folded' : ''}`}>
                With care
                <i />
              </span>
            ) : null}
            {lined && !zipped ? (
              <div
                className={dragging ? 'wm-zip is-dragging' : 'wm-zip'}
                style={{ ['--zip' as string]: String(zip) }}
              >
                <button
                  type="button"
                  className="wm-zip-pull"
                  aria-label="Zip pull. Drag up to close the jacket, or use Zip jacket."
                  onPointerDown={onZipDown}
                  onPointerMove={onZipMove}
                  onPointerUp={onZipUp}
                  onPointerCancel={onZipUp}
                />
              </div>
            ) : null}
          </div>
          {review ? null : (
            <div className="wm-controls">
              <div className="wm-colors" role="radiogroup" aria-label="Jacket colour">
                {JACKET_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    role="radio"
                    aria-checked={progress.color === color.id}
                    className={progress.color === color.id ? 'is-on' : ''}
                    onClick={() => setProgress((current) => ({ ...current, color: color.id }))}
                  >
                    <i style={{ background: color.swatch }} />
                    {color.label}
                  </button>
                ))}
              </div>
              <div className="wm-actions">
                <button type="button" className="wm-chip" disabled={lined} onClick={() => addAction('lining', jacketPoint)}>
                  <strong>Warm lining</strong>
                  <span>{formatINR(50)}</span>
                </button>
                <button type="button" className="wm-chip" disabled={!lined || zipped} onClick={completeZip}>
                  <strong>Zip</strong>
                  <span>{formatINR(50)}</span>
                </button>
                <button type="button" className="wm-chip" disabled={!zipped || tagged} onClick={() => addAction('tag', jacketPoint)}>
                  <strong>Kindness tag</strong>
                  <span>{formatINR(25)}</span>
                </button>
                <button type="button" className="wm-btn" onClick={openReview}>
                  Review & contribute
                </button>
              </div>
            </div>
          )}
        </div>

        {review ? (
          <aside className="wm-review" aria-labelledby="wm-review-title">
            <h2 id="wm-review-title">Suggested contribution</h2>
            <p>{formatPaise(suggestion)}</p>
            <ul>
              {WARMTH_ACTIONS.filter((action) => done.includes(action.id)).map((action) => (
                <li key={action.id}>
                  <span>{action.label}</span>
                  <strong>{formatPaise(action.pricePaise)}</strong>
                </li>
              ))}
            </ul>
            {done.length === 0 ? <p className="wm-muted">Nothing is in the cart yet. Colour is free.</p> : null}
            <div className="wm-total">
              <span>Suggested contribution</span>
              <strong>{formatPaise(suggestion)}</strong>
            </div>
            <label htmlFor="wm-amount">Your contribution</label>
            {allowCustom ? (
              <>
                <div className="wm-quick">
                  {WARMTH_QUICK_RUPEES.map((rupees) => (
                    <button key={rupees} type="button" onClick={() => setAmountText(String(rupees))} className={amountText === String(rupees) ? 'is-on' : ''}>
                      {formatINR(rupees)}
                    </button>
                  ))}
                </div>
                <input
                  id="wm-amount"
                  inputMode="numeric"
                  value={amountText}
                  onChange={(event) => {
                    setAmountText(event.target.value.replace(/[^\d]/g, ''))
                    setAmountError('')
                  }}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby="wm-amount-help"
                />
              </>
            ) : (
              <p id="wm-amount">{formatPaise(suggestion)}</p>
            )}
            <p id="wm-amount-help" className="wm-muted">
              The game suggestion stays {formatPaise(suggestion)}. The amount you confirm can be different.
            </p>
            {amountError ? <p className="wm-error" role="alert">{amountError}</p> : null}
            {!availability.ok ? <p className="wm-error">{availability.reason}</p> : null}
            <button type="button" className="wm-btn" onClick={proceed} disabled={!availability.ok || done.length === 0}>
              Continue with {allowCustom && amountText ? `${currencySymbol()}${amountText}` : formatPaise(suggestion)}
            </button>
            <button type="button" className="wm-text" onClick={() => setReview(false)}>
              Keep preparing
            </button>
            <p className="wm-muted">Demo contribution. No real payment will be taken.</p>
          </aside>
        ) : null}
      </div>

      {toast && !review ? (
        <div className="wm-toast" role="status">
          <p>{toast}</p>
          <button type="button" onClick={() => setToast(null)}>
            Keep going
          </button>
          <button type="button" onClick={openReview}>
            Review & contribute
          </button>
        </div>
      ) : null}
      <p className="wm-foot">Playing adds a suggestion, not a payment. Saved on this device.</p>
      <p className="wm-sr" aria-live="polite">
        {announce}
      </p>
      {flying ? (
        <CoinFlight
          key={flying.id}
          from={() => flightFrom.current()}
          to={cartPoint}
          label={flying.label}
          onLand={() => {
            setFlying(null)
            cartRef.current?.classList.add('is-pulse')
          }}
        />
      ) : null}
    </div>
  )
}

function WarmthHeader({ backTo, preview }: { backTo?: string; preview: boolean }) {
  return (
    <header className="wm-header">
      <OrgGameBrand className="wm-brand" preview={preview} />
      {backTo ? (
        <Link to={backTo} className="wm-back">
          Back to campaign
        </Link>
      ) : (
        <span className="wm-back">Wrap Someone in Warmth</span>
      )}
      <span className="wm-demo">{preview ? 'Preview' : 'Demo'}</span>
    </header>
  )
}
