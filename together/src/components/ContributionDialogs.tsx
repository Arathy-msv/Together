import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { GameContribution } from '../hooks/useGameContribution.ts'
import { contributionAvailability } from '../lib/availability.ts'
import {
  actionBreakdown,
  contributionRuleMessage,
  formatPaise,
  paiseToInput,
  parseRupeesToPaise,
  selectedPaise,
} from '../lib/gameContribution.ts'
import { currencySymbol, formatMoney } from '../lib/format.ts'
import { gameMeta } from '../lib/games.ts'
import { loadStore } from '../lib/storage.ts'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Traps focus in a modal, closes on Escape, and restores focus when the modal unmounts. */
function useModalFocus(ref: RefObject<HTMLElement | null>, onEscape: () => void, returnFocus: RefObject<HTMLElement | null>) {
  const escape = useRef(onEscape)
  useEffect(() => {
    escape.current = onEscape
  }, [onEscape])

  useEffect(() => {
    const node = ref.current
    const target = returnFocus.current
    node?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        escape.current()
        return
      }
      if (event.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const usable = target && target.isConnected && !(target as HTMLButtonElement).disabled
      window.setTimeout(() => {
        if (usable) target.focus()
        else document.querySelector<HTMLElement>('[data-game-root]')?.focus()
      }, 0)
    }
  }, [ref, returnFocus])
}

function Modal({
  labelledBy,
  describedBy,
  onEscape,
  returnFocus,
  children,
}: {
  labelledBy: string
  describedBy?: string
  onEscape: () => void
  returnFocus: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useModalFocus(ref, onEscape, returnFocus)
  return createPortal(
    <div className="gc-backdrop" role="presentation">
      <div
        ref={ref}
        className="gc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ContributionLayer({
  contribution,
  onNextRound,
}: {
  contribution: GameContribution
  onNextRound?: () => void
}) {
  return (
    <>
      {contribution.dialog && contribution.session ? (
        <CheckpointDialog contribution={contribution} onNextRound={onNextRound} />
      ) : null}
      {contribution.restartOpen ? <RestartDialog contribution={contribution} /> : null}
    </>
  )
}

function CheckpointDialog({ contribution, onNextRound }: { contribution: GameContribution; onNextRound?: () => void }) {
  const { dialog, session, config, preview, view } = contribution
  const headingId = useId()
  const helperId = useId()
  const errorId = useId()
  const fieldId = useId()
  const initial = selectedPaise(session)
  const [text, setText] = useState(() => paiseToInput(initial))
  const [dirty, setDirty] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [donateError, setDonateError] = useState('')

  const availability = useMemo(() => {
    const store = loadStore()
    const campaign = store.campaigns.find((item) => item.id === view.campaign.id) ?? view.campaign
    return contributionAvailability(campaign, store.contributions)
  }, [view.campaign])

  if (!dialog || !session) return null

  const custom = session.customPaise != null
  const canEdit = session.allowCustom && contribution.settings.allowCustom
  const parsed = parseRupeesToPaise(text)
  const fieldError = canEdit ? contributionRuleMessage(parsed) : null
  /** Null keeps automatic mode. A typed amount becomes a fixed custom total. */
  const choice = canEdit && (dirty || custom) && parsed != null ? parsed : null
  const chosenPaise = choice ?? session.suggestedPaise
  const finished = dialog.roundComplete && Boolean(onNextRound)
  const secondaryLabel = finished ? config.roundCompleteLabel : 'Keep playing'

  function keepPlaying() {
    if (canEdit && dirty && parsed != null && fieldError == null) contribution.saveChoice(parsed)
    contribution.closeDialog()
  }

  function secondary() {
    keepPlaying()
    if (finished) onNextRound?.()
  }

  function resetToGame() {
    contribution.saveChoice(null)
    setText(paiseToInput(session!.suggestedPaise))
    setDirty(false)
    setDonateError('')
  }

  function donate() {
    if (fieldError) return
    const message = contribution.donate(choice)
    if (message) setDonateError(message)
  }

  if (confirmCancel) {
    return (
      <Modal labelledBy={headingId} describedBy={helperId} onEscape={() => setConfirmCancel(false)} returnFocus={contribution.returnFocus}>
        <div className="gc-body">
          <h2 id={headingId} className="gc-heading" tabIndex={-1} data-autofocus>
            Discard this suggestion?
          </h2>
          <p id={helperId} className="gc-text">
            This discards the pending {formatPaise(session.suggestedPaise)} suggestion and collects nothing. Your game
            progress stays as it is, and the actions you already completed will not be added again.
          </p>
          <div className="gc-actions">
            <button type="button" className="gc-btn gc-btn-danger" onClick={contribution.cancel}>
              Discard suggestion
            </button>
            <button type="button" className="gc-btn gc-btn-outline" onClick={() => setConfirmCancel(false)}>
              Keep suggestion
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal labelledBy={headingId} describedBy={helperId} onEscape={keepPlaying} returnFocus={contribution.returnFocus}>
      <button type="button" className="gc-close" aria-label="Close and keep playing" onClick={keepPlaying}>
        <span aria-hidden="true">×</span>
      </button>
      <div className="gc-body">
        <p className="gc-eyebrow">
          {gameMeta(contribution.game).name}
          <span>Demo</span>
        </p>
        <h2 id={headingId} className="gc-heading" tabIndex={-1} data-autofocus>
          {dialog.heading}
        </h2>
        {dialog.mode === 'checkpoint' ? (
          <p className="gc-latest">
            {dialog.outcome === 'capped'
              ? dialog.latestPaise > 0
                ? `${formatPaise(dialog.latestPaise)} added to your suggestion. The suggestion limit is now reached.`
                : `Suggestion limit reached — this action added ${formatMoney(0)}.`
              : `${formatPaise(dialog.latestPaise)} added to your suggestion.`}
          </p>
        ) : null}

        <dl className="gc-summary">
          <div>
            <dt>Breakdown</dt>
            <dd>{actionBreakdown(session, config)}</dd>
          </div>
          <div>
            <dt>Suggested contribution</dt>
            <dd>{formatPaise(session.suggestedPaise)}</dd>
          </div>
          {custom ? (
            <div className="gc-summary-strong">
              <dt>Your chosen amount</dt>
              <dd>{formatPaise(session.customPaise!)}</dd>
            </div>
          ) : null}
        </dl>
        {session.capReached && session.capPaise != null ? (
          <p className="gc-note">
            The suggestion is capped at {formatPaise(session.capPaise)}. More actions will not increase it.
          </p>
        ) : null}
        {custom ? <p className="gc-note">Your custom amount stays fixed unless you edit it.</p> : null}

        <div className="gc-field">
          <label htmlFor={fieldId}>Your final amount</label>
          <div className={fieldError && dirty ? 'gc-input invalid' : 'gc-input'}>
            <span aria-hidden="true">{currencySymbol()}</span>
            <input
              id={fieldId}
              inputMode="decimal"
              autoComplete="off"
              value={canEdit ? text : paiseToInput(session.suggestedPaise)}
              readOnly={!canEdit}
              aria-invalid={Boolean(fieldError && dirty)}
              aria-describedby={fieldError ? errorId : undefined}
              onChange={(event) => {
                setText(event.target.value)
                setDirty(true)
                setDonateError('')
              }}
            />
          </div>
          {!canEdit ? (
            <p className="gc-help">This campaign uses the game-calculated amount.</p>
          ) : fieldError && dirty ? (
            <p id={errorId} className="gc-error" role="alert">
              {fieldError} You can keep playing while you fix it.
            </p>
          ) : null}
          {canEdit && (custom || dirty) ? (
            <button type="button" className="gc-link" onClick={resetToGame}>
              Reset to game total ({formatPaise(session.suggestedPaise)})
            </button>
          ) : null}
        </div>

        {!availability.ok ? (
          <p className="gc-warning" role="status">
            {availability.reason} Your suggestion stays saved here.
          </p>
        ) : null}
        {donateError ? (
          <p className="gc-error" role="alert">
            {donateError}
          </p>
        ) : null}

        <div className="gc-actions">
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            onClick={donate}
            disabled={preview || Boolean(fieldError) || !availability.ok}
          >
            Review & contribute{fieldError ? '' : ` — ${formatPaise(chosenPaise)}`}
          </button>
          <button type="button" className="gc-btn gc-btn-outline" onClick={secondary}>
            {secondaryLabel}
          </button>
        </div>
        <button type="button" className="gc-text-btn" onClick={() => setConfirmCancel(true)}>
          Discard suggestion
        </button>
        <div id={helperId} className="gc-helper">
          <p>No payment is taken while you play. You confirm the final amount on the next screen.</p>
          <p>{preview ? 'Preview only — contributions are disabled.' : 'Simulated payment — no real money is collected.'}</p>
        </div>
      </div>
    </Modal>
  )
}

function RestartDialog({ contribution }: { contribution: GameContribution }) {
  const headingId = useId()
  const textId = useId()
  const session = contribution.session
  return (
    <Modal
      labelledBy={headingId}
      describedBy={textId}
      onEscape={() => contribution.resolveRestart('back')}
      returnFocus={contribution.returnFocus}
    >
      <div className="gc-body">
        <h2 id={headingId} className="gc-heading" tabIndex={-1} data-autofocus>
          Start a new round?
        </h2>
        <p id={textId} className="gc-text">
          You have a pending suggestion of {formatPaise(selectedPaise(session))}. Keep it to add new actions on top, or
          discard it. Nothing is charged either way.
        </p>
        <div className="gc-actions">
          <button type="button" className="gc-btn gc-btn-primary" onClick={() => contribution.resolveRestart('keep')}>
            Keep my suggestion
          </button>
          <button type="button" className="gc-btn gc-btn-outline" onClick={() => contribution.resolveRestart('discard')}>
            Discard and restart
          </button>
        </div>
        <button type="button" className="gc-text-btn" onClick={() => contribution.resolveRestart('back')}>
          Back to the game
        </button>
      </div>
    </Modal>
  )
}
