import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useGameContribution } from '../../hooks/useGameContribution.ts'
import { newRoundId, readProgress, writeProgress } from '../../lib/gameLedger.ts'
import type { CampaignView } from '../../lib/types.ts'
import { animationDelay } from '../../lib/motion.ts'
import { GameFrame, GameTitle } from './GameFrame.tsx'

const COLS = 3
const ROWS = 3
const CELL_W = 100
const CELL_H = 75
const BOARD_W = COLS * CELL_W
const BOARD_H = ROWS * CELL_H
/** Order in which slots are left open, so any round size spreads the gaps across the picture. */
const OPEN_ORDER = [1, 3, 8, 5, 6, 0, 7, 2, 4]
const TOTAL = COLS * ROWS
const DEFAULT_ART = '/games/puzzle-art.jpg'

type Edge = -1 | 0 | 1

/** Tab on the right edge of cells in columns 0 and 1. */
const RIGHT: Edge[][] = [
  [1, -1],
  [-1, 1],
  [1, -1],
]
/** Tab on the bottom edge of cells in rows 0 and 1. */
const BOTTOM: Edge[][] = [
  [-1, 1, -1],
  [1, -1, 1],
]

function edges(index: number) {
  const column = index % COLS
  const row = Math.floor(index / COLS)
  const top: Edge = row === 0 ? 0 : ((-BOTTOM[row - 1][column]) as Edge)
  const right: Edge = column === COLS - 1 ? 0 : RIGHT[row][column]
  const bottom: Edge = row === ROWS - 1 ? 0 : BOTTOM[row][column]
  const left: Edge = column === 0 ? 0 : ((-RIGHT[row][column - 1]) as Edge)
  return { row, column, top, right, bottom, left }
}

function edgePath(
  x: number,
  y: number,
  ux: number,
  uy: number,
  px: number,
  py: number,
  length: number,
  tab: Edge,
) {
  const end = `${(x + ux * length).toFixed(2)} ${(y + uy * length).toFixed(2)}`
  if (tab === 0) return `L ${end}`
  const at = (along: number, out: number) => {
    const pointX = x + ux * along + px * out * tab
    const pointY = y + uy * along + py * out * tab
    return `${pointX.toFixed(2)} ${pointY.toFixed(2)}`
  }
  const mid = length / 2
  return [
    `L ${at(mid - 14, 0)}`,
    `C ${at(mid - 15, 7)} ${at(mid - 18, 12)} ${at(mid - 12, 16)}`,
    `C ${at(mid - 8, 24)} ${at(mid + 8, 24)} ${at(mid + 12, 16)}`,
    `C ${at(mid + 18, 12)} ${at(mid + 15, 7)} ${at(mid + 14, 0)}`,
    `L ${end}`,
  ].join(' ')
}

function piecePath(index: number) {
  const { row, column, top, right, bottom, left } = edges(index)
  const x = column * CELL_W
  const y = row * CELL_H
  return [
    `M ${x} ${y}`,
    edgePath(x, y, 1, 0, 0, -1, CELL_W, top),
    edgePath(x + CELL_W, y, 0, 1, 1, 0, CELL_H, right),
    edgePath(x + CELL_W, y + CELL_H, -1, 0, 0, 1, CELL_W, bottom),
    edgePath(x, y + CELL_H, 0, -1, -1, 0, CELL_H, left),
    'Z',
  ].join(' ')
}

function pieceViewBox(index: number) {
  const { row, column, top, right, bottom, left } = edges(index)
  const pad = 28
  const x = column * CELL_W - (left === 1 ? pad : 3)
  const y = row * CELL_H - (top === 1 ? pad : 3)
  const width = CELL_W + (left === 1 ? pad : 3) + (right === 1 ? pad : 3)
  const height = CELL_H + (top === 1 ? pad : 3) + (bottom === 1 ? pad : 3)
  return `${x} ${y} ${width} ${height}`
}

function shuffle(pieces: number[]) {
  const next = [...pieces]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swap]
    next[swap] = current
  }
  return next
}

interface PuzzleProgress {
  roundId: string
  slots: number[]
  placed: number[]
}

function freshPuzzle(open: number): PuzzleProgress {
  return { roundId: newRoundId(), slots: OPEN_ORDER.slice(0, open), placed: [] }
}

function parsePuzzle(value: unknown): PuzzleProgress | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as PuzzleProgress
  const isSlot = (item: unknown): item is number => Number.isInteger(item) && (item as number) >= 0 && (item as number) < TOTAL
  if (typeof raw.roundId !== 'string' || !Array.isArray(raw.slots) || !Array.isArray(raw.placed)) return null
  const slots = [...new Set(raw.slots.filter(isSlot))]
  if (slots.length === 0) return null
  return { roundId: raw.roundId, slots, placed: [...new Set(raw.placed.filter((slot) => isSlot(slot) && slots.includes(slot)))] }
}

function PieceArt({
  art,
  clipId,
  preview = false,
}: {
  art: string
  clipId: string
  preview?: boolean
}) {
  return (
    <g clipPath={`url(#${clipId})`} opacity={preview ? 0.42 : 1}>
      <image href={art} x="0" y="0" width={BOARD_W} height={BOARD_H} preserveAspectRatio="xMidYMid slice" />
    </g>
  )
}

export function PuzzleGame({
  view,
  preview = false,
}: {
  view: CampaignView
  preview?: boolean
}) {
  const campaignId = view.campaign.id
  const art = view.campaign.puzzleImageData || DEFAULT_ART
  const uid = useId().replace(/:/g, '')
  const contribution = useGameContribution({ view, game: 'puzzle', preview })
  const openCount = contribution.settings.actionsPerRound
  const [progress, setProgress] = useState<PuzzleProgress>(
    () => (preview ? null : readProgress(campaignId, 'puzzle', parsePuzzle)) ?? freshPuzzle(openCount),
  )
  const progressRef = useRef(progress)
  const [tray, setTray] = useState<number[]>(() => shuffle(progress.slots.filter((slot) => !progress.placed.includes(slot))))
  const [picked, setPicked] = useState<number | null>(null)
  const [snapping, setSnapping] = useState<number | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [wrong, setWrong] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const board = Array.from({ length: TOTAL }, (_, slot) =>
    progress.slots.includes(slot) && !progress.placed.includes(slot) && snapping !== slot ? null : slot,
  )
  const placedTotal = TOTAL - progress.slots.length + progress.placed.length
  const roundDone = progress.placed.length === progress.slots.length

  function save(next: PuzzleProgress) {
    progressRef.current = next
    setProgress(next)
    if (!preview) writeProgress(campaignId, 'puzzle', next)
  }

  function newPuzzle() {
    const next = freshPuzzle(openCount)
    save(next)
    setTray(shuffle(next.slots))
    setPicked(null)
    setWrong(null)
    setSnapping(null)
    setStatus('A new puzzle is ready.')
  }

  function place(slot: number) {
    const current = progressRef.current
    if (contribution.paused || snapping != null) return
    if (!current.slots.includes(slot) || current.placed.includes(slot)) return
    if (picked == null) {
      setStatus('Choose a piece from the tray first.')
      return
    }
    if (picked !== slot) {
      setWrong(slot)
      setStatus('That piece belongs somewhere else. Nothing was added.')
      window.setTimeout(() => setWrong(null), 450)
      return
    }
    setSnapping(slot)
    setTray((items) => items.filter((piece) => piece !== slot))
    setPicked(null)
    window.setTimeout(() => {
      const latest = progressRef.current
      setSnapping(null)
      if (latest.roundId !== current.roundId || latest.placed.includes(slot)) return
      const placed = [...latest.placed, slot]
      save({ ...latest, placed })
      setStatus(`Piece ${slot + 1} is locked in place.`)
      contribution.record({
        actionId: `${latest.roundId}:piece-${slot}`,
        roundId: latest.roundId,
        label: `Placed piece ${slot + 1}`,
        heading: placed.length === latest.slots.length ? 'You finished the puzzle!' : 'The piece snapped into place!',
        roundComplete: placed.length === latest.slots.length,
      })
    }, animationDelay(450))
  }

  function onHoleKey(event: KeyboardEvent<SVGPathElement>, slot: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    place(slot)
  }

  return (
    <GameFrame
      view={view}
      game="puzzle"
      preview={preview}
      contribution={contribution}
      onNextRound={newPuzzle}
      side={
        <aside className="hud-card puzzle-hud">
          <p className="hud-label">Pieces placed</p>
          <p className="hud-big">
            {placedTotal} <span>of {TOTAL}</span>
          </p>
          <div className="hud-progress" aria-hidden="true">
            <span style={{ width: `${(placedTotal / TOTAL) * 100}%` }} />
          </div>
          <label className="preview-toggle">
            <span className="preview-toggle-label">
              <EyeIcon />
              Show preview
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showPreview}
              className={showPreview ? 'switch on' : 'switch'}
              onClick={() => setShowPreview((value) => !value)}
            >
              <span />
            </button>
          </label>
          <p className="hud-status" role="status">
            {status}
          </p>
          {roundDone ? (
            <button type="button" className="replay primary" onClick={newPuzzle}>
              Play another puzzle
            </button>
          ) : null}
          <button type="button" className="replay puzzle-restart" onClick={() => contribution.requestRestart(newPuzzle)}>
            ↻ Restart
          </button>
          <FlowerMark />
        </aside>
      }
    >
      <div className="scene scene-puzzle" style={{ ['--puzzle-art' as string]: `url("${art}")` }}>
        <GameTitle game="puzzle" organizer={view.campaign.organizerName} />
        <div className="jigsaw-plate">
          <svg className="jigsaw-board" viewBox="-32 -32 364 289" role="group" aria-label="Community puzzle board">
            <defs>
              {Array.from({ length: TOTAL }, (_, index) => (
                <clipPath id={`${uid}-piece-${index}`} key={index}>
                  <path d={piecePath(index)} />
                </clipPath>
              ))}
            </defs>
            {board.map((piece, slot) => {
              const path = piecePath(slot)
              if (piece == null) {
                return (
                  <g
                    key={slot}
                    data-slot={slot}
                    className={`jigsaw-hole${wrong === slot ? ' wrong' : ''}${showPreview ? ' preview' : ''}`}
                  >
                    {showPreview ? (
                      <PieceArt art={art} clipId={`${uid}-piece-${slot}`} preview />
                    ) : null}
                    <path
                      d={path}
                      role="button"
                      tabIndex={0}
                      aria-label={`Empty space ${slot + 1}`}
                      onClick={() => place(slot)}
                      onKeyDown={(event) => onHoleKey(event, slot)}
                    />
                  </g>
                )
              }
              return (
                <g key={slot} className={snapping === slot ? 'jigsaw-piece snapping' : 'jigsaw-piece'}>
                  <PieceArt art={art} clipId={`${uid}-piece-${slot}`} />
                  <path d={path} />
                </g>
              )
            })}
          </svg>
        </div>
        <div className="puzzle-tray" role="group" aria-label="Pieces to place">
          {tray.length === 0 && snapping == null ? <p className="puzzle-done">Every piece is in place.</p> : null}
          {tray.map((piece) => (
            <button
              key={`${progress.roundId}-${piece}`}
              type="button"
              className={picked === piece ? 'tray-piece selected' : 'tray-piece'}
              onClick={() => {
                if (contribution.paused) return
                setPicked(piece)
                setStatus(`Piece ${piece + 1} selected. Choose its empty space.`)
              }}
              aria-pressed={picked === piece}
              aria-label={`Puzzle piece ${piece + 1}`}
            >
              <svg viewBox={pieceViewBox(piece)} aria-hidden="true">
                <defs>
                  <clipPath id={`${uid}-tray-${piece}`}>
                    <path d={piecePath(piece)} />
                  </clipPath>
                </defs>
                <PieceArt art={art} clipId={`${uid}-tray-${piece}`} />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </GameFrame>
  )
}

function EyeIcon() {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function FlowerMark(): ReactNode {
  return (
    <svg className="puzzle-flowers" viewBox="0 0 88 36" aria-hidden="true">
      <path d="M8 34c8-10 14-16 22-22" fill="none" stroke="#7d9a55" strokeWidth="1.4" />
      <path d="M52 34c-6-12-8-18-6-26" fill="none" stroke="#7d9a55" strokeWidth="1.4" />
      <circle cx="30" cy="10" r="4.2" fill="#f2d15a" />
      <circle cx="46" cy="8" r="3.2" fill="#f4f7ef" />
      <circle cx="30" cy="10" r="1.5" fill="#c9842a" />
      <circle cx="62" cy="16" r="3.4" fill="#f6f3ea" />
      <circle cx="70" cy="12" r="2.2" fill="#f2d15a" />
    </svg>
  )
}
