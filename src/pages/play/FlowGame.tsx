import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { ContributionBar } from '../../components/ContributionBar.tsx'
import { Leaderboard } from '../../components/Leaderboard.tsx'
import { ContributionLayer } from '../../components/ContributionDialogs.tsx'
import { useGameContribution } from '../../hooks/useGameContribution.ts'
import { campaignDetailsPath } from '../../lib/campaigns.ts'
import { newRoundId, readProgress, writeProgress } from '../../lib/gameLedger.ts'
import { clampToNextStage, settledProgress } from '../../lib/stages.ts'
import type { CampaignView, GameType } from '../../lib/types.ts'
import { animationDelay } from '../../lib/motion.ts'

export interface FlowCopy {
  title: string
  hint: string
  actionTitle: string
  revealTitle: string
  revealBody: string
}

export interface StageText {
  /** Saved with the action, e.g. "Zipped to 50%". */
  label: (stage: number) => string
  /** Checkpoint heading, e.g. "Zipped to 50%!". */
  heading: (stage: number) => string
  /** Keyboard and touch alternative, e.g. "Zip to 50%". */
  step: (stage: number) => string
  /** Short name for the stage tracker, e.g. "50%". */
  name: (stage: number) => string
}

export interface SceneArgs {
  progress: number
  done: number
  complete: boolean
  dragging: boolean
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  }
  slider: {
    role: 'slider'
    tabIndex: number
    'aria-valuemin': number
    'aria-valuemax': number
    'aria-valuenow': number
    'aria-valuetext': string
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
  }
}

interface StagedProgress {
  roundId: string
  done: number
}

/**
 * Drag travel mapped onto fixed checkpoints. Progress stops at the next uncompleted
 * checkpoint, so a single fast gesture can complete only one stage, and moving back
 * over a completed stage never completes it again.
 */
function useStagedDrag(options: {
  boundaries: number[]
  done: number
  paused: boolean
  mode: 'right' | 'up' | 'unfold'
  distance: number
  onReach: (stageIndex: number) => void
}) {
  const { boundaries, done, paused, mode, distance, onReach } = options
  const [progress, setProgressState] = useState(() => settledProgress(done, boundaries))
  const [dragging, setDragging] = useState(false)
  const progressRef = useRef(progress)
  const active = useRef(false)
  const awaiting = useRef(false)
  const origin = useRef({ x: 0, y: 0, progress: 0 })

  useEffect(() => {
    awaiting.current = false
  }, [done])

  function setProgress(value: number) {
    progressRef.current = value
    setProgressState(value)
  }

  function reach() {
    awaiting.current = true
    active.current = false
    setDragging(false)
    onReach(done)
  }

  function blocked() {
    return paused || awaiting.current || done >= boundaries.length
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (blocked()) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    active.current = true
    setDragging(true)
    origin.current = { x: event.clientX, y: event.clientY, progress: progressRef.current }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!active.current) return
    const dx = event.clientX - origin.current.x
    const dy = event.clientY - origin.current.y
    const delta = mode === 'unfold' ? -dx * 0.85 + dy : mode === 'up' ? -dy : dx
    const result = clampToNextStage(origin.current.progress + delta / distance, done, boundaries)
    setProgress(result.progress)
    if (result.reached) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // Already released.
      }
      reach()
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!active.current) return
    active.current = false
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Already released.
    }
  }

  function advance() {
    if (blocked()) return
    setProgress(boundaries[done])
    reach()
  }

  function reset(value = 0) {
    awaiting.current = false
    active.current = false
    setDragging(false)
    setProgress(value)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (['ArrowRight', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      advance()
    }
  }

  return { progress, dragging, advance, reset, onKeyDown, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } }
}

function parseStaged(stages: number) {
  return (value: unknown): StagedProgress | null => {
    if (!value || typeof value !== 'object') return null
    const raw = value as StagedProgress
    if (typeof raw.roundId !== 'string' || !Number.isInteger(raw.done)) return null
    return { roundId: raw.roundId, done: Math.max(0, Math.min(stages, raw.done)) }
  }
}

/** Shared single-object game: one realistic object, staged checkpoints, and the contribution bar. */
export function StagedFlowGame({
  view,
  game,
  preview = false,
  copy,
  boundaries,
  mode,
  distance,
  text,
  stageNoun,
  renderScene,
  footnote,
}: {
  view: CampaignView
  game: GameType
  preview?: boolean
  copy: FlowCopy
  boundaries: number[]
  mode: 'right' | 'up' | 'unfold'
  distance: number
  text: StageText
  stageNoun: string
  renderScene: (args: SceneArgs) => ReactNode
  footnote?: ReactNode
}) {
  const campaignId = view.campaign.id
  const stages = boundaries.length
  const contribution = useGameContribution({ view, game, preview })
  const [round, setRound] = useState<StagedProgress>(
    () => (preview ? null : readProgress(campaignId, game, parseStaged(stages))) ?? { roundId: newRoundId(), done: 0 },
  )
  const roundRef = useRef(round)
  const complete = round.done >= stages

  function save(next: StagedProgress) {
    roundRef.current = next
    setRound(next)
    if (!preview) writeProgress(campaignId, game, next)
  }

  const drag = useStagedDrag({
    boundaries,
    done: round.done,
    paused: contribution.paused,
    mode,
    distance,
    onReach: (stageIndex) => {
      const current = roundRef.current
      window.setTimeout(() => {
        const latest = roundRef.current
        if (latest.roundId !== current.roundId || latest.done !== stageIndex) return
        const stage = stageIndex + 1
        save({ ...latest, done: stage })
        contribution.record({
          actionId: `${latest.roundId}:stage-${stage}`,
          roundId: latest.roundId,
          label: text.label(stage),
          heading: text.heading(stage),
          roundComplete: stage >= stages,
        })
      }, animationDelay(380))
    },
  })

  function nextRound() {
    save({ roundId: newRoundId(), done: 0 })
    drag.reset(0)
  }

  const valueNow = Math.round(drag.progress * 100)
  const title = complete ? copy.revealTitle : round.done === 0 && drag.progress < 0.02 ? copy.title : copy.actionTitle

  return (
    <>
      <div
        className={`flow-shell${preview ? ' flow-preview' : ''}`}
        inert={contribution.paused || undefined}
        data-game-root
        tabIndex={-1}
      >
        <header className="flow-header">
          {preview ? (
            <span className="flow-brand">Together</span>
          ) : (
            <Link to={campaignDetailsPath(campaignId)} className="flow-brand">
              Together <span className="sr-only">— about this campaign</span>
            </Link>
          )}
          <span className="flow-demo">{preview ? 'Preview' : 'Demo campaign'}</span>
        </header>
        <div className="flow-main">
          <div className="flow-stage">
            <div className="flow-copy">
              <h1>{title}</h1>
              <p>{complete ? copy.revealBody : copy.hint}</p>
            </div>
            <div className="flow-scene">
              {renderScene({
                progress: drag.progress,
                done: round.done,
                complete,
                dragging: drag.dragging,
                handlers: drag.handlers,
                slider: {
                  role: 'slider',
                  tabIndex: complete ? -1 : 0,
                  'aria-valuemin': 0,
                  'aria-valuemax': 100,
                  'aria-valuenow': valueNow,
                  'aria-valuetext': `${round.done} of ${stages} ${stageNoun}s complete`,
                  onKeyDown: drag.onKeyDown,
                },
              })}
            </div>
            <ol className="flow-stages" aria-label={`${stageNoun}s`}>
              {boundaries.map((_, index) => (
                <li key={index} className={index < round.done ? 'done' : index === round.done ? 'next' : ''}>
                  <span aria-hidden="true">{index < round.done ? '✓' : index + 1}</span>
                  {text.name(index + 1)}
                  <span className="sr-only">{index < round.done ? ' complete' : ''}</span>
                </li>
              ))}
            </ol>
            {footnote && complete ? <div className="flow-footnote">{footnote}</div> : null}
            <div className="flow-actions">
              {complete ? (
                <button type="button" className="flow-btn" onClick={nextRound}>
                  {contribution.config.roundCompleteLabel}
                </button>
              ) : (
                <button type="button" className="flow-btn outline" onClick={drag.advance} disabled={contribution.paused}>
                  {text.step(round.done + 1)}
                </button>
              )}
              <button type="button" className="flow-link" onClick={() => contribution.requestRestart(nextRound)}>
                Start over
              </button>
            </div>
          </div>
        </div>
        {view.campaign.access === 'closed' ? <Leaderboard campaignId={campaignId} compact /> : null}
        <ContributionBar contribution={contribution} />
      </div>
      <ContributionLayer contribution={contribution} onNextRound={nextRound} />
    </>
  )
}
