import { formatINR, truncate } from '../lib/format.ts'
import { gameMeta } from '../lib/games.ts'
import type { CampaignForm } from '../lib/types.ts'
import { CampaignCover, OrgLogo } from './CampaignImage.tsx'
import { Icon } from './illustrations.tsx'
import { ProgressBar } from './ProgressBar.tsx'

export function LivePreview({ form }: { form: CampaignForm }) {
  const goal = Number(form.goalAmount)
  const title = form.title.trim() || 'Your campaign title'
  const story = form.description.trim()
  return (
    <aside className="panel preview">
      <div className="preview-top">
        <span className="eyebrow-label">Preview</span>
        <span className="draft-pill">Draft</span>
      </div>
      <div className="preview-media">
        <CampaignCover campaign={{ ...form, title }} />
        <span className="preview-overlay">{title}</span>
      </div>
      <div className="org-line">
        <OrgLogo name={form.organizerName || 'Organizer'} logoData={form.logoData} size={30} />
        <span className="muted small">{form.organizerName || 'Organizer'}</span>
      </div>
      <h3>{title}</h3>
      <p className="muted small">{story ? truncate(story, 160) : 'Your description will appear here.'}</p>
      <div className="money-row big">
        <span className="muted">Target</span>
        <strong>{Number.isFinite(goal) && goal > 0 ? formatINR(goal, form.currency) : '—'}</strong>
      </div>
      <ProgressBar value={0} />
      <div className="money-row small muted">
        <span>{formatINR(0, form.currency)} raised</span>
        <span>0%</span>
      </div>
      <div className="preview-facts">
        <div>
          <span className="fact-icon green">
            <Icon name="users" size={16} />
          </span>
          <span>
            <strong>{form.access === 'open' ? 'Open group' : 'Private group'}</strong>
            <em>{form.access === 'open' ? 'Anyone can find and support this campaign' : 'Demo access code required'}</em>
          </span>
        </div>
        <div>
          <span className="fact-icon coral">
            <Icon name="game" size={16} />
          </span>
          <span>
            <strong>Game</strong>
            <em>{form.game ? gameMeta(form.gameType).name : 'Direct giving only'}</em>
          </span>
        </div>
      </div>
    </aside>
  )
}
