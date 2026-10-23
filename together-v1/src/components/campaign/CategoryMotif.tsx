import { useLowData } from '../../lib/lowData.ts'
import { templateFor } from '../../lib/templates.ts'
import type { CampaignCategory } from '../../lib/types.ts'

/** A static category mark. Hidden in low-data mode. It does not animate. */
export function CategoryMotif({ category }: { category?: CampaignCategory }) {
  const lowData = useLowData()
  if (!category || lowData) return null
  return (
    <p className="category-motif" data-category={category}>
      <span className="category-mark" aria-hidden="true" />
      <span>{templateFor(category).label}</span>
    </p>
  )
}
