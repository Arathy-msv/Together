import { useState } from 'react'
import { LeafMark } from '../../components/illustrations.tsx'
import { describePlanting, FLOWER_OPTIONS, readGarden, writeGarden } from '../../lib/pending.ts'
import type { CampaignView, FlowerKind } from '../../lib/types.ts'

const PLANTS: Record<FlowerKind, string> = {
  sunflower: '/games/plant-sunflower.png',
  marigold: '/games/plant-marigold.png',
  lavender: '/games/plant-lavender.png',
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
        <div className="soil-plots">
          {spots.map((item, index) => (
            <button
              key={index}
              type="button"
              className={!item && index === active ? 'soil-plot active' : 'soil-plot'}
              onClick={() => plantAt(index)}
              aria-label={item ? `Change the flower in plot ${index + 1}` : `Plant a ${flower} in plot ${index + 1}`}
            >
              {item ? <img className={`garden-plant ${item}`} src={PLANTS[item]} alt="" /> : null}
            </button>
          ))}
        </div>
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
