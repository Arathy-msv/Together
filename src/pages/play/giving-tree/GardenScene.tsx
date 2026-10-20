import { forwardRef, useEffect, type ReactNode } from 'react'
import { TREE_MILESTONES, type CareKind } from '../../../lib/givingTree.ts'

export const ART = '/giving-tree'

const PRELOAD = ['watering-can.webp', 'fertilizer-scoop.webp', 'coin.webp']

/** Decode the care props before the first animation, so a late image cannot finish invisible. */
function usePreloadArt() {
  useEffect(() => {
    for (const file of PRELOAD) {
      const image = new Image()
      image.src = `${ART}/${file}`
      image.decode?.().catch(() => undefined)
    }
  }, [])
}

export interface SceneEffect {
  kind: CareKind
  /** Changes every time an action starts so the same effect can replay. */
  key: number
}

interface GardenSceneProps {
  treeStage: number
  effect: SceneEffect | null
  treeCaption: string
  onTreeSign: () => void
  celebrating?: boolean
  overlay?: ReactNode
  toast?: ReactNode
}

/**
 * One shared campaign tree in the garden. Care effects play on that tree.
 * Its growth stage follows confirmed campaign progress only.
 */
export const GardenScene = forwardRef<HTMLDivElement, GardenSceneProps>(function GardenScene(
  { treeStage, effect, treeCaption, onTreeSign, celebrating = false, overlay, toast },
  treeRef,
) {
  usePreloadArt()
  const milestone = TREE_MILESTONES[treeStage]

  return (
    <section className={`gt-scene${effect ? ` is-${effect.kind}` : ''}${celebrating ? ' is-goal' : ''}`} aria-label="Garden">
      <p className="gt-visually-hidden">
        The shared campaign tree is at the {milestone.name.toLowerCase()} stage.
        {celebrating ? ' Birds have flown in to nest in its branches, and thank-you notes hang there.' : ''}
      </p>
      <img className="gt-bg" src={`${ART}/garden-bg.webp`} alt="" draggable={false} />
      <div className="gt-visually-hidden" aria-hidden="true">
        {PRELOAD.map((file) => (
          <img key={file} src={`${ART}/${file}`} alt="" />
        ))}
      </div>
      <div className="gt-sun-glow" aria-hidden="true" />

      <div className="gt-tree-anchor" ref={treeRef}>
        {TREE_MILESTONES.map((item, index) => (
          <img
            key={item.name}
            className={index === treeStage ? 'gt-tree is-current' : 'gt-tree'}
            src={`${ART}/tree-${index}.webp`}
            alt=""
            draggable={false}
          />
        ))}
        {effect?.kind === 'seed' ? (
          <img key={`seed-${effect.key}`} className="gt-seed-drop" src={`${ART}/plant-0.webp`} alt="" aria-hidden="true" />
        ) : null}
        {effect?.kind === 'sun' ? <Sparkles key={`spark-${effect.key}`} /> : null}
        {celebrating ? <TreeCelebration /> : null}
      </div>
      <button type="button" className="gt-sign gt-sign-tree" onClick={onTreeSign}>
        <span className="gt-sign-title">Shared campaign growth</span>
        <span className="gt-sign-sub">{treeCaption}</span>
      </button>

      {effect?.kind === 'water' ? <span key={`wet-${effect.key}`} className="gt-wet" aria-hidden="true" /> : null}
      {effect?.kind === 'fertilizer' ? <Roots key={`roots-${effect.key}`} /> : null}

      {effect?.kind === 'water' ? <Watering key={`water-${effect.key}`} /> : null}
      {effect?.kind === 'fertilizer' ? <Fertilizing key={`fert-${effect.key}`} /> : null}
      {effect?.kind === 'sun' ? <Sunbeams key={`sun-${effect.key}`} /> : null}

      {toast}
      {overlay}
    </section>
  )
})

const NOTES = [
  { left: '18%', top: '16%', delay: '1.6s' },
  { left: '62%', top: '12%', delay: '1.9s' },
  { left: '70%', top: '34%', delay: '2.2s' },
  { left: '28%', top: '38%', delay: '2.5s' },
]

function TreeCelebration() {
  return (
    <div className="gt-celebrate" aria-hidden="true">
      <svg className="gt-nest" viewBox="0 0 80 36">
        <path d="M8 16c6 14 58 14 64 0-8 10-56 10-64 0z" fill="#8a5a32" />
        <path d="M14 16c4 4 10 6 16 6M30 18c6 2 14 2 22-2M18 14c8-4 20-6 34-2" fill="none" stroke="#c9894a" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="40" cy="14" rx="16" ry="5" fill="#e7d3a1" />
      </svg>
      <Bird className="gt-bird gt-bird-a" />
      <Bird className="gt-bird gt-bird-b" />
      <Bird className="gt-bird gt-bird-c" />
      {NOTES.map((note) => (
        <span key={note.left} className="gt-note" style={{ left: note.left, top: note.top, animationDelay: note.delay }}>
          <i />
          Thank you
        </span>
      ))}
    </div>
  )
}

function Bird({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 40" aria-hidden="true">
      <ellipse cx="34" cy="24" rx="16" ry="8" fill="#3d6b86" />
      <circle cx="48" cy="18" r="7" fill="#3d6b86" />
      <path d="M54 18h8l-5 2z" fill="#e6b14a" />
      <circle cx="50" cy="16.5" r="1.1" fill="#17382d" />
      <path className="gt-wing" d="M28 20c-8-10-18-8-22 0 6 2 14 2 22 0z" fill="#2f556c" />
      <path d="M22 28c-2 6-1 8 2 8" fill="none" stroke="#e6b14a" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Watering() {
  return (
    <div className="gt-fx gt-fx-water" aria-hidden="true">
      <img className="gt-can" src={`${ART}/watering-can.webp`} alt="" />
      <svg className="gt-drops" viewBox="0 0 100 100" preserveAspectRatio="none">
        {Array.from({ length: 16 }, (_, index) => (
          <ellipse
            key={index}
            className="gt-drop"
            cx={8 + (index % 8) * 5.5 + (index > 7 ? 2.5 : 0)}
            cy={6}
            rx="1.1"
            ry="2.6"
            style={{ animationDelay: `${0.35 + (index % 8) * 0.07 + (index > 7 ? 0.32 : 0)}s` }}
          />
        ))}
      </svg>
    </div>
  )
}

function Fertilizing() {
  return (
    <div className="gt-fx gt-fx-fert" aria-hidden="true">
      <img className="gt-scoop" src={`${ART}/fertilizer-scoop.webp`} alt="" />
      <svg className="gt-granules" viewBox="0 0 100 100" preserveAspectRatio="none">
        {Array.from({ length: 12 }, (_, index) => (
          <circle
            key={index}
            className="gt-granule"
            cx={18 + (index % 6) * 4}
            cy={4}
            r="1.6"
            style={{ animationDelay: `${0.45 + index * 0.06}s` }}
          />
        ))}
      </svg>
    </div>
  )
}

function Roots() {
  return (
    <svg className="gt-roots" viewBox="0 0 200 80" aria-hidden="true">
      <defs>
        <filter id="gt-root-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#gt-root-glow)" fill="none" stroke="#ffd36b" strokeLinecap="round">
        <path className="gt-root" d="M100 4 C98 22 92 34 80 46 C70 56 58 60 44 66" strokeWidth="2.4" />
        <path className="gt-root" d="M100 4 C103 22 110 34 122 46 C132 56 146 60 160 64" strokeWidth="2.4" />
        <path className="gt-root" d="M100 6 C100 30 101 50 99 74" strokeWidth="2.8" />
        <path className="gt-root" d="M96 26 C86 32 74 32 62 38" strokeWidth="1.6" />
        <path className="gt-root" d="M104 30 C116 36 128 38 140 42" strokeWidth="1.6" />
        <path className="gt-root" d="M100 48 C92 56 84 60 74 70" strokeWidth="1.4" />
        <path className="gt-root" d="M100 50 C108 58 118 62 128 70" strokeWidth="1.4" />
      </g>
    </svg>
  )
}

function Sunbeams() {
  return (
    <div className="gt-fx gt-fx-sun" aria-hidden="true">
      <div className="gt-rays" />
    </div>
  )
}

function Sparkles() {
  return (
    <span className="gt-sparkles" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <i
          key={index}
          style={{
            left: `${18 + ((index * 37) % 64)}%`,
            top: `${10 + ((index * 23) % 60)}%`,
            animationDelay: `${0.25 + index * 0.09}s`,
          }}
        />
      ))}
    </span>
  )
}
