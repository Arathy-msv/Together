import { daysLeft, formatINR, truncate } from '../lib/format.ts'
import type { CampaignForm } from '../lib/types.ts'
import { CoverArt } from './illustrations.tsx'
import { ProgressBar } from './ProgressBar.tsx'

export function LivePreview({ form }: { form: CampaignForm }) {
  const goal = Number(form.goalAmount)
  const title = form.title.trim() || 'Your campaign title'
  const story = form.description.trim()
  const closeDate = new Date(form.closesAt)
  const remaining = form.closesAt && !Number.isNaN(closeDate.getTime()) ? daysLeft(closeDate.toISOString()) : 0
  return (
    <aside className="live-preview">
      <h2>Live preview</h2>
      <p className="hint">This is how your campaign will appear to supporters.</p>
      <div className="preview-card">
        <CoverArt id={form.coverImageId} />
        <div className="preview-body">
          <h3>{title}</h3>
          <p>{story ? truncate(story, 140) : 'Your story will show up here as you write it.'}</p>
          <div className="raised-line">
            <span>
              <strong>{formatINR(0)}</strong> raised
            </span>
            <span>{Number.isFinite(goal) && goal > 0 ? `${formatINR(goal)} target` : 'Set a target'}</span>
          </div>
          <ProgressBar value={0} />
          <div className="card-foot">
            <span>0 supporters</span>
            <span>{remaining > 0 ? `${remaining} days left` : 'Set a closing date'}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
