import { useState } from 'react'
import type { CampaignView } from '../../lib/types.ts'
import { FlowShell, pagePeel, useDragProgress, type FlowCopy } from './FlowGame.tsx'

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
    mode: 'unfold',
    distance: 240,
    progress,
    onProgress: setProgress,
  })
  const peel = pagePeel(progress)

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
        <div className="page-stage" aria-label="Folded paper" {...drag.handlers}>
          <div className="page-sheet">
            <img className="page-drawing" src="/games/page-drawing.jpg" alt="A child’s drawing of a house and friends" draggable={false} />
            <div className="page-cover" style={{ clipPath: peel.cover, opacity: progress >= 0.98 ? 0 : 1 }}>
              <img src="/games/page-folded.jpg" alt="" draggable={false} />
            </div>
            {peel.showFlap ? (
              <svg className="page-flap" viewBox="0 0 100 100" aria-hidden="true">
                <polygon points={peel.flap.replace('polygon(', '').replace(')', '')} />
              </svg>
            ) : null}
            {progress < 0.98 ? <span className="page-corner-hint" style={{ opacity: 1 - progress }} /> : null}
          </div>
        </div>
      }
    />
  )
}
