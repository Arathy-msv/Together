import { useState } from 'react'
import { MediaEditor, Select, TextArea, TextInput, VideoEditor } from '../../components/workspace/fields.tsx'
import { TranslationEditor } from '../../components/ai/Translation.tsx'
import { currencySymbol, formatDateRange, formatMoney } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { minorToInput } from '../../lib/inputs.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { TEMPLATES, templateFor } from '../../lib/templates.ts'
import { saveCampaignFields } from '../../lib/transparency.ts'
import type { CampaignCategory, CampaignStory } from '../../lib/types.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

interface LineDraft {
  id: string
  label: string
  amount: string
}
interface ImpactDraft extends LineDraft {
  outcome: string
  costBasis: string
}

export function StoryEditor({ campaign, view }: WorkspaceProps) {
  const [summary, setSummary] = useState(campaign.description)
  const [category, setCategory] = useState<CampaignCategory>(campaign.category ?? 'other')
  const [story, setStory] = useState<CampaignStory>(
    campaign.story ?? { whoItHelps: '', whatTheyNeed: '', whatItSupports: '', whatHappensNext: '', beneficiary: '', imageStory: [] },
  )
  const [budget, setBudget] = useState<LineDraft[]>((campaign.budget ?? []).map((line) => ({ id: line.id, label: line.label, amount: minorToInput(line.amountMinor) })))
  const [impact, setImpact] = useState<ImpactDraft[]>(
    (campaign.impactExamples ?? []).map((item) => ({ id: item.id, label: '', amount: minorToInput(item.amountMinor), outcome: item.outcome, costBasis: item.costBasis })),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const template = templateFor(category)

  function save() {
    const next: Record<string, string> = {}
    if (summary.trim().length < 20) next.summary = 'Keep a short summary of at least 20 characters.'
    if (budget.some((line) => (line.label.trim() || line.amount.trim()) && (!line.label.trim() || parseRupeesToPaise(line.amount) == null))) {
      next.budget = 'Each budget line needs a label and an amount, or remove it.'
    }
    if (impact.some((item) => !item.outcome.trim() || !item.costBasis.trim() || parseRupeesToPaise(item.amount) == null)) {
      next.impact = 'Each cost example needs an amount, an outcome and where the cost figure comes from.'
    }
    if (story.imageStory.some((item) => !item.alt.trim())) next.media = 'Add alt text to every image.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      saveCampaignFields(campaign.id, {
        description: summary.trim(),
        category,
        story: {
          ...story,
          whoItHelps: story.whoItHelps.trim(),
          whatTheyNeed: story.whatTheyNeed.trim(),
          whatItSupports: story.whatItSupports.trim(),
          whatHappensNext: story.whatHappensNext.trim(),
          beneficiary: story.beneficiary.trim(),
        },
        budget: budget.filter((line) => line.label.trim()).map((line) => ({ id: line.id, label: line.label.trim(), amountMinor: parseRupeesToPaise(line.amount)! })),
        impactExamples: impact.map((item) => ({ id: item.id, amountMinor: parseRupeesToPaise(item.amount)!, outcome: item.outcome.trim(), costBasis: item.costBasis.trim() })),
      })
      setNotice('Story saved. The public Story tab is updated.')
    } catch (problem) {
      setErrors({ form: problem instanceof StorageFullError ? 'Browser storage is full. Remove an image or the video and try again.' : 'The story could not be saved.' })
    }
  }

  const symbol = currencySymbol(campaign.currency)
  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <h2>Story</h2>
        <p className="muted small">An easy-to-scan story helps supporters. Every section is optional except the summary; text-only campaigns are fine.</p>
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        <Select
          label="Campaign type"
          value={category}
          options={TEMPLATES.map((item) => ({ value: item.id, label: item.label }))}
          help="Changes the writing prompts only. Your text is never replaced."
          onChange={(value) => setCategory(value as CampaignCategory)}
        />
        <TextArea label="Short opening summary" value={summary} maxLength={1000} error={errors.summary} onChange={setSummary} />
        <div className="two-col">
          <TextArea label="Who this helps" optional value={story.whoItHelps} placeholder={template.prompts.who} maxLength={600} onChange={(whoItHelps) => setStory({ ...story, whoItHelps })} />
          <TextArea label="What they need" optional value={story.whatTheyNeed} placeholder={template.prompts.need} maxLength={600} onChange={(whatTheyNeed) => setStory({ ...story, whatTheyNeed })} />
          <TextArea label="What contributions will support" optional value={story.whatItSupports} placeholder={template.prompts.supports} maxLength={600} onChange={(whatItSupports) => setStory({ ...story, whatItSupports })} />
          <TextArea label="What happens next" optional value={story.whatHappensNext} placeholder={template.prompts.next} maxLength={600} onChange={(whatHappensNext) => setStory({ ...story, whatHappensNext })} />
        </div>
        <TextArea
          label="Beneficiary description"
          optional
          value={story.beneficiary}
          placeholder={template.prompts.beneficiary}
          maxLength={400}
          help="Shown on Trust & documents. Describe the group, not individuals."
          onChange={(beneficiary) => setStory({ ...story, beneficiary })}
        />
        <MediaEditor items={story.imageStory} error={errors.media} onChange={(imageStory) => setStory({ ...story, imageStory })} />
        <VideoEditor video={story.video} onChange={(video) => setStory({ ...story, video })} />
      </section>

      <section className="panel ws-card wide">
        <h2>Budget breakdown</h2>
        <p className="muted small">Your plan. It is shown as planned spending and never counted as an expense. Template headings: {template.budgetLabels.join(', ') || 'none'}.</p>
        {budget.map((line, index) => (
          <div key={line.id} className="plan-row">
            <input aria-label={`Budget line ${index + 1} label`} value={line.label} maxLength={120} onChange={(event) => setBudget(budget.map((item) => (item.id === line.id ? { ...item, label: event.target.value } : item)))} />
            <div className="input-prefix">
              <span>{symbol}</span>
              <input aria-label={`Budget line ${index + 1} amount`} inputMode="decimal" value={line.amount} onChange={(event) => setBudget(budget.map((item) => (item.id === line.id ? { ...item, amount: event.target.value } : item)))} />
            </div>
            <button type="button" className="btn btn-outline btn-sm icon-only" aria-label={`Remove budget line ${index + 1}`} onClick={() => setBudget(budget.filter((item) => item.id !== line.id))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setBudget([...budget, { id: crypto.randomUUID(), label: '', amount: '' }])}>
          + Add budget line
        </button>
        {errors.budget ? <p className="error-text">{errors.budget}</p> : null}
      </section>

      <section className="panel ws-card wide">
        <h2>Cost examples</h2>
        <p className="muted small">
          Only add an example when you can point to a real cost, such as a supplier quotation. Each example must say where the figure comes from — avoid claims
          like “₹100 clothes one child” without a basis.
        </p>
        {impact.map((item, index) => (
          <div key={item.id} className="impact-row">
            <TextInput label={`Amount (${symbol})`} inputMode="decimal" value={item.amount} onChange={(amount) => setImpact(impact.map((m) => (m.id === item.id ? { ...m, amount } : m)))} />
            <TextInput label="Pays for" value={item.outcome} maxLength={160} placeholder="one thick blanket" onChange={(outcome) => setImpact(impact.map((m) => (m.id === item.id ? { ...m, outcome } : m)))} />
            <TextInput label="Cost basis" value={item.costBasis} maxLength={240} placeholder="Supplier quotation dated …" onChange={(costBasis) => setImpact(impact.map((m) => (m.id === item.id ? { ...m, costBasis } : m)))} />
            <button type="button" className="btn btn-outline btn-sm icon-only" aria-label={`Remove cost example ${index + 1}`} onClick={() => setImpact(impact.filter((m) => m.id !== item.id))}>
              ×
            </button>
          </div>
        ))}
        {impact.length < 6 ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setImpact([...impact, { id: crypto.randomUUID(), label: '', amount: '', outcome: '', costBasis: '' }])}>
            + Add cost example
          </button>
        ) : null}
        {errors.impact ? <p className="error-text">{errors.impact}</p> : null}
      </section>

      <section className="panel ws-card wide" id="translations">
        <h2>Translations</h2>
        <TranslationEditor
          fields={[
            { key: 'title', label: 'Title', original: campaign.title },
            { key: 'description', label: 'Summary', original: campaign.description },
            { key: 'whoItHelps', label: 'Who this helps', original: campaign.story?.whoItHelps ?? '' },
            { key: 'whatTheyNeed', label: 'What they need', original: campaign.story?.whatTheyNeed ?? '' },
            { key: 'whatItSupports', label: 'What contributions will support', original: campaign.story?.whatItSupports ?? '' },
            { key: 'whatHappensNext', label: 'What happens next', original: campaign.story?.whatHappensNext ?? '' },
            { key: 'beneficiary', label: 'Beneficiary description', original: campaign.story?.beneficiary ?? '' },
          ]}
          saved={campaign.translations?.ml ?? {}}
          onApply={(key, text) => {
            const ml = { ...(campaign.translations?.ml ?? {}), [key]: text }
            if (!text) delete ml[key as keyof typeof ml]
            saveCampaignFields(campaign.id, { translations: Object.keys(ml).length ? { ml } : undefined })
            setNotice(text ? 'Translation applied. It appears when supporters preview Malayalam.' : 'Translation removed.')
          }}
        />
        <p className="muted small">Translations use the saved story. Save story changes first, then update translations.</p>
      </section>

      <section className="panel ws-card wide">
        <h2>Settings</h2>
        <dl className="detail-list">
          <div>
            <dt>Goal</dt>
            <dd>{formatMoney(campaign.goalAmount, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Dates</dt>
            <dd>{formatDateRange(campaign.opensAt, campaign.closesAt)}</dd>
          </div>
          <div>
            <dt>Taking part</dt>
            <dd>{[campaign.participation.direct ? 'Direct giving' : null, campaign.participation.game ? gameMeta(campaign.gameType).name : null].filter(Boolean).join(' · ')}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{view.status}</dd>
          </div>
        </dl>
        <p className="muted small">Goal, currency and dates are fixed once a campaign is published, so supporters and sharing pages always see the same facts.</p>
      </section>
      {errors.form ? <p className="error-text wide">{errors.form}</p> : null}
      <div className="ws-save-bar wide">
        <button type="button" className="btn btn-primary" onClick={save}>
          Save story
        </button>
      </div>
    </div>
  )
}
