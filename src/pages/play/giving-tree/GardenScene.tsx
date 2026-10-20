import { forwardRef, type ReactNode } from 'react'
import { TREE_MILESTONES, type CareKind } from '../../../lib/givingTree.ts'

export const ART = '/giving-tree'

export interface SceneEffect {
  kind: CareKind
  /** Changes every time an action starts so the same effect can replay. */
  key: number
}

interface GardenSceneProps {
  plantStage: number
  treeStage: number
  effect: SceneEffect | null
  plantStatus: string
  treeCaption: string
  onTreeSign: () => void
  overlay?: ReactNode
  toast?: ReactNode
}

const PLANT_DESCRIPTIONS = [
  'a seed resting in the soil',
  'a tiny shoot emerging from the soil',
  'a seedling with two broad leaves',
  'a young plant with five leaves',
  'a lush young plant with glossy leaves',
]

/**
 * Layered garden: background, shared campaign tree, soil mound, personal plant and
 * care effects are separate images so each can change on its own.
 */
export const GardenScene = forwardRef<HTMLDivElement, GardenSceneProps>(function GardenScene(
  { plantStage, treeStage, effect, plantStatus, treeCaption, onTreeSign, overlay, toast },
  plantRef,
) {
  const milestone = TREE_MILESTONES[treeStage]
  const description =
    plantStage < 0
      ? 'An empty soil mound is ready for your seed.'
      : `Your care plant is ${PLANT_DESCRIPTIONS[plantStage]}.`

  return (
    <section className={`gt-scene${effect ? ` is-${effect.kind}` : ''}`} aria-label="Garden">
      <p className="gt-visually-hidden">
        {description} The shared campaign tree is at the {milestone.name.toLowerCase()} stage.
      </p>
      <img className="gt-bg" src={`${ART}/garden-bg.webp`} alt="" draggable={false} />
      <div className="gt-sun-glow" aria-hidden="true" />

      <div className="gt-tree-anchor" aria-hidden="true">
        {TREE_MILESTONES.map((item, index) => (
          <img
            key={item.name}
            className={index === treeStage ? 'gt-tree is-current' : 'gt-tree'}
            src={`${ART}/tree-${index}.webp`}
            alt=""
            draggable={false}
          />
        ))}
      </div>
      <button type="button" className="gt-sign gt-sign-tree" onClick={onTreeSign}>
        <span className="gt-sign-title">Shared campaign growth</span>
        <span className="gt-sign-sub">{treeCaption}</span>
      </button>

      <img className="gt-mound" src={`${ART}/soil-mound.webp`} alt="" draggable={false} />
      {effect?.kind === 'water' ? <span key={`wet-${effect.key}`} className="gt-wet" aria-hidden="true" /> : null}
      {effect?.kind === 'fertilizer' ? <Roots key={`roots-${effect.key}`} /> : null}

      <div className="gt-plant-anchor" ref={plantRef}>
        {plantStage >= 0 ? (
          <img key={plantStage} className="gt-plant" src={`${ART}/plant-${plantStage}.webp`} alt="" draggable={false} />
        ) : null}
        {effect?.kind === 'seed' ? (
          <img key={`seed-${effect.key}`} className="gt-seed-drop" src={`${ART}/plant-0.webp`} alt="" aria-hidden="true" />
        ) : null}
        {effect?.kind === 'sun' ? <Sparkles key={`spark-${effect.key}`} /> : null}
      </div>

      <div className="gt-sign gt-sign-plant" aria-hidden="true">
        <span className="gt-sign-title">Your care plant</span>
        <span className="gt-sign-sub">{plantStatus}</span>
      </div>

      {effect?.kind === 'water' ? <Watering key={`water-${effect.key}`} /> : null}
      {effect?.kind === 'fertilizer' ? <Fertilizing key={`fert-${effect.key}`} /> : null}
      {effect?.kind === 'sun' ? <Sunbeams key={`sun-${effect.key}`} /> : null}

      {toast}
      {overlay}
    </section>
  )
})

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
