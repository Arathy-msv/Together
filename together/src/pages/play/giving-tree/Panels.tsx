import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatPaise, paiseToInput } from '../../../lib/gameContribution.ts'
import {
  TREE_MILESTONES,
  cartLines,
  formatPercent,
  parseGiftAmount,
  suggestedPaise,
  type GivingTreeState,
} from '../../../lib/givingTree.ts'
import { currencySymbol, formatINR } from '../../../lib/format.ts'
import { useLowData } from '../../../lib/lowData.ts'
import { ART } from './GardenScene.tsx'
import { ArrowRight, CareIcon, CheckIcon, InfoIcon, LeafPoints, SproutMark } from './icons.tsx'

export interface CampaignSummary {
  title: string
  raised: number
  goal: number
  percent: number
}

export function CartReview({
  state,
  onReview,
  onContinue,
  onClear,
}: {
  state: GivingTreeState
  onReview: () => void
  onContinue: () => void
  onClear: () => void
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const lines = cartLines(state)
  const total = suggestedPaise(state)

  return (
    <div className="gt-panel">
      <h2 id="gt-cart-title" tabIndex={-1}>
        Your suggested contribution
      </h2>
      {lines.length === 0 ? (
        <>
          <p className="gt-panel-lead">Your cart is empty. Care for the shared tree to add a suggestion — nothing is charged while you play.</p>
          <div className="gt-empty-cart">
            <SproutMark size={40} />
            <p>Plant a seed, add water, fertilizer or sunlight. Each care action adds a small suggested amount here.</p>
          </div>
          <div className="gt-panel-actions">
            <button type="button" className="gt-btn gt-btn-primary" onClick={onContinue}>
              Continue growing
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="gt-panel-lead">These care actions support the shared tree and the campaign when you contribute.</p>
          <ul className="gt-lines">
            {lines.map((line) => (
              <li key={line.kind}>
                <span className="gt-line-icon">
                  <CareIcon kind={line.kind} size={22} />
                </span>
                <span className="gt-line-name">
                  <strong>{line.item}</strong>
                  <span>
                    {line.quantity} × {formatPaise(line.unitPaise)}
                  </span>
                </span>
                <span className="gt-line-total">{formatPaise(line.totalPaise)}</span>
              </li>
            ))}
          </ul>
          <div className="gt-total-row">
            <span>Suggested total</span>
            <strong>{formatPaise(total)}</strong>
          </div>
          <div className="gt-points-row">
            <span className="gt-line-icon">
              <LeafPoints size={22} />
            </span>
            <span className="gt-line-name">
              <strong>Care points</strong>
              <span>Kept with you after you contribute</span>
            </span>
            <strong>{state.carePoints} points</strong>
          </div>
          <p className="gt-note">
            <InfoIcon />
            <span>
              <strong>No payment is taken while you play.</strong> This is a suggestion. You can review the amount before confirming.
            </span>
          </p>
          <div className="gt-panel-actions">
            <button type="button" className="gt-btn gt-btn-primary" onClick={onReview}>
              Review & contribute <ArrowRight />
            </button>
            <button type="button" className="gt-btn gt-btn-outline" onClick={onContinue}>
              Keep playing
            </button>
            {confirmClear ? (
              <div className="gt-clear-confirm" role="group" aria-label="Clear suggestion">
                <p>Clear the {formatPaise(total)} suggestion? Your care points stay.</p>
                <div>
                  <button type="button" className="gt-link gt-link-danger" onClick={onClear}>
                    Yes, clear it
                  </button>
                  <button type="button" className="gt-link" onClick={() => setConfirmClear(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="gt-link gt-link-danger" onClick={() => setConfirmClear(true)}>
                Clear suggestion
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function AmountChooser({
  state,
  campaign,
  allowCustom,
  blockedReason,
  onSave,
  onConfirm,
  onBack,
}: {
  state: GivingTreeState
  campaign: CampaignSummary
  allowCustom: boolean
  blockedReason: string | null
  onSave: (paise: number | null) => void
  onConfirm: (paise: number) => string | null
  onBack: () => void
}) {
  const suggestion = suggestedPaise(state)
  const [text, setText] = useState(() => paiseToInput(allowCustom ? (state.chosenPaise ?? suggestion) : suggestion))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const parsed = parseGiftAmount(text)
  const amount = allowCustom ? parsed.paise : suggestion

  function change(value: string) {
    setText(value)
    setError(null)
    const next = parseGiftAmount(value)
    if (next.paise != null) onSave(next.paise === suggestion ? null : next.paise)
  }

  function useSuggested() {
    setText(paiseToInput(suggestion))
    setError(null)
    onSave(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    if (amount == null) {
      setError(parsed.error)
      return
    }
    setSubmitting(true)
    const problem = onConfirm(amount)
    if (problem) {
      setError(problem)
      setSubmitting(false)
    }
  }

  const disabled = submitting || Boolean(blockedReason) || suggestion === 0

  return (
    <form className="gt-panel" onSubmit={submit} noValidate>
      <h2 id="gt-amount-title" tabIndex={-1}>
        Choose how much you would like to give.
      </h2>
      <div className="gt-total-row">
        <span className="gt-with-icon">
          <CareIcon kind="fertilizer" size={22} /> Suggested contribution
        </span>
        <strong>{formatPaise(suggestion)}</strong>
      </div>

      <div className="gt-field">
        <label htmlFor="gt-amount">Your final amount</label>
        <div className="gt-field-row">
          <div className={error ? 'gt-input has-error' : 'gt-input'}>
            <span aria-hidden="true">{currencySymbol()}</span>
            <input
              id="gt-amount"
              inputMode="numeric"
              autoComplete="off"
              value={text}
              disabled={!allowCustom}
              onChange={(event) => change(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby="gt-amount-help gt-amount-error"
            />
          </div>
          {allowCustom ? (
            <button type="button" className="gt-link" onClick={useSuggested}>
              Use suggested amount
            </button>
          ) : null}
        </div>
        <p id="gt-amount-help" className="gt-help">
          {allowCustom
            ? 'You can give less or more than the game suggestion.'
            : 'This campaign accepts the game suggestion as the contribution amount.'}
        </p>
        <p id="gt-amount-error" className="gt-error" role="alert">
          {error ?? ''}
        </p>
      </div>

      <div className="gt-points-row">
        <span className="gt-line-icon">
          <LeafPoints size={24} />
        </span>
        <span className="gt-line-name">
          <strong>Your care points</strong>
          <span>Kept on this device after you contribute</span>
        </span>
        <strong>{state.carePoints}</strong>
      </div>

      <div className="gt-campaign-mini">
        <span>Campaign</span>
        <strong>{campaign.title}</strong>
        <span>
          {formatINR(campaign.raised)} of {formatINR(campaign.goal)} • {formatPercent(campaign.percent)}
        </span>
      </div>

      {blockedReason ? <p className="gt-error-box">{blockedReason}</p> : null}

      <div className="gt-panel-actions">
        <button type="submit" className="gt-btn gt-btn-primary gt-btn-lg" disabled={disabled}>
          Confirm simulated contribution — {amount != null ? formatPaise(amount) : `${currencySymbol()}—`} <ArrowRight />
        </button>
        <button type="button" className="gt-link" onClick={onBack}>
          Cancel and return
        </button>
      </div>
      <p className="gt-demo-tag">Demo only — no real money collected.</p>
    </form>
  )
}

export function SuccessBanner({
  amountPaise,
  onContinue,
  backTo,
}: {
  amountPaise: number
  onContinue: () => void
  backTo?: string
}) {
  return (
    <div className="gt-success" role="status">
      <div className="gt-success-badge" aria-hidden="true">
        <SproutMark size={44} />
        <span>
          <CheckIcon size={12} />
        </span>
      </div>
      <div className="gt-success-copy">
        <h2 id="gt-success-title" tabIndex={-1}>
          You helped our campaign grow.
        </h2>
        <p className="gt-success-amount">
          Demo contribution <strong>{formatPaise(amountPaise)}.</strong>
        </p>
        <p>Previous care actions settled.</p>
      </div>
      <div className="gt-success-actions">
        <button type="button" className="gt-btn gt-btn-primary" onClick={onContinue}>
          Continue growing <ArrowRight />
        </button>
        {backTo ? (
          <Link className="gt-btn gt-btn-outline" to={backTo}>
            Back to campaign
          </Link>
        ) : null}
        <p className="gt-success-note">
          <InfoIcon size={13} /> No real money collected.
        </p>
      </div>
    </div>
  )
}

export function GrowthReference({ campaign, stage }: { campaign: CampaignSummary; stage: number }) {
  const lowData = useLowData()
  return (
    <div className="gt-growth">
      <h2 id="gt-growth-title" tabIndex={-1}>
        Shared campaign tree growth
      </h2>
      <p className="gt-growth-target">
        Target: <strong>{formatINR(campaign.goal)}</strong> · Now {formatINR(campaign.raised)} ({formatPercent(campaign.percent)})
      </p>
      <ol className={lowData ? 'gt-milestones is-low-data' : 'gt-milestones'}>
        {TREE_MILESTONES.map((milestone, index) => (
          <li key={milestone.name} className={index === stage ? 'is-current' : index < stage ? 'is-reached' : ''}>
            <div className="gt-milestone-copy">
              <strong>{milestone.percent}%</strong>
              <span>{milestone.name}</span>
              <span className="gt-milestone-amount">{formatINR(Math.round((campaign.goal * milestone.percent) / 100))}</span>
              {index === stage ? <em>Current stage</em> : null}
            </div>
            {lowData ? null : <img src={`${ART}/tree-${index}.webp`} alt="" loading="lazy" />}
          </li>
        ))}
      </ol>
      <p className="gt-growth-foot">
        <SproutMark /> Only confirmed simulated contributions change the shared tree. Care points and the pending cart do not.
      </p>
    </div>
  )
}
