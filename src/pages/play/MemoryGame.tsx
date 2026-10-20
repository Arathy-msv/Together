import { useRef, useState } from 'react'
import { useGameContribution } from '../../hooks/useGameContribution.ts'
import { newRoundId, readProgress, writeProgress } from '../../lib/gameLedger.ts'
import type { CampaignView } from '../../lib/types.ts'
import { animationDelay } from '../../lib/motion.ts'
import { GameFrame, GameTitle } from './GameFrame.tsx'

const FACES = [
  { id: 'fox', src: '/games/card-fox.jpg', label: 'fox' },
  { id: 'bird', src: '/games/card-bird.jpg', label: 'bird' },
  { id: 'sun', src: '/games/card-sun.jpg', label: 'sunflower' },
  { id: 'books', src: '/games/card-books.jpg', label: 'books' },
  { id: 'heart', src: '/games/card-heart.jpg', label: 'heart' },
  { id: 'leaf', src: '/games/card-leaf.jpg', label: 'leaf' },
]

interface MemoryProgress {
  roundId: string
  order: string[]
  matched: string[]
  moves: number
}

function faceOf(key: string) {
  return FACES.find((face) => key.startsWith(`${face.id}-`))
}

function deal(pairs: number): MemoryProgress {
  const keys = FACES.slice(0, pairs).flatMap((face) => [`${face.id}-a`, `${face.id}-b`])
  for (let index = keys.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = keys[index]
    keys[index] = keys[swap]
    keys[swap] = current
  }
  return { roundId: newRoundId(), order: keys, matched: [], moves: 0 }
}

function parseMemory(value: unknown): MemoryProgress | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as MemoryProgress
  if (typeof raw.roundId !== 'string' || !Array.isArray(raw.order) || !Array.isArray(raw.matched)) return null
  if (raw.order.length < 4 || raw.order.length % 2 !== 0 || !raw.order.every((key) => typeof key === 'string' && faceOf(key))) {
    return null
  }
  const faces = new Set(raw.order.map((key) => faceOf(key)!.id))
  return {
    roundId: raw.roundId,
    order: raw.order,
    matched: raw.matched.filter((face): face is string => typeof face === 'string' && faces.has(face)),
    moves: Number.isInteger(raw.moves) && raw.moves >= 0 ? raw.moves : 0,
  }
}

export function MemoryGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const campaignId = view.campaign.id
  const contribution = useGameContribution({ view, game: 'memory', preview })
  const pairsPerRound = contribution.settings.actionsPerRound
  const [progress, setProgress] = useState<MemoryProgress>(
    () => (preview ? null : readProgress(campaignId, 'memory', parseMemory)) ?? deal(pairsPerRound),
  )
  const progressRef = useRef(progress)
  const [open, setOpen] = useState<string[]>([])
  const [lock, setLock] = useState(false)
  const totalPairs = progress.order.length / 2
  const pairs = progress.matched.length
  const roundDone = pairs === totalPairs

  function save(next: MemoryProgress) {
    progressRef.current = next
    setProgress(next)
    if (!preview) writeProgress(campaignId, 'memory', next)
  }

  function newRound() {
    save(deal(pairsPerRound))
    setOpen([])
    setLock(false)
  }

  function flip(key: string) {
    const current = progressRef.current
    const face = faceOf(key)
    if (!face || contribution.paused || lock || current.matched.includes(face.id) || open.includes(key)) return
    const next = [...open, key]
    if (next.length === 1) {
      setOpen(next)
      return
    }
    setOpen(next)
    setLock(true)
    const first = faceOf(next[0])
    const moves = current.moves + 1
    if (first?.id === face.id) {
      window.setTimeout(() => {
        const latest = progressRef.current
        if (latest.roundId !== current.roundId) return
        const matched = latest.matched.includes(face.id) ? latest.matched : [...latest.matched, face.id]
        save({ ...latest, matched, moves })
        setOpen([])
        setLock(false)
        contribution.record({
          actionId: `${latest.roundId}:pair-${face.id}`,
          roundId: latest.roundId,
          label: `Matched the ${face.label} pair`,
          heading: `You matched the ${face.label} pair!`,
          roundComplete: matched.length === latest.order.length / 2,
        })
      }, animationDelay(650))
      return
    }
    save({ ...current, moves })
    window.setTimeout(() => {
      setOpen([])
      setLock(false)
    }, animationDelay(750))
  }

  return (
    <GameFrame
      view={view}
      game="memory"
      preview={preview}
      contribution={contribution}
      onNextRound={newRound}
      side={
        <aside className="hud-card">
          <p className="hud-label">Pairs found</p>
          <p className="hud-big">
            {pairs} <span>of {totalPairs}</span>
          </p>
          <p className="hud-label">Moves</p>
          <p className="hud-big">{progress.moves}</p>
          {roundDone ? (
            <button type="button" className="replay primary" onClick={newRound}>
              Play another round
            </button>
          ) : null}
          <button type="button" className="replay" onClick={() => contribution.requestRestart(newRound)}>
            ↻ Restart
          </button>
        </aside>
      }
    >
      <div className="scene scene-memory">
        <GameTitle game="memory" organizer={view.campaign.organizerName} />
        <div className={totalPairs <= 3 ? 'memory-grid small' : 'memory-grid'} aria-busy={lock}>
          {progress.order.map((key, index) => {
            const face = faceOf(key)!
            const matched = progress.matched.includes(face.id)
            const up = open.includes(key) || matched
            return (
              <button
                key={`${progress.roundId}-${key}`}
                type="button"
                className={`mem-card${up ? ' up' : ''}${matched ? ' matched' : ''}`}
                onClick={() => flip(key)}
                aria-disabled={matched || lock}
                aria-label={up ? `Card ${index + 1}: ${face.label}${matched ? ', matched' : ''}` : `Card ${index + 1}: hidden`}
              >
                <span className="mem-inner">
                  <span className="mem-back" />
                  <span className="mem-face" style={{ backgroundImage: `url(${face.src})` }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </GameFrame>
  )
}
