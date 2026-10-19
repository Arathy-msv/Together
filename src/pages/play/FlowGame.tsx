import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { addContribution } from '../../lib/campaigns.ts'
import { formatINR, parseWholeRupees } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import { clearPending, getPending, newToken, setPending } from '../../lib/pending.ts'
import type { CampaignView, GameType } from '../../lib/types.ts'

export type FlowStep = 'discover' | 'action' | 'reveal' | 'contribute' | 'thanks'

export interface FlowCopy {
  discoverTitle: string
  discoverHint: string
  actionTitle: string
  actionHint?: string
  revealTitle: string
  revealBody: string
  supportTitle: string
  footerLabel: string
}

const DEFAULT_AMOUNTS = [50, 100, 250]

function playStepFromProgress(progress: number): 'discover' | 'action' | 'reveal' {
  if (progress >= 0.92) return 'reveal'
  if (progress > 0.02) return 'action'
  return 'discover'
}

export function FlowShell({
  view,
  game,
  copy,
  preview = false,
  scene,
  progress,
  onReplay,
  keyboardFallback,
}: {
  view: CampaignView
  game: GameType
  copy: FlowCopy
  preview?: boolean
  scene: ReactNode
  progress: number
  onReplay: () => void
  keyboardFallback: { label: string; onActivate: () => void }
}) {
  const { campaign } = view
  const meta = gameMeta(game)
  const [panel, setPanel] = useState<'play' | 'contribute' | 'thanks'>('play')
  const playStep = playStepFromProgress(progress)
  const step: FlowStep = panel === 'play' ? playStep : panel

  const [selected, setSelected] = useState<number | null>(() => {
    if (campaign.donationMode === 'fixed') {
      return campaign.fixedAmounts.includes(100) ? 100 : (campaign.fixedAmounts[0] ?? null)
    }
    return 100
  })
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [error, setError] = useState('')
  const [contributionId, setContributionId] = useState(() => crypto.randomUUID())
  const [recordedAmount, setRecordedAmount] = useState<number | null>(null)
  const submitted = useRef(false)

  const amounts =
    campaign.donationMode === 'fixed' && campaign.fixedAmounts.length > 0
      ? campaign.fixedAmounts
      : DEFAULT_AMOUNTS

  function resolveAmount(): number | null {
    if (useCustom || campaign.donationMode === 'custom') {
      return parseWholeRupees(custom)
    }
    if (selected != null && amounts.includes(selected)) return selected
    return null
  }

  function confirmContribution() {
    if (preview || !view.canGive || submitted.current) return
    const amount = resolveAmount()
    if (amount == null || amount <= 0 || amount > 10_000_000) {
      setError(
        useCustom || campaign.donationMode === 'custom'
          ? 'Enter a whole amount greater than zero.'
          : 'Choose one of the suggested amounts.',
      )
      return
    }
    submitted.current = true
    const existing = getPending(campaign.id)
    const token = existing?.method === 'game' ? existing.token : newToken()
    setPending({
      token,
      campaignId: campaign.id,
      amount,
      method: 'game',
      detail: `Played ${meta.name}.`,
    })
    addContribution({
      id: contributionId,
      campaignId: campaign.id,
      amount,
      method: 'game',
      detail: `Played ${meta.name}.`,
    })
    clearPending()
    setRecordedAmount(amount)
    setPanel('thanks')
  }

  function replayAll() {
    submitted.current = false
    setContributionId(crypto.randomUUID())
    setRecordedAmount(null)
    setError('')
    setPanel('play')
    onReplay()
  }

  const showCompact = step === 'contribute' || step === 'thanks'
  const thanksLine = copy.supportTitle.startsWith('Support')
    ? `Supporting${copy.supportTitle.slice('Support'.length)}.`
    : copy.supportTitle

  return (
    <div className={`flow-shell${preview ? ' flow-preview' : ''}`}>
      <header className="flow-header">
        <span className="flow-brand">Together</span>
        <span className="flow-demo">{preview ? 'Preview' : 'Demo campaign'}</span>
      </header>

      <div className={showCompact ? 'flow-main compact' : 'flow-main'}>
        {step === 'discover' || step === 'action' || step === 'reveal' ? (
          <div className="flow-stage">
            <div className="flow-copy">
              {step === 'discover' ? (
                <>
                  <h1>{copy.discoverTitle}</h1>
                  <p>{copy.discoverHint}</p>
                </>
              ) : null}
              {step === 'action' ? (
                <>
                  <h1>{copy.actionTitle}</h1>
                  <p>{copy.actionHint ?? 'Keep going...'}</p>
                </>
              ) : null}
              {step === 'reveal' ? (
                <>
                  <h1>{copy.revealTitle}</h1>
                  <p className="flow-body">{copy.revealBody}</p>
                  <p className="flow-meta">Sample campaign · Goal {formatINR(campaign.goalAmount)}</p>
                </>
              ) : null}
            </div>

            <div className="flow-scene">{scene}</div>

            {step === 'reveal' ? (
              <div className="flow-actions">
                {preview ? (
                  <p className="flow-preview-note">Preview only — contributions are disabled.</p>
                ) : view.canGive ? (
                  <button type="button" className="flow-btn" onClick={() => setPanel('contribute')}>
                    Choose a contribution
                  </button>
                ) : (
                  <p className="flow-preview-note">This campaign is not accepting contributions right now.</p>
                )}
                <button type="button" className="flow-link" onClick={replayAll}>
                  Replay
                </button>
              </div>
            ) : (
              <div className="flow-a11y">
                <button type="button" className="flow-link" onClick={keyboardFallback.onActivate}>
                  {keyboardFallback.label}
                </button>
              </div>
            )}

            {step === 'discover' || step === 'action' ? (
              <p className="flow-foot-label">{copy.footerLabel}</p>
            ) : null}
          </div>
        ) : null}

        {step === 'contribute' ? (
          <div className="flow-contribute">
            <div className="flow-mini-scene">{scene}</div>
            <h2>{copy.supportTitle}</h2>
            <div className="flow-amounts" role="group" aria-label="Contribution amount">
              {amounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={!useCustom && selected === amount ? 'flow-amount selected' : 'flow-amount'}
                  onClick={() => {
                    setSelected(amount)
                    setUseCustom(false)
                    setError('')
                  }}
                >
                  {formatINR(amount)}
                </button>
              ))}
              <button
                type="button"
                className={useCustom ? 'flow-amount selected' : 'flow-amount'}
                onClick={() => {
                  setUseCustom(true)
                  setError('')
                }}
              >
                Custom
              </button>
            </div>
            {useCustom || campaign.donationMode === 'custom' ? (
              <label className="flow-custom">
                <span className="sr-only">Custom amount</span>
                <span>₹</span>
                <input
                  inputMode="numeric"
                  value={custom}
                  onChange={(event) => {
                    setCustom(event.target.value)
                    setError('')
                  }}
                  placeholder="Amount"
                />
              </label>
            ) : null}
            {error ? <p className="flow-error">{error}</p> : null}
            <button type="button" className="flow-btn wide" onClick={confirmContribution}>
              Confirm demo contribution
              {resolveAmount() != null ? ` — ${formatINR(resolveAmount()!)}` : ''}
            </button>
            <p className="flow-disclaimer">Demo only. No payment collected.</p>
            <button type="button" className="flow-link" onClick={() => setPanel('play')}>
              Back
            </button>
          </div>
        ) : null}

        {step === 'thanks' ? (
          <div className="flow-thanks">
            <div className="flow-mini-scene">{scene}</div>
            <h2>Thank you for your support.</h2>
            <p>Demo contribution: {formatINR(recordedAmount ?? 0)}</p>
            <p className="muted">{thanksLine}</p>
            <div className="flow-thanks-links">
              <button type="button" className="flow-link" onClick={replayAll}>
                Replay
              </button>
              <span aria-hidden="true">|</span>
              {preview ? (
                <span className="flow-link muted">Back to campaign</span>
              ) : (
                <Link to={`/campaigns/${campaign.id}`} className="flow-link">
                  Back to campaign
                </Link>
              )}
            </div>
            <p className="flow-disclaimer">No money collected.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Shared pointer-drag helper: returns progress 0–1 based on drag along an axis. */
export function useDragProgress(options: {
  axis: 'x' | 'y'
  invert?: boolean
  threshold?: number
  onProgress: (value: number) => void
}) {
  const dragging = useRef(false)
  const start = useRef(0)
  const size = useRef(1)
  const id = useId()

  function pointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    dragging.current = true
    const rect = target.getBoundingClientRect()
    size.current = Math.max(1, options.axis === 'x' ? rect.width : rect.height)
    start.current = options.axis === 'x' ? event.clientX : event.clientY
  }

  function pointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging.current) return
    const delta = (options.axis === 'x' ? event.clientX : event.clientY) - start.current
    let ratio = delta / (size.current * 0.55)
    if (options.invert) ratio = -ratio
    options.onProgress(Math.max(0, Math.min(1, ratio)))
  }

  function pointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging.current) return
    dragging.current = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  return {
    id,
    handlers: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: pointerUp,
    },
  }
}
