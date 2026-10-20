import { useState } from 'react'
import { LeafMark } from '../../components/illustrations.tsx'
import { describePlanting, FLOWER_OPTIONS, readGarden, writeGarden } from '../../lib/pending.ts'
import type { CampaignView, FlowerKind } from '../../lib/types.ts'

const PLANTS: Record<FlowerKind, string> = {
  sunflower: '/games/plant-sunflower.png',
  marigold: '/games/plant-marigold.png',
  lavender: '/games/plant-lavender.png',
}

/** Perspective corners of the three dashed beds, as percentages of the 16:9 artwork. */
const BEDS: [number, number][][] = [
  [
    [30.4, 63.5],
    [41.0, 63.9],
    [44.2, 71.2],
    [25.6, 70.8],
  ],
  [
    [46.8, 65.8],
    [57.0, 66.2],
    [60.2, 73.6],
    [43.2, 73.2],
  ],
  [
    [64.8, 66.0],
    [75.5, 66.4],
    [78.9, 73.8],
    [61.0, 73.4],
  ],
]

function bedBase(index: number) {
  const bed = BEDS[index]
  const left = bed[3]
  const right = bed[2]
  return {
    x: (left[0] + right[0]) / 2,
    y: (left[1] + right[1]) / 2,
  }
}
import { GameFrame, GameTitle } from './GameFrame.tsx'

export function GardenGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const [flower, setFlower] = useState<FlowerKind>('sunflower')
  const [spots, setSpots] = useState<Array<FlowerKind | null>>(() => readGarden(view.campaign.id))
  const [active, setActive] = useState(() => {
    const saved = readGarden(view.campaign.id)
    const empty = saved.findIndex((item) => !item)
    return empty === -1 ? 0 : empty
  })
  const planted = spots.filter(Boolean).length

  function update(next: Array<FlowerKind | null>, index = active) {
    setSpots(next)
    setActive(index)
    writeGarden(view.campaign.id, next)
  }

  function plantAt(index: number) {
    const next = [...spots]
    next[index] = spots[index] === flower ? null : flower
    const empty = next.findIndex((item) => !item)
    update(next, next[index] ? (empty === -1 ? index : empty) : index)
  }

  function plantSelected() {
    const index = spots[active] ? spots.findIndex((item) => !item) : active
    if (index < 0) return
    plantAt(index)
  }

  function replay() {
    update([null, null, null], 0)
  }

  return (
    <GameFrame
      view={view}
      game="garden"
      preview={preview}
      note={describePlanting(spots)}
      side={
        <aside className="hud-card">
          <h2>Your garden</h2>
          <p className="hud-count">
            <i />
            {planted} of 3 planted
          </p>
          <div className="hud-flowers">
            {spots.map((item, index) => (
              <span key={index} className={item ? 'filled' : ''}>
                {item ? <img src={PLANTS[item]} alt="" /> : null}
              </span>
            ))}
          </div>
          <p>Choose a flower then select a plot.</p>
          <button type="button" className="replay" onClick={replay}>
            ↻ Replay
          </button>
        </aside>
      }
    >
      <div className="scene scene-garden">
        <GameTitle game="garden" organizer={view.campaign.organizerName} />
        <svg className="bed-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
          {BEDS.map((bed, index) => (
            <polygon
              key={index}
              points={bed.map(([x, y]) => `${x},${y}`).join(' ')}
              className={!spots[index] && index === active ? 'bed-shape active' : 'bed-shape'}
              onClick={() => plantAt(index)}
              role="button"
              aria-label={spots[index] ? `Change the flower in plot ${index + 1}` : `Plant a ${flower} in plot ${index + 1}`}
            />
          ))}
        </svg>
        {spots.map((item, index) => {
          if (!item) return null
          const base = bedBase(index)
          return (
            <img
              key={item + index}
              className={`garden-plant ${item}`}
              src={PLANTS[item]}
              alt=""
              style={{ left: `${base.x}%`, top: `${base.y}%` }}
            />
          )
        })}
        <div className="flower-dock">
          {FLOWER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={flower === option.id ? 'dock-flower selected' : 'dock-flower'}
              onClick={() => setFlower(option.id)}
            >
              <img src={PLANTS[option.id]} alt="" />
              <span>{option.name}</span>
            </button>
          ))}
          <span className="dock-divider" aria-hidden="true" />
          <button type="button" className="plant-btn" onClick={plantSelected}>
            <LeafMark size={18} />
            Plant a flower
          </button>
        </div>
      </div>
    </GameFrame>
  )
}
