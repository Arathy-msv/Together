import { useState, type CSSProperties } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { GameFrame, GameTitle } from './GameFrame.tsx'

const PIECES = [0, 1, 2, 3, 4, 5, 6, 7, 8]

function shuffle(): number[] {
  const pieces = [...PIECES]
  for (let index = pieces.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = pieces[index]
    pieces[index] = pieces[swap]
    pieces[swap] = current
  }
  return pieces
}

function pieceStyle(index: number): CSSProperties {
  const column = index % 3
  const row = Math.floor(index / 3)
  return {
    backgroundImage: 'url(/games/puzzle-art.jpg)',
    backgroundSize: '300% 300%',
    backgroundPosition: `${column * 50}% ${row * 50}%`,
  }
}

export function PuzzleGame({ view }: { view: CampaignView }) {
  const [tray, setTray] = useState<number[]>(() => shuffle())
  const [board, setBoard] = useState<Array<number | null>>(() => Array(9).fill(null))
  const [picked, setPicked] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const [wrong, setWrong] = useState<number | null>(null)
  const placed = board.filter((piece) => piece != null).length

  function restart() {
    setTray(shuffle())
    setBoard(Array(9).fill(null))
    setPicked(null)
    setWrong(null)
  }

  function place(slot: number) {
    if (picked == null || board[slot] != null) return
    if (picked !== slot) {
      setWrong(slot)
      window.setTimeout(() => setWrong(null), 450)
      return
    }
    setBoard((current) => current.map((piece, index) => (index === slot ? picked : piece)))
    setTray((current) => current.filter((piece) => piece !== picked))
    setPicked(null)
  }

  return (
    <GameFrame
      view={view}
      game="puzzle"
      note={placed > 0 ? `Placed ${placed} of 9 puzzle pieces.` : undefined}
      side={
        <aside className="hud-card">
          <p className="hud-label">Pieces placed</p>
          <p className="hud-big">
            {placed} <span>of 9</span>
          </p>
          <label className="preview-toggle">
            <span>Show preview</span>
            <button
              type="button"
              role="switch"
              aria-checked={preview}
              className={preview ? 'switch on' : 'switch'}
              onClick={() => setPreview((value) => !value)}
            >
              <span />
            </button>
          </label>
          <button type="button" className="replay" onClick={restart}>
            ↻ Restart
          </button>
        </aside>
      }
    >
      <div className="scene scene-puzzle">
        <GameTitle game="puzzle" organizer={view.campaign.organizerName} />
        <div className="puzzle-panel">
          <div className={preview ? 'puzzle-board preview' : 'puzzle-board'}>
            {board.map((piece, slot) => (
              <button
                key={slot}
                type="button"
                className={wrong === slot ? 'puzzle-slot wrong' : 'puzzle-slot'}
                onClick={() => place(slot)}
                aria-label={piece == null ? `Empty puzzle space ${slot + 1}` : `Puzzle piece ${slot + 1} placed`}
              >
                {piece == null ? null : <span className="puzzle-bit" style={pieceStyle(piece)} />}
              </button>
            ))}
          </div>
          <div className="puzzle-tray">
            {tray.map((piece) => (
              <button
                key={piece}
                type="button"
                className={picked === piece ? 'puzzle-bit tray selected' : 'puzzle-bit tray'}
                style={pieceStyle(piece)}
                onClick={() => setPicked(piece)}
                aria-label={`Puzzle piece ${piece + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </GameFrame>
  )
}
