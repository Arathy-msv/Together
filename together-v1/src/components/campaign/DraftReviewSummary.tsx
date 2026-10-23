import { budgetSummary, draftsToBudget } from '../../lib/budget.ts'
import { formatMinor } from '../../lib/transparency.ts'
import { formatDateTime, formatINR } from '../../lib/format.ts'
import { formatPaise, gameConfig } from '../../lib/gameContribution.ts'
import { gameMeta } from '../../lib/games.ts'
import type { CampaignForm } from '../../lib/types.ts'
import { formGameSettings, type RequiredItem } from '../../lib/wizard.ts'

function stamp(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Not set'
  return formatDateTime(date.toISOString())
}

function clip(text: string, max = 180): string {
  const clean = text.trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

type Row = [label: string, value: string]

/** Compact review summary for the two-step create form. */
export function DraftReviewSummary({ form, items, onEdit }: { form: CampaignForm; items: RequiredItem[]; onEdit: (group: 1 | 2) => void }) {
  const goal = Number(form.goalAmount)
  const budget = budgetSummary(draftsToBudget(form.budget), Number.isFinite(goal) && goal > 0 ? Math.round(goal * 100) : 0)
  const budgetLines = draftsToBudget(form.budget).length
  const rows: Row[] = [
    ['Title', form.title.trim() || 'Not set'],
    ['What you’re raising money for', clip(form.description) || 'Not set'],
    ['Goal', Number.isFinite(goal) && goal > 0 ? formatINR(goal, form.currency) : 'Not set'],
    ['Opens', stamp(form.opensAt)],
    ['Closes', stamp(form.closesAt)],
    [
      'Ways to contribute',
      [form.direct ? 'Give directly' : null, form.game ? `Play ${gameMeta(form.gameType).name}` : null].filter(Boolean).join(' · ') || 'None selected',
    ],
  ]
  if (form.direct) {
    rows.push([
      'Amounts',
      form.donationMode === 'custom' ? 'Supporter chooses' : form.fixedAmounts.map((amount) => formatINR(amount, form.currency)).join(', ') || 'Not set',
    ])
  }
  if (form.game) {
    const settings = formGameSettings(form)
    const config = gameConfig(form.gameType)
    rows.push([
      'Game suggestion',
      `${formatPaise(settings.ratePaise)} per ${config.noun}${settings.capPaise ? ` · giving limit ${formatPaise(settings.capPaise)}` : ''}`,
    ])
  }
  if (budgetLines) {
    rows.push(['Budget', `${budgetLines} item${budgetLines === 1 ? '' : 's'} · ${formatMinor(budget.plannedMinor, form.currency)} planned`])
  }
  const missing = items.filter((item) => !item.done)
  return (
    <div className="draft-review">
      <section className="panel form-panel draft-review-group" aria-labelledby="review-summary-title">
        <div className="section-head-row">
          <h3 id="review-summary-title">Check your campaign</h3>
          <button type="button" className="link-button" onClick={() => onEdit(1)} aria-label="Edit campaign details">
            Edit
          </button>
        </div>
        {missing.length ? <p className="error-text small">Still needed: {missing.map((item) => item.label).join(', ')}</p> : null}
        <dl className="detail-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
