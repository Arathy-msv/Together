import { useLowData } from '../../lib/lowData.ts'
import { usePrefersReducedMotion } from '../../lib/motion.ts'
import { templateFor } from '../../lib/templates.ts'
import type { CampaignCategory } from '../../lib/types.ts'

/**
 * A category symbol that fills in as pairs match. It is visual game progress only:
 * it does not change the suggestion, the campaign total, or delivery.
 * Low-data mode keeps the sentence and skips the drawing. No images are requested.
 */
export function CauseSketch({ category, matched, total }: { category: CampaignCategory | undefined; matched: number; total: number }) {
  const lowData = useLowData()
  const reduced = usePrefersReducedMotion()
  const label = templateFor(category).label.toLowerCase()
  const safeTotal = Math.max(total, 1)
  const shown = Math.max(0, Math.min(matched, safeTotal))
  const caption = `Symbolic ${label} sketch: ${shown} of ${total} pairs matched. This drawing is not a purchase. Matching does not buy or deliver real goods. Funding and delivery stay on the campaign page.`
  if (lowData) return <p className="cause-sketch text-only">{caption}</p>
  const hidden = `${((1 - shown / safeTotal) * 100).toFixed(2)}%`
  return (
    <figure className={`cause-sketch cat-${category ?? 'other'}${reduced ? ' still' : ''}`}>
      <div className="cause-stage" aria-hidden="true">
        <div className="cause-symbol" style={{ clipPath: `inset(${hidden} 0 0 0)` }}>
          <span className="shape a" />
          <span className="shape b" />
          <span className="shape c" />
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
