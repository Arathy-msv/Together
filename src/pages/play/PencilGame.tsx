import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { FlowShell, useDragProgress, type FlowCopy } from './FlowGame.tsx'

const COPY: FlowCopy = {
  discoverTitle: 'Small actions. Shared futures.',
  discoverHint: 'Drag to write',
  actionTitle: 'A little action goes a long way.',
  actionHint: 'Keep going...',
  revealTitle: 'A small action. A shared impact.',
  revealBody: 'A simple line can point toward a brighter future for learners.',
  supportTitle: 'Support school supplies',
  footerLabel: 'Support school supplies.',
}

export function PencilGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const [progress, setProgress] = useState(0)
  const drag = useDragProgress({
    axis: 'x',
    onProgress: setProgress,
  })

  return (
    <FlowShell
      view={view}
      game="pencil"
      copy={COPY}
      preview={preview}
      progress={progress}
      onReplay={() => setProgress(0)}
      keyboardFallback={{
        label: 'Write the line',
        onActivate: () => setProgress(1),
      }}
      scene={
        <div className="pencil-stage" aria-label="Pencil writing">
          <button
            type="button"
            className="pencil-handle"
            style={{ transform: `translateX(${progress * 160}px) rotate(${-8 + progress * 4}deg)` }}
            aria-label="Drag to write"
            {...drag.handlers}
          >
            <img src="/games/pencil.jpg" alt="" draggable={false} />
          </button>
          <svg className="pencil-ink" viewBox="0 0 320 80" aria-hidden="true">
            <path
              d="M12 48 C 60 20, 110 70, 160 40 S 260 20, 308 44"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - progress }}
            />
          </svg>
          <p className="pencil-phrase" style={{ opacity: progress >= 0.92 ? 1 : progress * 0.4 }}>
            A brighter future.
          </p>
        </div>
      }
    />
  )
}
