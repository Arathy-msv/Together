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

/**
 * Pointer drag mapped to a 0–1 progress.
 * `right` / `up` move along one axis. `unfold` treats a down-left pull as opening a corner.
 * Progress continues from wherever the gesture starts, so you can drag, release, and drag again.
 */
export function useDragProgress(options: {
  axis?: 'x' | 'y'
  invert?: boolean
  mode?: 'right' | 'up' | 'unfold'
  /** Pixels of travel that take progress from 0 to 1. */
  distance?: number
  progress: number
  onProgress: (value: number) => void
}) {
  const dragging = useRef(false)
  const origin = useRef({ x: 0, y: 0, progress: 0 })
  const id = useId()

  function remember(value: number) {
    options.onProgress(value)
  }

  function pointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
    origin.current = { x: event.clientX, y: event.clientY, progress: options.progress }
  }

  function pointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    const distance = options.distance ?? 220
    let delta = dx
    if (options.mode === 'unfold') delta = -dx * 0.85 + dy
    else if (options.mode === 'up' || (options.axis === 'y' && options.invert)) delta = -dy
    else if (options.axis === 'y') delta = dy
    else if (options.invert) delta = -dx
    remember(Math.max(0, Math.min(1, origin.current.progress + delta / distance)))
  }

  function pointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging.current) return
    dragging.current = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // The pointer may already have been released.
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

/** Covered region of a square page as the top-right corner is peeled toward the bottom-left. */
export function pagePeel(progress: number): { cover: string; flap: string; showFlap: boolean } {
  const C = 100 - 200 * progress
  const inside = (x: number, y: number) => x - y <= C + 0.001
  const corners: [number, number][] = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ]
  const pts: [number, number][] = []
  for (let index = 0; index < 4; index += 1) {
    const start = corners[index]
    const end = corners[(index + 1) % 4]
    const startIn = inside(start[0], start[1])
    const endIn = inside(end[0], end[1])
    if (startIn && endIn) pts.push(end)
    else if (startIn && !endIn) pts.push(crossEdge(start, end, C))
    else if (!startIn && endIn) {
      pts.push(crossEdge(start, end, C))
      pts.push(end)
    }
  }
  const cover = pts.length >= 3 ? `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(',')})` : 'polygon(0 0, 0 0, 0 0)'
  const hits = foldHits(C)
  const tip: [number, number] = [100 - 200 * progress, 200 * progress]
  const flap = hits.length >= 2 ? `polygon(${[hits[0], hits[1], tip].map(([x, y]) => `${x},${y}`).join(' ')})` : ''
  return { cover, flap, showFlap: progress > 0.015 && progress < 0.58 && flap.length > 0 }
}

function crossEdge(start: [number, number], end: [number, number], limit: number): [number, number] {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const denom = dx - dy
  const t = denom === 0 ? 0 : (limit - (start[0] - start[1])) / denom
  const clamped = Math.min(1, Math.max(0, t))
  return [start[0] + clamped * dx, start[1] + clamped * dy]
}

function foldHits(limit: number): [number, number][] {
  const hits: [number, number][] = []
  if (limit >= 0 && limit <= 100) hits.push([limit, 0])
  const right = 100 - limit
  if (right >= 0 && right <= 100) hits.push([100, right])
  const bottom = limit + 100
  if (bottom >= 0 && bottom <= 100) hits.push([bottom, 100])
  const left = -limit
  if (left >= 0 && left <= 100) hits.push([0, left])
  return hits
}
