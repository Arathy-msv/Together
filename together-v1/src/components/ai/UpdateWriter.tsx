import { useId, useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { assistantService } from '../../lib/ai/service.ts'
import { hasPlaceholder, type AiResult, type SourceRef } from '../../lib/ai/types.ts'
import { composeUpdateBody, type UpdateDraft } from '../../lib/ai/writers.ts'
import { fromDateInput, nowIso, toDateInput } from '../../lib/inputs.ts'
import { campaignMilestones, formatMinor, MILESTONE_LABEL, publicDocuments } from '../../lib/transparency.ts'
import type { Campaign, DemoStore, UpdateType } from '../../lib/types.ts'
import { AiPanel, MissingList, SourceChips } from './AiUI.tsx'

export interface WrittenUpdate {
  title: string
  body: string
  date: string
  type: UpdateType
  milestoneId: string
  expenseIds: string[]
}

/**
 * "Help write an update". Uses only the facts entered here plus the selected milestone, expenses and
 * evidence. Milestone status wording comes from the organizer's own status, so a plan is never
 * described as completed.
 */
export function UpdateWriter({
  campaign,
  store,
  initialMilestoneId = '',
  root,
  onApply,
  onSaveDraft,
  onClose,
}: {
  campaign: Campaign
  store: DemoStore
  initialMilestoneId?: string
  root: string
  onApply: (update: WrittenUpdate) => void
  onSaveDraft: (update: WrittenUpdate) => void
  onClose: () => void
}) {
  const ids = { happened: useId(), milestone: useId(), date: useId(), challenges: useId(), next: useId() }
  const milestones = campaignMilestones(store, campaign.id)
  const expenses = store.expenses.filter((item) => item.campaignId === campaign.id && item.status === 'published')
  const documents = publicDocuments(store, campaign.id)
  const [facts, setFacts] = useState({
    whatHappened: '',
    milestoneId: milestones.some((item) => item.id === initialMilestoneId) ? initialMilestoneId : '',
    date: toDateInput(nowIso()),
    expenseIds: [] as string[],
    challenges: '',
    next: '',
    documentIds: [] as string[],
  })
  const request = useAiRequest<AiResult<UpdateDraft>>()
  const [draft, setDraft] = useState<UpdateDraft | null>(null)
  const [saved, setSaved] = useState(false)

  function generate() {
    setSaved(false)
    void request
      .run((signal) =>
        assistantService.draftCampaignUpdate(
          {
            campaign,
            whatHappened: facts.whatHappened,
            milestone: milestones.find((item) => item.id === facts.milestoneId),
            date: fromDateInput(facts.date) ?? nowIso(),
            expenses: expenses.filter((item) => facts.expenseIds.includes(item.id)),
            challenges: facts.challenges,
            next: facts.next,
            evidence: documents.filter((item) => facts.documentIds.includes(item.id)),
          },
          { signal },
        ),
      )
      .then((value) => value && setDraft(value.content))
  }

  const written = (): WrittenUpdate | null => {
    if (!draft) return null
    return {
      title: draft.title.trim(),
      body: composeUpdateBody(draft),
      date: facts.date,
      type: facts.challenges.trim() ? 'delay' : 'progress',
      milestoneId: facts.milestoneId,
      expenseIds: facts.expenseIds,
    }
  }
  const output = written()
  const blocked = !output || hasPlaceholder(output.title) || hasPlaceholder(output.body)

  const hrefFor = (source: SourceRef) =>
    source.kind === 'milestone' ? `${root}/milestones` : source.kind === 'expense' ? `${root}/expenses` : source.kind === 'document' ? `${root}/trust` : undefined
  const toggle = (key: 'expenseIds' | 'documentIds', id: string, on: boolean) =>
    setFacts({ ...facts, [key]: on ? [...facts[key], id] : facts[key].filter((item) => item !== id) })

  return (
    <AiPanel
      title="Help write an update"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={generate}
      onClose={onClose}
      context={
        <div className="ai-inputs">
          <div className="field">
            <label className="field-label" htmlFor={ids.happened}>
              What happened?
            </label>
            <textarea id={ids.happened} rows={3} maxLength={2000} value={facts.whatHappened} placeholder="In your own words. Only describe what actually happened." onChange={(event) => setFacts({ ...facts, whatHappened: event.target.value })} />
          </div>
          <div className="two-col">
            <div className="field">
              <label className="field-label" htmlFor={ids.milestone}>
                Relevant milestone
              </label>
              <select id={ids.milestone} value={facts.milestoneId} onChange={(event) => setFacts({ ...facts, milestoneId: event.target.value })}>
                <option value="">None</option>
                {milestones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} — {MILESTONE_LABEL[item.status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor={ids.date}>
                Date
              </label>
              <input id={ids.date} type="date" value={facts.date} onChange={(event) => setFacts({ ...facts, date: event.target.value })} />
            </div>
          </div>
          {expenses.length ? (
            <fieldset className="set-fieldset">
              <legend className="field-label">Organizer-reported expenses to mention</legend>
              {expenses.map((item) => (
                <label key={item.id} className="check-row">
                  <input type="checkbox" checked={facts.expenseIds.includes(item.id)} onChange={(event) => toggle('expenseIds', item.id, event.target.checked)} />
                  {item.description} · {formatMinor(item.amountMinor, campaign.currency)}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="two-col">
            <div className="field">
              <label className="field-label" htmlFor={ids.challenges}>
                Challenges or delays <span className="optional-tag">Optional</span>
              </label>
              <textarea id={ids.challenges} rows={2} maxLength={1000} value={facts.challenges} onChange={(event) => setFacts({ ...facts, challenges: event.target.value })} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor={ids.next}>
                What happens next?
              </label>
              <textarea id={ids.next} rows={2} maxLength={1000} value={facts.next} onChange={(event) => setFacts({ ...facts, next: event.target.value })} />
            </div>
          </div>
          {documents.length ? (
            <fieldset className="set-fieldset">
              <legend className="field-label">Public evidence to reference</legend>
              {documents.map((item) => (
                <label key={item.id} className="check-row">
                  <input type="checkbox" checked={facts.documentIds.includes(item.id)} onChange={(event) => toggle('documentIds', item.id, event.target.checked)} />
                  {item.title}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={request.status === 'loading'}>
              {draft ? 'Draft again' : 'Draft update'}
            </button>
          </div>
        </div>
      }
    >
      {draft && request.status === 'success' ? (
        <div className="ai-output">
          {(['title', 'summary', 'body', 'spending', 'nextSteps'] as const).map((key) => (
            <div key={key} className="ai-field">
              <label className="field-label" htmlFor={`uw-${key}`}>
                {{ title: 'Title', summary: 'Short summary', body: 'Main update', spending: 'Reported spending summary', nextSteps: 'Next steps' }[key]}
              </label>
              <textarea id={`uw-${key}`} rows={key === 'body' ? 6 : key === 'title' ? 1 : 2} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
            </div>
          ))}
          <SourceChips sources={request.data?.sources ?? []} hrefFor={hrefFor} />
          <MissingList items={request.data?.missing ?? []} />
          {blocked ? <p className="muted small">Replace the [bracketed] text with real information before using this draft.</p> : null}
          {saved ? (
            <div className="notice success compact" role="status">
              Saved as a draft update. It is not public until you publish it from the list.
            </div>
          ) : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={blocked} onClick={() => output && onApply(output)}>
              Apply to editor
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={blocked || saved}
              onClick={() => {
                if (!output) return
                onSaveDraft(output)
                setSaved(true)
              }}
            >
              Save as draft
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setDraft(null)
                request.reset()
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </AiPanel>
  )
}
