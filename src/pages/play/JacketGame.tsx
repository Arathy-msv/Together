import { evenBoundaries } from '../../lib/stages.ts'
import type { CampaignView } from '../../lib/types.ts'
import { StagedFlowGame, type FlowCopy, type StageText } from './FlowGame.tsx'

const COPY: FlowCopy = {
  title: 'Small actions. Shared futures.',
  hint: 'Pull the zip upward, one stage at a time.',
  actionTitle: 'A little action goes a long way.',
  revealTitle: 'A small action. A shared impact.',
  revealBody: 'Your gesture helps warm winter care for neighbours nearby.',
}

const STAGES = 4
const BOUNDARIES = evenBoundaries(STAGES)
const pct = (stage: number) => `${Math.round((stage / STAGES) * 100)}%`

const TEXT: StageText = {
  label: (stage) => `Zipped to ${pct(stage)}`,
  heading: (stage) => (stage === STAGES ? 'You zipped the jacket all the way!' : `You zipped to ${pct(stage)}!`),
  step: (stage) => `Zip to ${pct(stage)}`,
  name: (stage) => pct(stage),
}

export function JacketGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  return (
    <StagedFlowGame
      view={view}
      game="jacket"
      preview={preview}
      copy={COPY}
      boundaries={BOUNDARIES}
      mode="up"
      distance={180}
      text={TEXT}
      stageNoun="stage"
      renderScene={({ progress, complete, dragging, handlers, slider }) => (
        <div className="jacket-stage">
          <img
            className="jacket-img"
            src={complete ? '/games/jacket-zipped.jpg' : '/games/jacket-open.jpg'}
            alt={complete ? 'Zipped navy jacket' : 'Navy jacket with the zip open'}
            draggable={false}
          />
          {complete ? null : (
            <>
              <span className="jacket-ticks" aria-hidden="true">
                {BOUNDARIES.map((mark) => (
                  <i key={mark} className={progress >= mark - 1e-6 ? 'on' : ''} style={{ top: `${68 - mark * 42 + 3}%` }} />
                ))}
              </span>
              <div
                className={dragging ? 'jacket-zip dragging' : 'jacket-zip'}
                style={{ top: `${68 - progress * 42}%` }}
                aria-label="Zip pull. Drag up or press the arrow keys to zip to the next stage"
                {...slider}
                {...handlers}
              >
                <span className="jacket-zip-track" style={{ height: `${progress * 42}%` }} />
                <span className="jacket-zip-pull" />
              </div>
            </>
          )}
        </div>
      )}
    />
  )
}
