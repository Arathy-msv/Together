import { useState } from 'react'
import { MediaEditor, Select, TextArea, TextInput, VideoEditor } from '../../components/workspace/fields.tsx'
import { BudgetEditor } from '../../components/story/BudgetEditor.tsx'
import { budgetLineError, budgetToDrafts, draftsToBudget, type BudgetLineDraft } from '../../lib/budget.ts'
import { currencySymbol, formatDateRange, formatMoney } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { minorToInput } from '../../lib/inputs.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { TEMPLATES, templateFor } from '../../lib/templates.ts'
import { campaignMilestones, saveCampaignFields } from '../../lib/transparency.ts'
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

export function StoryEditor({ campaign, view, store }: WorkspaceProps) {
  // While a revision waits for review, keep editing the proposed version rather than the live one.
  const source = campaign.pendingRevision?.status === 'pending' ? campaign.pendingRevision.snapshot : campaign
  const [summary, setSummary] = useState(source.description)
  const [category, setCategory] = useState<CampaignCategory>(source.category ?? 'other')
  const [story, setStory] = useState<CampaignStory>(
    source.story ?? { whoItHelps: '', whatTheyNeed: '', whatItSupports: '', whatHappensNext: '', beneficiary: '', imageStory: [] },
  )
  const [budget, setBudget] = useState<BudgetLineDraft[]>(budgetToDrafts(source.budget))
  const [budgetApproximate, setBudgetApproximate] = useState(Boolean(source.budgetApproximate))
  const [budgetNote, setBudgetNote] = useState(source.budgetNote ?? '')
  const [impact, setImpact] = useState<ImpactDraft[]>(
    (source.impactExamples ?? []).map((item) => ({ id: item.id, label: '', amount: minorToInput(item.amountMinor), outcome: item.outcome, costBasis: item.costBasis })),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const template = templateFor(category)

  function save() {
    const next: Record<string, string> = {}
    if (summary.trim().length < 20) next.summary = 'Keep a short summary of at least 20 characters.'
    const budgetError = budgetLineError(budget)
    if (budgetError) next.budget = budgetError
    else if (budgetApproximate && !budgetNote.trim()) next.budget = 'Explain how you estimated the budget, or untick “These amounts are estimates”.'
    if (impact.some((item) => !item.outcome.trim() || !item.costBasis.trim() || parseRupeesToPaise(item.amount) == null)) {
      next.impact = 'Each cost example needs an amount, an outcome and where the cost figure comes from.'
    }
    if (story.imageStory.some((item) => !item.alt.trim())) next.media = 'Add alt text to every image.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      const result = saveCampaignFields(campaign.id, {
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
        budget: draftsToBudget(budget),
        budgetApproximate: budgetApproximate || undefined,
        budgetNote: budgetNote.trim().slice(0, 400) || undefined,
        impactExamples: impact.map((item) => ({ id: item.id, amountMinor: parseRupeesToPaise(item.amount)!, outcome: item.outcome.trim(), costBasis: item.costBasis.trim() })),
      })
      setNotice(
        result.pendingReview
          ? 'Sent for review. Supporters keep seeing the published story until an Organization Admin who didn’t make this change approves it.'
          : 'Story saved. The public Story tab is updated.',
      )
    } catch (problem) {
      setErrors({
        form:
          problem instanceof StorageFullError
            ? 'Browser storage is full. Remove an image or the video and try again.'
            : problem instanceof Error
              ? problem.message
              : 'The story could not be saved.',
      })
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
          <TextArea label="Who will benefit?" optional value={story.whoItHelps} placeholder={template.prompts.who} maxLength={600} onChange={(whoItHelps) => setStory({ ...story, whoItHelps })} />
          <TextArea label="What they need" optional value={story.whatTheyNeed} placeholder={template.prompts.need} maxLength={600} onChange={(whatTheyNeed) => setStory({ ...story, whatTheyNeed })} />
          <TextArea label="What contributions will support" optional value={story.whatItSupports} placeholder={template.prompts.supports} maxLength={600} onChange={(whatItSupports) => setStory({ ...story, whatItSupports })} />
          <TextArea label="What happens next" optional value={story.whatHappensNext} placeholder={template.prompts.next} maxLength={600} onChange={(whatHappensNext) => setStory({ ...story, whatHappensNext })} />
        </div>
        <TextArea
          label="Extra note about who benefits"
          optional
          value={story.beneficiary}
          placeholder="e.g. We never publish residents’ names or photos."
          maxLength={400}
          help="Shown under “Who benefits” in Trust & details, only when it adds something to “Who will benefit?”."
          onChange={(beneficiary) => setStory({ ...story, beneficiary })}
        />
        <MediaEditor items={story.imageStory} error={errors.media} onChange={(imageStory) => setStory({ ...story, imageStory })} />
        <VideoEditor video={story.video} onChange={(video) => setStory({ ...story, video })} />
      </section>

      <section className="panel ws-card wide">
        <h2>Budget breakdown</h2>
        <p className="muted small">Template headings: {template.budgetLabels.join(', ') || 'none'}.</p>
        <BudgetEditor
          lines={budget}
          onLines={setBudget}
          currency={campaign.currency}
          targetMinor={Math.round(campaign.goalAmount * 100)}
          milestones={campaignMilestones(store, campaign.id)}
          approximate={budgetApproximate}
          note={budgetNote}
          onApproximate={setBudgetApproximate}
          onNote={setBudgetNote}
          error={errors.budget}
        />
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
        <h2>Language</h2>
        <p className="muted small">
          Public pages are in English. Translations already saved in this browser stay in storage and are not deleted. There is no language selector.
        </p>
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
