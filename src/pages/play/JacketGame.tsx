import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { FlowShell, useDragProgress, type FlowCopy } from './FlowGame.tsx'

const COPY: FlowCopy = {
  discoverTitle: 'Small actions. Shared futures.',
  discoverHint: 'Pull the zip upward.',
  actionTitle: 'A little action goes a long way.',
  actionHint: 'Keep going...',
  revealTitle: 'A small action. A shared impact.',
  revealBody: 'Your gesture helps warm winter care for neighbours nearby.',
  supportTitle: 'Support winter care',
  footerLabel: 'Support winter care.',
}

export function JacketGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const [progress, setProgress] = useState(0)
  const drag = useDragProgress({
    axis: 'y',
    invert: true,
    onProgress: setProgress,
  })

  return (
    <FlowShell
      view={view}
      game="jacket"
      copy={COPY}
      preview={preview}
      progress={progress}
      onReplay={() => setProgress(0)}
      keyboardFallback={{
        label: 'Zip the jacket',
        onActivate: () => setProgress(1),
      }}
      scene={
        <div className="jacket-stage" aria-label="Puffer jacket">
          <img
            className="jacket-img"
            src={progress >= 0.92 ? '/games/jacket-zipped.jpg' : '/games/jacket-open.jpg'}
            alt={progress >= 0.92 ? 'Zipped navy jacket' : 'Open navy jacket'}
            draggable={false}
          />
          {progress < 0.92 ? (
            <button
              type="button"
              className="jacket-zip"
              style={{ top: `${68 - progress * 42}%` }}
              aria-label="Pull the zip upward"
              {...drag.handlers}
            >
              <span className="jacket-zip-track" style={{ height: `${progress * 42}%` }} />
              <span className="jacket-zip-pull" />
            </button>
          ) : null}
        </div>
      }
    />
  )
}
