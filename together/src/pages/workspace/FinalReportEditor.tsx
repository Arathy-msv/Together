import { useState } from 'react'
import { FinalReportCard } from '../../components/campaign/PublicSections.tsx'
import { TextArea } from '../../components/workspace/fields.tsx'
import { StorageFullError } from '../../lib/storage.ts'
import { nowIso } from '../../lib/inputs.ts'
import { templateFor } from '../../lib/templates.ts'
import { campaignMilestones, formatMinor, fundSummary, publicDocuments, publishedUpdates, saveCampaignFields } from '../../lib/transparency.ts'
import type { FinalReport } from '../../lib/types.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

export function FinalReportEditor({ campaign, view, store }: WorkspaceProps) {
  const template = templateFor(campaign.category)
  const existing = campaign.finalReport
  const [report, setReport] = useState<FinalReport>(
    () =>
      existing ?? {
        status: 'draft',
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
  const summary = fundSummary(campaign, store)
  const unfinished = campaignMilestones(store, campaign.id).filter((item) => item.status !== 'reported_complete')
  const docs = publicDocuments(store, campaign.id)
  const updates = publishedUpdates(store, campaign.id)

  function save(status: FinalReport['status']) {
    if (status === 'published' && report.outcomes.trim().length < 20) {
      setError('Describe the outcomes in at least a sentence before publishing.')
      return
    }
    if (status === 'published' && summary.balanceMinor !== 0 && !report.remainingPlan.trim()) {
      setError('Explain the plan for the remaining (or additional) funds before publishing.')
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
          Closing fundraising and publishing a final report are separate steps. Fundraising is currently <strong>{view.status}</strong>; the report is{' '}
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
          help="Required when the demo balance is not zero."
          onChange={(remainingPlan) => setReport({ ...report, remainingPlan })}
        />
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
