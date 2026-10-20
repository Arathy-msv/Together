import { useRef, useState, type KeyboardEvent } from 'react'
import { LeafMark } from '../../components/illustrations.tsx'
import { useGameContribution } from '../../hooks/useGameContribution.ts'
import { newRoundId, readProgress, writeProgress } from '../../lib/gameLedger.ts'
import { FLOWER_OPTIONS, flowerLabel } from '../../lib/pending.ts'
import type { CampaignView, FlowerKind } from '../../lib/types.ts'

const PLANTS: Record<FlowerKind, string> = {
  sunflower: '/games/plant-sunflower.png',
  marigold: '/games/plant-marigold.png',
  lavender: '/games/plant-lavender.png',
}

/**
 * Corners of the three dashed beds painted into the garden artwork,
 * as percentages of that 16:9 image. The yellow highlighter strokes
 * these same points, so it sits on the white outline.
 */
const BEDS: [number, number][][] = [
  [
    [30.2, 63.2],
    [41.9, 63.2],
    [40.3, 71.8],
    [26.5, 71.8],
  ],
  [
    [45.6, 62.8],
    [58.4, 62.8],
    [59.2, 71.8],
    [44.2, 71.8],
  ],
  [
    [61.6, 63.2],
    [74.6, 63.2],
    [76.6, 67.6],
    [77.8, 71.2],
    [77.3, 71.8],
    [62.7, 71.8],
  ],
]

function bedBase(index: number) {
  const bed = BEDS[index]
  const left = bed[bed.length - 1]
  const right = bed[bed.length - 2]
  return {
    x: (left[0] + right[0]) / 2,
    y: (left[1] + right[1]) / 2,
  }
}
import { animationDelay } from '../../lib/motion.ts'
import { GameFrame, GameTitle } from './GameFrame.tsx'

const PLOTS = BEDS.length

interface GardenProgress {
  bedId: string
  bedNumber: number
  spots: Array<FlowerKind | null>
}

function isFlower(value: unknown): value is FlowerKind {
  return value === 'sunflower' || value === 'marigold' || value === 'lavender'
}

function parseGarden(value: unknown): GardenProgress | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as GardenProgress
  if (typeof raw.bedId !== 'string' || !Array.isArray(raw.spots)) return null
  return {
    bedId: raw.bedId,
    bedNumber: Number.isInteger(raw.bedNumber) && raw.bedNumber > 0 ? raw.bedNumber : 1,
    spots: Array.from({ length: PLOTS }, (_, index) => (isFlower(raw.spots[index]) ? raw.spots[index] : null)),
  }
}

function freshBed(bedNumber: number): GardenProgress {
  return { bedId: `bed-${newRoundId()}`, bedNumber, spots: Array(PLOTS).fill(null) }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function GardenGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const campaignId = view.campaign.id
  const contribution = useGameContribution({ view, game: 'garden', preview })
  const [flower, setFlower] = useState<FlowerKind>('sunflower')
  const [progress, setProgress] = useState<GardenProgress>(
    () => (preview ? null : readProgress(campaignId, 'garden', parseGarden)) ?? freshBed(1),
  )
  const progressRef = useRef(progress)
  const [planting, setPlanting] = useState<{ index: number; flower: FlowerKind } | null>(null)
  const [active, setActive] = useState(() => Math.max(0, progress.spots.findIndex((item) => !item)))
  const [status, setStatus] = useState('')
  const planted = progress.spots.filter(Boolean).length
  const bedFull = planted === PLOTS

  function save(next: GardenProgress) {
    progressRef.current = next
    setProgress(next)
    if (!preview) writeProgress(campaignId, 'garden', next)
  }

  function plantAt(index: number) {
    if (contribution.paused || planting) return
    const current = progressRef.current
    const existing = current.spots[index]
    if (existing) {
      setStatus(`Plot ${index + 1} already has a ${flowerLabel(existing)}. Choose an empty plot.`)
      return
    }
    const chosen = flower
    setActive(index)
    setStatus(`Planting a ${flowerLabel(chosen)} in plot ${index + 1}…`)
    setPlanting({ index, flower: chosen })
    window.setTimeout(() => {
      const latest = progressRef.current
      if (latest.bedId !== current.bedId || latest.spots[index]) {
        setPlanting(null)
        return
      }
      const spots = latest.spots.map((item, spot) => (spot === index ? chosen : item))
      save({ ...latest, spots })
      setPlanting(null)
      const nextEmpty = spots.findIndex((item) => !item)
      setActive(nextEmpty === -1 ? index : nextEmpty)
      setStatus(`Planted a ${flowerLabel(chosen)} in plot ${index + 1}.`)
      contribution.record({
        actionId: `${latest.bedId}:plot-${index + 1}`,
        roundId: latest.bedId,
        label: `${capitalize(flowerLabel(chosen))} in plot ${index + 1}`,
        heading: `You planted a ${flowerLabel(chosen)}!`,
        roundComplete: nextEmpty === -1,
      })
    }, animationDelay(750))
  }

  function plantSelected() {
    const spots = progressRef.current.spots
    const index = spots[active] ? spots.findIndex((item) => !item) : active
    if (index < 0) {
      setStatus('This bed is full. Start the next garden bed to keep planting.')
      return
    }
    plantAt(index)
  }

  function nextBed() {
    save(freshBed(progressRef.current.bedNumber + 1))
    setActive(0)
    setStatus('A fresh garden bed is ready.')
  }

  function replay() {
    contribution.requestRestart(() => {
      save(freshBed(1))
      setActive(0)
      setStatus('The garden is ready for a new round.')
    })
  }

  function onPlotKey(event: KeyboardEvent<SVGPolygonElement>, index: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    plantAt(index)
  }

  const visibleSpots = progress.spots.map((item, index) => (planting?.index === index ? planting.flower : item))

  return (
    <GameFrame
      view={view}
      game="garden"
      preview={preview}
      contribution={contribution}
      onNextRound={nextBed}
      side={
        <aside className="hud-card">
          <h2>Your garden</h2>
          <p className="hud-count">
            <i />
            {planted} of {PLOTS} planted · Bed {progress.bedNumber}
          </p>
          <div className="hud-flowers">
            {progress.spots.map((item, index) => (
              <span key={index} className={item ? 'filled' : ''}>
                {item ? <img src={PLANTS[item]} alt="" /> : null}
              </span>
            ))}
          </div>
          <p className="hud-status" role="status">
            {status || 'Choose a flower, then select an empty plot.'}
          </p>
          {bedFull ? (
            <button type="button" className="replay primary" onClick={nextBed}>
              Next garden bed
            </button>
          ) : null}
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
              className={!visibleSpots[index] && index === active ? 'bed-shape active' : 'bed-shape'}
              onClick={() => plantAt(index)}
              onKeyDown={(event) => onPlotKey(event, index)}
              tabIndex={0}
              role="button"
              aria-disabled={Boolean(visibleSpots[index])}
              aria-label={
                visibleSpots[index]
                  ? `Plot ${index + 1} has a ${flowerLabel(visibleSpots[index]!)}`
                  : `Plant a ${flowerLabel(flower)} in plot ${index + 1}`
              }
            />
          ))}
        </svg>
        {visibleSpots.map((item, index) => {
          if (!item) return null
          const base = bedBase(index)
          return (
            <img
              key={`${progress.bedId}-${index}`}
              className={`garden-plant ${item}${planting?.index === index ? ' growing' : ''}`}
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
              aria-pressed={flower === option.id}
              onClick={() => setFlower(option.id)}
            >
              <img src={PLANTS[option.id]} alt="" />
              <span>{option.name}</span>
            </button>
          ))}
          <span className="dock-divider" aria-hidden="true" />
          <button type="button" className="plant-btn" onClick={bedFull ? nextBed : plantSelected} disabled={Boolean(planting)}>
            <LeafMark size={18} />
            {bedFull ? 'Next garden bed' : 'Plant a flower'}
          </button>
        </div>
      </div>
    </GameFrame>
  )
}
