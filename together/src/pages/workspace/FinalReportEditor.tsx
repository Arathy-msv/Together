import { useState } from 'react'
import { FinalReportCard } from '../../components/campaign/PublicSections.tsx'
import { TextArea } from '../../components/workspace/fields.tsx'
import { AiButton } from '../../components/ai/AiUI.tsx'
import { ReportWriter } from '../../components/ai/ReportWriter.tsx'
import { hasPlaceholder } from '../../lib/ai/types.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { nowIso } from '../../lib/inputs.ts'
import { templateFor } from '../../lib/templates.ts'
import { campaignMilestones, formatMinor, fundSummary, publicDocuments, publishedUpdates, saveCampaignFields } from '../../lib/transparency.ts'
import { FUNDRAISING_LABEL, fundraisingState } from '../../lib/lifecycle.ts'
import { CLOSURE_LABEL, type ClosureOutcome, type FinalReport } from '../../lib/types.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

export function FinalReportEditor({ campaign, view, store }: WorkspaceProps) {
  const template = templateFor(campaign.category)
  const existing = campaign.finalReport
  const [report, setReport] = useState<FinalReport>(
    () =>
      existing ?? {
        status: 'draft',
        closure: undefined,
        outcomes: '',
        outcomeFields: template.impactFields.map((label) => ({ label, value: '' })),
        remainingPlan: '',
        evidenceDocumentIds: [],
        evidenceUpdateIds: [],
        updatedAt: nowIso(),
      },
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [writing, setWriting] = useState(false)
  const summary = fundSummary(campaign, store)
  const unfinished = campaignMilestones(store, campaign.id).filter((item) => item.status !== 'reported_complete')
  const docs = publicDocuments(store, campaign.id)
  const updates = publishedUpdates(store, campaign.id)

  function save(status: FinalReport['status']) {
    if (status === 'published' && hasPlaceholder(report.outcomes + report.remainingPlan)) {
      setError('Replace the [bracketed] placeholders with your own information before publishing.')
      return
    }
    if (status === 'published' && !reviewed) {
      setError('Tick “I have reviewed this report” before publishing.')
      return
    }
    if (status === 'published' && report.outcomes.trim().length < 20) {
      setError('Describe the outcomes in at least a sentence before publishing.')
      return
    }
    if (status === 'published' && !report.closure) {
      setError('Choose how this campaign ended before publishing.')
      return
    }
    if (status === 'published' && summary.balanceMinor !== 0 && !report.remainingPlan.trim()) {
      setError('Explain the plan for the remaining (or additional) funds before publishing. A refund plan is a statement, not a processed refund.')
      return
    }
    if (status === 'published' && report.closure && report.closure !== 'delivered' && !report.unmetExplanation?.trim()) {
      setError('Explain what was not completed before publishing.')
      return
    }
    if (status === 'published' && report.closure && report.closure !== 'delivered' && !report.changedPlan?.trim()) {
      setError('Explain what changed from the original plan before publishing.')
      return
    }
    if (status === 'published' && (report.closure === 'partial' || report.closure === 'activities_remaining') && !report.outstandingObligations?.trim()) {
      setError('Describe any outstanding obligations, or write “None”, before publishing.')
      return
    }
    setError('')
    const now = nowIso()
    const next: FinalReport = { ...report, status, updatedAt: now, publishedAt: status === 'published' ? (existing?.publishedAt ?? now) : undefined }
    try {
      saveCampaignFields(campaign.id, { finalReport: next })
      setReport(next)
      setNotice(status === 'published' ? 'Final report published on the Updates tab.' : 'Final report saved as a draft. It is not public.')
    } catch (problem) {
      setError(problem instanceof StorageFullError ? problem.message : 'The report could not be saved.')
    }
  }

  const toggle = (key: 'evidenceDocumentIds' | 'evidenceUpdateIds', id: string, on: boolean) =>
    setReport({ ...report, [key]: on ? [...report[key], id] : report[key].filter((item) => item !== id) })

  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <h2>Final report</h2>
        <p className="muted small">
          A closure report can be honest when work is unfinished. Publishing it does not mark milestones complete, and it does not close fundraising. Fundraising is currently <strong>{FUNDRAISING_LABEL[fundraisingState(view)]}</strong>; the report is{' '}
          <strong>{report.status === 'published' ? 'published' : 'a draft'}</strong>.
        </p>
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        <dl className="ws-stats">
          <div>
            <dt>Total simulated contributions</dt>
            <dd>{formatMinor(summary.contributedMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Published expenses</dt>
            <dd>{formatMinor(summary.spentMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Remaining (demo calculation)</dt>
            <dd className={summary.balanceMinor < 0 ? 'negative-text' : ''}>{formatMinor(summary.balanceMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Unfinished milestones</dt>
            <dd>{unfinished.length ? unfinished.map((item) => item.title).join(', ') : 'None'}</dd>
          </div>
        </dl>
        {writing ? (
          <ReportWriter
            campaign={campaign}
            store={store}
            initialOutcomes={report.outcomes}
            initialPlan={report.remainingPlan}
            onClose={() => setWriting(false)}
            onApply={(draft, plan) => {
              if (report.outcomes.trim() && !window.confirm('Replace the outcomes text in the report editor? Your current text will be overwritten.')) return
              setReport({ ...report, outcomes: draft.outcomesText, remainingPlan: plan, evidenceDocumentIds: draft.evidenceDocumentIds, evidenceUpdateIds: draft.evidenceUpdateIds })
              setReviewed(false)
              setNotice('Draft applied to the report editor. Review it carefully — it is not published.')
              setWriting(false)
            }}
          />
        ) : (
          <div className="readiness-launch">
            <AiButton onClick={() => setWriting(true)}>Draft final report</AiButton>
            <span className="muted small">Builds a structured draft from your published records. Amounts are calculated by the app.</span>
          </div>
        )}
        <label className="field">
          <span className="field-label">How did the campaign end?</span>
          <select value={report.closure ?? ''} onChange={(event) => setReport({ ...report, closure: (event.target.value || undefined) as ClosureOutcome | undefined })}>
            <option value="">Choose an outcome</option>
            {(Object.keys(CLOSURE_LABEL) as ClosureOutcome[]).map((key) => (
              <option key={key} value={key}>
                {CLOSURE_LABEL[key]}
              </option>
            ))}
          </select>
          <p className="help">You can publish while milestones are still open. This report does not change their status.</p>
        </label>
        <TextArea
          label="Outcomes reported by the organizer"
          rows={5}
          maxLength={3000}
          value={report.outcomes}
          help="What was delivered, what changed, and anything that didn’t go to plan."
          onChange={(outcomes) => setReport({ ...report, outcomes })}
        />
        <fieldset className="set-fieldset">
          <legend className="field-label">Outcome figures (organizer-reported)</legend>
          {report.outcomeFields.map((field, index) => (
            <div key={field.label} className="plan-row">
              <span className="field-label">{field.label}</span>
              <input
                aria-label={field.label}
                value={field.value}
                maxLength={200}
                onChange={(event) => setReport({ ...report, outcomeFields: report.outcomeFields.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)) })}
              />
            </div>
          ))}
        </fieldset>
        <TextArea
          label="Remaining funds and the plan for them"
          maxLength={1500}
          value={report.remainingPlan}
          help="Required when the demo balance is not zero. Saying you will refund is a statement only — this prototype does not process refunds."
          onChange={(remainingPlan) => setReport({ ...report, remainingPlan })}
        />
        {report.closure && report.closure !== 'delivered' ? (
          <>
            <TextArea label="What was not completed" value={report.unmetExplanation ?? ''} maxLength={1500} onChange={(unmetExplanation) => setReport({ ...report, unmetExplanation })} />
            <TextArea label="What changed from the plan" value={report.changedPlan ?? ''} maxLength={1500} onChange={(changedPlan) => setReport({ ...report, changedPlan })} />
            <TextArea label="Outstanding obligations" value={report.outstandingObligations ?? ''} maxLength={1500} help="Include supplier commitments or a refund you intend to make. Write “None” if there are none." onChange={(outstandingObligations) => setReport({ ...report, outstandingObligations })} />
          </>
        ) : null}
        {docs.length || updates.length ? (
          <fieldset className="set-fieldset">
            <legend className="field-label">Evidence links</legend>
            {docs.map((doc) => (
              <label key={doc.id} className="check-row">
                <input type="checkbox" checked={report.evidenceDocumentIds.includes(doc.id)} onChange={(event) => toggle('evidenceDocumentIds', doc.id, event.target.checked)} />
                Document: {doc.title}
              </label>
            ))}
            {updates.map((update) => (
              <label key={update.id} className="check-row">
                <input type="checkbox" checked={report.evidenceUpdateIds.includes(update.id)} onChange={(event) => toggle('evidenceUpdateIds', update.id, event.target.checked)} />
                Update: {update.title}
              </label>
            ))}
          </fieldset>
        ) : null}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <label className="check-row">
          <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
          I have reviewed this report and it reflects what the organizer reports.
        </label>
        <div className="inline-actions">
          <button type="button" className="btn btn-primary" onClick={() => save('published')}>
            Publish final report
          </button>
          <button type="button" className="btn btn-outline" onClick={() => save('draft')}>
            {report.status === 'published' ? 'Unpublish and keep as draft' : 'Save draft'}
          </button>
        </div>
      </section>
      {report.status === 'published' ? (
        <section className="panel ws-card wide">
          <h2>Public preview</h2>
          <FinalReportCard campaign={{ ...campaign, finalReport: report }} store={store} />
        </section>
      ) : null}
    </div>
  )
}
