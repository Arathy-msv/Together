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
    mode: 'right',
    distance: 260,
    progress,
    onProgress: setProgress,
  })
  const settled = progress >= 0.92
  const tilt = settled ? -2 : -18 * Math.min(1, progress / 0.35)
  const lift = settled ? -36 : 0

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
        <div className="pencil-stage" aria-label="Pencil writing" {...drag.handlers}>
          <svg className="pencil-ink" viewBox="0 0 320 180" aria-hidden="true">
            <path
              d="M28 108 C 80 96, 130 118, 180 104 S 260 92, 300 108"
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.min(1, progress / 0.92), opacity: settled ? 0.25 : 0.9 }}
            />
          </svg>
          <p className="pencil-phrase" style={{ opacity: settled ? 1 : 0 }}>
            A brighter future.
          </p>
          <div
            className="pencil-rig"
            style={{ transform: `translate(${progress * 78}px, ${lift}px) rotate(${tilt}deg)` }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Drag to write"
          >
            <img src="/games/pencil.jpg" alt="" draggable={false} />
          </div>
        </div>
      }
    />
  )
}
