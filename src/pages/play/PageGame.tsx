import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { FlowShell, useDragProgress, type FlowCopy } from './FlowGame.tsx'

const COPY: FlowCopy = {
  discoverTitle: 'Turn the Page',
  discoverHint: 'Drag a corner to unfold.',
  actionTitle: 'A small gesture can start something.',
  actionHint: 'Keep going...',
  revealTitle: 'Give local creativity room to grow.',
  revealBody: 'We’re raising funds for art materials and welcoming community workshops.',
  supportTitle: 'Support community arts',
  footerLabel: 'Community Arts Fund',
}

export function PageGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  const [progress, setProgress] = useState(0)
  const drag = useDragProgress({
    axis: 'y',
    onProgress: setProgress,
  })

  return (
    <FlowShell
      view={view}
      game="page"
      copy={COPY}
      preview={preview}
      progress={progress}
      onReplay={() => setProgress(0)}
      keyboardFallback={{
        label: 'Unfold the page',
        onActivate: () => setProgress(1),
      }}
      scene={
        <div className="page-stage" aria-label="Folded paper">
          <div className="page-sheet">
            <img
              className="page-drawing"
              src="/games/page-drawing.jpg"
              alt="A child’s drawing"
              style={{ opacity: 0.25 + progress * 0.75 }}
              draggable={false}
            />
            <button
              type="button"
              className="page-fold"
              style={{
                clipPath: `polygon(0 0, ${100 - progress * 50}% 0, 100% ${progress * 100}%, 100% 100%, 0 100%)`,
                opacity: progress >= 0.92 ? 0 : 1,
              }}
              aria-label="Drag a corner to unfold"
              {...drag.handlers}
            >
              <img src="/games/page-folded.jpg" alt="" draggable={false} />
            </button>
            <span
              className="page-corner"
              style={{
                transform: `translate(${progress * 36}px, ${progress * 36}px) rotate(${progress * 18}deg)`,
                opacity: progress >= 0.92 ? 0 : 1,
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      }
    />
  )
}
