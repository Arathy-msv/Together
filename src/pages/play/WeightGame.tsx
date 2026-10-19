import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { FlowShell, useDragProgress, type FlowCopy } from './FlowGame.tsx'

const COPY: FlowCopy = {
  discoverTitle: 'Lift the Weight',
  discoverHint: 'Drag the stone aside.',
  actionTitle: 'A small gesture can start something.',
  actionHint: 'Keep going...',
  revealTitle: 'Help remove a barrier.',
  revealBody: 'We’re raising funds for practical accessibility improvements in our community space.',
  supportTitle: 'Support community access',
  footerLabel: 'Community Access Fund',
}

export function WeightGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const [progress, setProgress] = useState(0)
  const drag = useDragProgress({
    axis: 'x',
    onProgress: setProgress,
  })

  return (
    <FlowShell
      view={view}
      game="weight"
      copy={COPY}
      preview={preview}
      progress={progress}
      onReplay={() => setProgress(0)}
      keyboardFallback={{
        label: 'Move stone aside',
        onActivate: () => setProgress(1),
      }}
      scene={
        <div className="weight-stage" aria-label="Seedling under a stone">
          <img className="weight-seedling" src="/games/weight-seedling.jpg" alt="" draggable={false} />
          <button
            type="button"
            className="weight-stone"
            style={{ transform: `translateX(${progress * 140}px) rotate(${progress * 8}deg)` }}
            aria-label="Drag the stone aside"
            {...drag.handlers}
          >
            <img src="/games/weight-stone.jpg" alt="" draggable={false} />
          </button>
          {progress > 0.05 && progress < 0.92 ? (
            <span className="weight-ghost" aria-hidden="true">
              <img src="/games/weight-stone.jpg" alt="" />
            </span>
          ) : null}
        </div>
      }
    />
  )
}
