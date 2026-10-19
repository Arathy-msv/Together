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
    mode: 'right',
    distance: 190,
    progress,
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
        <div className="weight-stage" aria-label="Seedling under a stone" {...drag.handlers}>
          <img className="weight-mound" src="/games/weight-seedling.jpg" alt="" draggable={false} />
          <div
            className="weight-stone"
            style={{ transform: `translateX(${progress * 168}px)` }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Drag the stone aside"
          >
            <img src="/games/weight-stone.jpg" alt="" draggable={false} />
          </div>
        </div>
      }
    />
  )
}
