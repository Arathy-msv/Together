import { useId, useState } from 'react'
import { currencySymbol, formatMoney } from '../../lib/format.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { gameMeta } from '../../lib/games.ts'
import { applyTemplate, TEMPLATES, templateFor, type CategoryTemplate, type TemplateChange } from '../../lib/templates.ts'
import type { CampaignForm, GameType } from '../../lib/types.ts'
import { gameSettingsFields, type FormErrors } from '../../lib/wizard.ts'

/** Category template picker with a preview of exactly what will change before anything is applied. */
export function TemplatePicker({ form, allowedGames, onChange }: { form: CampaignForm; allowedGames: GameType[]; onChange: (patch: Partial<CampaignForm>) => void }) {
  const [pending, setPending] = useState<CategoryTemplate | null>(null)
  const [replaceLists, setReplaceLists] = useState(false)
  const [useGame, setUseGame] = useState(false)
  const suggestedGame = pending?.games.find((game) => allowedGames.includes(game)) ?? null
  const preview = pending ? applyTemplate(form, pending, { replaceLists, useGame: useGame ? suggestedGame : null }) : null

  function apply() {
    if (!preview) return
    const next = preview.form
    const gamePatch = next.gameType !== form.gameType ? gameSettingsFields(next.gameType) : {}
    onChange({ ...next, ...gamePatch })
    setPending(null)
  }

  return (
    <div className="field template-picker">
      <span className="field-label" id="template-label">
        Campaign type <span className="optional-tag">Optional</span>
      </span>
      <p className="help">Templates suggest prompts, milestones, budget headings and a suitable game. They never write your story for you.</p>
      <div className="chat-chips" role="group" aria-labelledby="template-label">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={form.category === template.id ? 'chip selected' : 'chip'}
            aria-pressed={form.category === template.id}
            onClick={() => {
              setPending(template)
              setReplaceLists(false)
              setUseGame(false)
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      {pending && preview ? (
        <div className="template-preview" role="region" aria-label={`Preview of the ${pending.label} template`}>
          <div className="template-preview-head">
            <strong>Preview: {pending.label}</strong>
            <span className="muted small">{pending.blurb}</span>
          </div>
          <ChangeList changes={preview.changes} />
          <label className="check-row">
            <input type="checkbox" checked={replaceLists} onChange={(event) => setReplaceLists(event.target.checked)} />
            Replace my milestone plan, budget headings and cover with the template’s suggestions
          </label>
          {suggestedGame ? (
            <label className="check-row">
              <input type="checkbox" checked={useGame} onChange={(event) => setUseGame(event.target.checked)} />
              Use the suggested game: {gameMeta(suggestedGame).name}
            </label>
          ) : null}
          {pending.comingSoonGames?.length ? <p className="help">Also suits: {pending.comingSoonGames.join(', ')} (coming soon).</p> : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={apply}>
              Apply template
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ChangeList({ changes }: { changes: TemplateChange[] }) {
  if (changes.length === 0) return <p className="help">Nothing would change.</p>
  return (
    <ul className="change-list">
      {changes.map((change) => (
        <li key={change.field} className={change.kind}>
          <span className="change-kind">{change.kind === 'add' ? 'Adds' : change.kind === 'replace' ? 'Replaces' : 'Keeps yours'}</span>
          <span>
            <strong>{change.field}</strong>
            {change.kind === 'replace' ? (
              <em>
                {change.before} → {change.after}
              </em>
            ) : (
              <em>{change.after}</em>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

function StoryField({ label, value, placeholder, onChange, rows = 2, help, fieldId }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; rows?: number; help?: string; fieldId?: string }) {
  const generated = useId()
  const id = fieldId ?? generated
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label} <span className="optional-tag">Optional</span>
      </label>
      <textarea id={id} rows={rows} maxLength={600} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {help ? <p className="help">{help}</p> : null}
    </div>
  )
}

/** Optional structured story, budget plan and milestone plan for the campaign form. */
export function StoryDetails({ form, errors, onChange, hideWho = false }: { form: CampaignForm; errors: FormErrors; onChange: (patch: Partial<CampaignForm>) => void; hideWho?: boolean }) {
  const template = templateFor(form.category)
  return (
    <details className="story-details" open={Boolean(form.storyWho || form.storyNeed || form.budget.length || form.milestonePlan.length)}>
      <summary>
        <strong>Story details, budget and milestones</strong>
        <span className="muted small">Optional — supporters find a structured story easier to scan. You can skip this and add it later.</span>
      </summary>
      <div className="story-details-body">
        {hideWho ? null : <StoryField fieldId="story-who" label="Who this helps" value={form.storyWho} placeholder={template.prompts.who} onChange={(storyWho) => onChange({ storyWho })} />}
        <StoryField label="What they need" value={form.storyNeed} placeholder={template.prompts.need} onChange={(storyNeed) => onChange({ storyNeed })} />
        <StoryField fieldId="story-supports" label="What contributions will support" value={form.storySupports} placeholder={template.prompts.supports} onChange={(storySupports) => onChange({ storySupports })} />
        <StoryField fieldId="story-next" label="What happens next" value={form.storyNext} placeholder={template.prompts.next} onChange={(storyNext) => onChange({ storyNext })} />
        <StoryField
          fieldId="story-beneficiary"
          label="Beneficiary description"
          value={form.beneficiary}
          placeholder={template.prompts.beneficiary}
          onChange={(beneficiary) => onChange({ beneficiary })}
          help="Describe the group who benefits. Avoid names, addresses or details that identify individuals."
        />

        <BudgetLines form={form} onChange={onChange} error={errors.budget} />

        <div className="field" id="milestone-plan" tabIndex={-1}>
          <span className="field-label">
            Milestone plan <span className="optional-tag">Optional</span>
          </span>
          <p className="help">Planned steps appear on the public timeline as “Planned”. You report progress later from the organizer workspace.</p>
          {form.milestonePlan.map((item, index) => (
            <div key={item.id} className="plan-row">
              <input
                aria-label={`Milestone ${index + 1} title`}
                value={item.title}
                maxLength={120}
                placeholder="e.g. Purchase materials"
                onChange={(event) => onChange({ milestonePlan: form.milestonePlan.map((m) => (m.id === item.id ? { ...m, title: event.target.value } : m)) })}
              />
              <input
                aria-label={`Milestone ${index + 1} expected date`}
                type="date"
                value={item.due}
                onChange={(event) => onChange({ milestonePlan: form.milestonePlan.map((m) => (m.id === item.id ? { ...m, due: event.target.value } : m)) })}
              />
              <button type="button" className="btn btn-outline btn-sm icon-only" aria-label={`Remove milestone ${index + 1}`} onClick={() => onChange({ milestonePlan: form.milestonePlan.filter((m) => m.id !== item.id) })}>
                ×
              </button>
            </div>
          ))}
          {form.milestonePlan.length < 10 ? (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ milestonePlan: [...form.milestonePlan, { id: crypto.randomUUID(), title: '', due: '' }] })}>
              + Add milestone
            </button>
          ) : null}
        </div>
      </div>
    </details>
  )
}

/** Organizer-supplied budget lines with a running total compared against the target. */
export function BudgetLines({ form, onChange, error }: { form: CampaignForm; onChange: (patch: Partial<CampaignForm>) => void; error?: string }) {
  const budgetTotal = form.budget.reduce((sum, line) => sum + (parseRupeesToPaise(line.amount) ?? 0), 0)
  const goal = Number(form.goalAmount)
  const goalMinor = Number.isFinite(goal) && goal > 0 ? goal * 100 : 0
  return (
        <div className="field" id="budget-plan" tabIndex={-1}>
          <span className="field-label">
            Budget plan <span className="optional-tag">Optional</span>
          </span>
          <p className="help">Planned amounts are shown as a plan, never as spending.</p>
          {form.budget.map((line, index) => (
            <div key={line.id} className="plan-row">
              <input
                aria-label={`Budget line ${index + 1} label`}
                value={line.label}
                maxLength={120}
                placeholder="What it pays for"
                onChange={(event) => onChange({ budget: form.budget.map((item) => (item.id === line.id ? { ...item, label: event.target.value } : item)) })}
              />
              <div className="input-prefix">
                <span>{currencySymbol(form.currency)}</span>
                <input
                  aria-label={`Budget line ${index + 1} amount`}
                  inputMode="decimal"
                  value={line.amount}
                  placeholder="0"
                  onChange={(event) => onChange({ budget: form.budget.map((item) => (item.id === line.id ? { ...item, amount: event.target.value } : item)) })}
                />
              </div>
              <button type="button" className="btn btn-outline btn-sm icon-only" aria-label={`Remove budget line ${index + 1}`} onClick={() => onChange({ budget: form.budget.filter((item) => item.id !== line.id) })}>
                ×
              </button>
            </div>
          ))}
          <div className="inline-actions">
            {form.budget.length < 12 ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ budget: [...form.budget, { id: crypto.randomUUID(), label: '', amount: '' }] })}>
                + Add budget line
              </button>
            ) : null}
            {budgetTotal > 0 ? <span className="muted small">Planned total {formatMoney(budgetTotal / 100, form.currency)}</span> : null}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {budgetTotal > 0 && goalMinor > 0 && budgetTotal !== goalMinor ? (
        <p className="help">
          Budget lines total {formatMoney(budgetTotal / 100, form.currency)}; the target is {formatMoney(goal, form.currency)}. That’s fine for now — readiness checks will remind you.
        </p>
      ) : null}
        </div>
  )
}
