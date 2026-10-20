import { useId, useState } from 'react'
import { useOrg } from '../org/OrgContext.tsx'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { AiResult, SourceRef } from '../../lib/ai/types.ts'
import type { ImpactReportDraft } from '../../lib/ai/writers.ts'
import type { Campaign, DemoStore } from '../../lib/types.ts'
import { AiPanel, MissingList, SourceChips } from './AiUI.tsx'

/**
 * "Draft final report". Figures come from the app's financial helpers, milestone statuses and
 * published records; the organizer supplies outcomes and the plan for remaining funds.
 */
export function ReportWriter({
  campaign,
  store,
  initialOutcomes,
  initialPlan,
  onApply,
  onClose,
}: {
  campaign: Campaign
  store: DemoStore
  initialOutcomes: string
  initialPlan: string
  onApply: (draft: ImpactReportDraft, plan: string) => void
  onClose: () => void
}) {
  const { base } = useOrg()
  const root = `${base}/dashboard/${campaign.id}`
  const ids = { outcomes: useId(), plan: useId(), text: useId() }
  // Earlier generated drafts contain section headings; only the organizer's own words are reused.
  const [outcomes, setOutcomes] = useState(initialOutcomes.includes('Fundraising summary\n') ? '' : initialOutcomes)
  const [plan, setPlan] = useState(initialPlan)
  const [text, setText] = useState('')
  const request = useAiRequest<AiResult<ImpactReportDraft>>()

  function generate() {
    void request
      .run((signal) => assistantService.draftImpactReport({ campaign, store, outcomes, plan }, { signal }))
      .then((value) => value && setText(value.content.outcomesText))
  }

  const hrefFor = (source: SourceRef) =>
    ({ expense: `${root}/expenses`, milestone: `${root}/milestones`, update: `${root}/updates`, document: `${root}/trust`, campaign: root } as Record<string, string>)[source.kind]

  return (
    <AiPanel
      title="Draft final report"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={generate}
      onClose={onClose}
      context={
        <div className="ai-inputs">
          <div className="field">
            <label className="field-label" htmlFor={ids.outcomes}>
              Outcomes you want to report
            </label>
            <textarea id={ids.outcomes} rows={3} value={outcomes} placeholder="What was actually delivered, in your words." onChange={(event) => setOutcomes(event.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={ids.plan}>
              Plan for remaining funds
            </label>
            <textarea id={ids.plan} rows={2} value={plan} onChange={(event) => setPlan(event.target.value)} />
          </div>
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={request.status === 'loading'}>
              {text ? 'Draft again' : 'Draft report'}
            </button>
          </div>
        </div>
      }
    >
      {request.status === 'success' && request.data ? (
        <div className="ai-output">
          <div className="report-preview">
            {request.data.content.sections.map((section) => (
              <section key={section.heading}>
                <h4>{section.heading}</h4>
                <p>{section.text}</p>
              </section>
            ))}
          </div>
          <div className="ai-field">
            <label className="field-label" htmlFor={ids.text}>
              Editable report text
            </label>
            <textarea id={ids.text} rows={12} value={text} onChange={(event) => setText(event.target.value)} />
          </div>
          <SourceChips sources={request.data.sources} hrefFor={hrefFor} />
          <MissingList items={request.data.missing} />
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={() => onApply({ ...request.data!.content, outcomesText: text }, plan)}>
              Apply to report editor
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </AiPanel>
  )
}
