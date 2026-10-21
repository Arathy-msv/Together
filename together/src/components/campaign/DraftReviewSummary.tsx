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

/** Review summary shared by the assistant and the form, in the same four groups as setup. */
export function DraftReviewSummary({ form, items, onEdit }: { form: CampaignForm; items: RequiredItem[]; onEdit: (group: 1 | 2 | 3) => void }) {
  const goal = Number(form.goalAmount)
  const budget = budgetSummary(draftsToBudget(form.budget), Number.isFinite(goal) && goal > 0 ? Math.round(goal * 100) : 0)
  const budgetLines = draftsToBudget(form.budget).length
  const cause: Row[] = [
    ['Title', form.title.trim() || 'Not set'],
    ['What you’re raising money for', clip(form.description) || 'Not set'],
    ['Who will benefit', clip(form.storyWho) || 'Optional · not added'],
    ['Organizer shown to supporters', form.organizerName.trim() || 'Not set'],
    [
      'Budget',
      budgetLines
        ? `${budgetLines} item${budgetLines === 1 ? '' : 's'} · ${formatMinor(budget.plannedMinor, form.currency)} planned${
            budget.overTargetMinor > 0 ? ` · ${formatMinor(budget.overTargetMinor, form.currency)} above the target` : budget.unallocatedMinor > 0 ? ` · ${formatMinor(budget.unallocatedMinor, form.currency)} of the target not assigned` : ''
          }${form.budgetApproximate ? ' · estimate' : ''}`
        : 'Optional · not added',
    ],
  ]
  const dates: Row[] = [
    ['Goal', Number.isFinite(goal) && goal > 0 ? formatINR(goal, form.currency) : 'Not set'],
    ['Opens', stamp(form.opensAt)],
    ['Closes', stamp(form.closesAt)],
    ['When the goal is reached', form.autoCloseOnGoal ? 'Stop accepting contributions' : 'Keep accepting until the closing date'],
  ]
  const ways: Row[] = [
    ['Ways to contribute', [form.direct ? 'Give directly' : null, form.game ? `Play ${gameMeta(form.gameType).name}` : null].filter(Boolean).join(' · ') || 'None selected'],
    ['Who can join', form.access === 'open' ? 'Anyone with the link' : `Private group · code ${form.accessCode || 'not set'}`],
  ]
  if (form.direct) {
    ways.push(['Amounts', form.donationMode === 'custom' ? 'Supporter chooses' : form.fixedAmounts.map((amount) => formatINR(amount, form.currency)).join(', ') || 'Not set'])
  }
  if (form.game) {
    const settings = formGameSettings(form)
    const config = gameConfig(form.gameType)
    ways.push([
      'Game suggestion',
      `${formatPaise(settings.ratePaise)} per ${config.noun}${settings.capPaise ? ` · giving limit ${formatPaise(settings.capPaise)}` : ''} · ${
        settings.allowCustom ? 'supporters choose their final amount' : 'the game total is the amount'
      }`,
    ])
    if (form.gameType === 'puzzle') ways.push(['Puzzle image', form.puzzleImageData ? 'Uploaded by you' : 'Still needed'])
  }
  const groups: Array<{ id: 1 | 2 | 3; title: string; rows: Row[] }> = [
    { id: 1, title: 'Your cause', rows: cause },
    { id: 2, title: 'Goal and dates', rows: dates },
    { id: 3, title: 'Ways to contribute', rows: ways },
  ]
  return (
    <div className="draft-review">
      <p className="muted small">The public card preview is beside this summary. Open it when you want to see the cover again.</p>
      {groups.map((group) => {
        const missing = items.filter((item) => item.step === group.id && !item.done)
        return (
          <section key={group.id} className="panel form-panel draft-review-group" aria-labelledby={`review-group-${group.id}`}>
            <div className="section-head-row">
              <h3 id={`review-group-${group.id}`}>{group.title}</h3>
              <button type="button" className="link-button" onClick={() => onEdit(group.id)} aria-label={`Edit ${group.title.toLowerCase()}`}>
                Edit
              </button>
            </div>
            {missing.length ? <p className="error-text small">Still needed: {missing.map((item) => item.label).join(', ')}</p> : null}
            <dl className="detail-list">
              {group.rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </div>
  )
}
