import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { GameFrame, GameTitle } from './GameFrame.tsx'

const FACES = [
  { id: 'fox', src: '/games/card-fox.jpg', label: 'fox' },
  { id: 'bird', src: '/games/card-bird.jpg', label: 'bird' },
  { id: 'sun', src: '/games/card-sun.jpg', label: 'sunflower' },
  { id: 'books', src: '/games/card-books.jpg', label: 'books' },
  { id: 'heart', src: '/games/card-heart.jpg', label: 'heart' },
  { id: 'leaf', src: '/games/card-leaf.jpg', label: 'leaf' },
]

interface MemoryCard {
  key: string
  face: string
  src: string
  label: string
}

function deal(): MemoryCard[] {
  const cards = FACES.flatMap((face) => [
    { key: `${face.id}-a`, face: face.id, src: face.src, label: face.label },
    { key: `${face.id}-b`, face: face.id, src: face.src, label: face.label },
  ])
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = cards[index]
    cards[index] = cards[swap]
    cards[swap] = current
  }
  return cards
}

export function MemoryGame({ view }: { view: CampaignView }) {
  const [cards, setCards] = useState(deal)
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)
  const pairs = matched.length

  function restart() {
    setCards(deal())
    setOpen([])
    setMatched([])
    setMoves(0)
    setLock(false)
  }

  function flip(card: MemoryCard) {
    if (lock || matched.includes(card.face) || open.includes(card.key)) return
    const next = [...open, card.key]
    if (next.length === 1) {
      setOpen(next)
      return
    }
    setMoves((value) => value + 1)
    const first = cards.find((item) => item.key === next[0])
    if (first && first.face === card.face) {
      setMatched((current) => [...current, first.face])
      setOpen([])
      return
    }
    setOpen(next)
    setLock(true)
    window.setTimeout(() => {
      setOpen([])
      setLock(false)
    }, 700)
  }

  return (
    <GameFrame
      view={view}
      game="memory"
      note={moves > 0 ? `Found ${pairs} of 6 pairs in ${moves} moves.` : undefined}
      side={
        <aside className="hud-card">
          <p className="hud-label">Pairs found</p>
          <p className="hud-big">
            {pairs} <span>of 6</span>
          </p>
          <p className="hud-label">Moves</p>
          <p className="hud-big">{moves}</p>
          <button type="button" className="replay" onClick={restart}>
            ↻ Restart
          </button>
        </aside>
      }
    >
      <div className="scene scene-memory">
        <GameTitle game="memory" organizer={view.campaign.organizerName} />
        <div className="memory-grid">
          {cards.map((card) => {
            const up = open.includes(card.key) || matched.includes(card.face)
            return (
              <button
                key={card.key}
                type="button"
                className={up ? 'mem-card up' : 'mem-card'}
                onClick={() => flip(card)}
                aria-label={up ? card.label : 'Hidden card'}
              >
                <span className="mem-inner">
                  <span className="mem-back" />
                  <span className="mem-face" style={{ backgroundImage: `url(${card.src})` }} />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </GameFrame>
  )
}
