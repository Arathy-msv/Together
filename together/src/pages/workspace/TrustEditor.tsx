import { useState } from 'react'
import { StatusPill } from '../../components/campaign/PublicSections.tsx'
import { Checkbox, Select, SingleImage, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { formatDate } from '../../lib/format.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { nowIso } from '../../lib/inputs.ts'
import { deleteDocument, newId, saveDocument } from '../../lib/transparency.ts'
import { validateDocument } from '../../lib/validation.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

const PUBLIC_TYPES = ['Quotation', 'Partner letter', 'Redacted invoice', 'Photo of purchased items', 'Annual report', 'Other']

const SAMPLES = [
  { src: '/docs/sample-quote.svg', label: 'Sample quotation (fictional)' },
  { src: '/docs/sample-partner-letter.svg', label: 'Sample partner letter (fictional)' },
  { src: '/docs/sample-receipt-redacted.svg', label: 'Sample redacted invoice (fictional)' },
]

const VERIFICATION_SAMPLES = ['Charity registration certificate (sample)', 'Organizer identity check (sample placeholder)', 'Bank account confirmation (sample placeholder)']

export function TrustEditor({ campaign, store }: WorkspaceProps) {
  const publicDocs = store.supportingDocuments.filter((doc) => doc.campaignId === campaign.id && doc.visibility === 'public')
  const privateDocs = store.supportingDocuments.filter((doc) => doc.campaignId === campaign.id && doc.visibility === 'private')
  const [draft, setDraft] = useState({
    title: '',
    docType: PUBLIC_TYPES[0],
    description: '',
    caption: '',
    expenseId: '',
    milestoneId: '',
    updateId: '',
    fileSrc: undefined as string | undefined,
    sample: false,
    noPersonalData: false,
  })
  const [adding, setAdding] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [verificationType, setVerificationType] = useState(VERIFICATION_SAMPLES[0])

  function addPublic() {
    const next = validateDocument(draft)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      saveDocument({
        id: newId('doc'),
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        visibility: 'public',
        title: draft.title.trim(),
        docType: draft.docType,
        description: draft.description.trim(),
        caption: draft.caption.trim() || undefined,
        expenseId: draft.expenseId || undefined,
        milestoneId: draft.milestoneId || undefined,
        updateId: draft.updateId || undefined,
        fileSrc: draft.fileSrc,
        sample: draft.sample,
        createdAt: nowIso(),
      })
      setAdding(false)
      setDraft({ title: '', docType: PUBLIC_TYPES[0], description: '', caption: '', expenseId: '', milestoneId: '', updateId: '', fileSrc: undefined, sample: false, noPersonalData: false })
      setNotice('Document added to public evidence. It is shown as “Supporting evidence attached”, not as verified.')
    } catch (problem) {
      setErrors({ form: problem instanceof StorageFullError ? 'Browser storage is full. Try a smaller image.' : 'The document could not be saved.' })
    }
  }

  function submitVerification() {
    saveDocument({
      id: newId('doc'),
      campaignId: campaign.id,
      organizationId: campaign.organizationId,
      visibility: 'private',
      title: `${verificationType} — verification placeholder`,
      docType: verificationType,
      description: 'Demo submission. No file is stored and nothing is reviewed in this prototype.',
      sample: true,
      reviewState: 'submitted_demo',
      createdAt: nowIso(),
    })
    setNotice('Demo submission recorded. No review happens in this prototype and no badge is granted.')
  }

  return (
    <div className="workspace-grid">
      {notice ? (
        <div className="notice success wide" role="status">
          {notice}
        </div>
      ) : null}
      <section className="panel ws-card wide">
        <div className="section-head-row">
          <h2>Public campaign evidence</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
            + Add document
          </button>
        </div>
        <p className="muted small">Shown publicly as “Supporting evidence attached”. An attachment is never labelled independently verified. Private originals stay off the public page.</p>
        {publicDocs.length === 0 ? <p className="awaiting">No supporting evidence uploaded.</p> : null}
        <ul className="ws-list">
          {publicDocs.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{doc.title}</strong>
                <span className="muted small">
                  {doc.docType} · {formatDate(doc.createdAt)}
                  {doc.sample ? ' · Fictional sample' : ''}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  if (window.confirm(`Remove “${doc.title}” from public evidence?`)) deleteDocument(doc.id)
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <div className="ws-subform">
            <TextInput label="Title" value={draft.title} maxLength={140} error={errors.title} onChange={(title) => setDraft({ ...draft, title })} />
            <Select label="Document type" value={draft.docType} options={PUBLIC_TYPES.map((value) => ({ value, label: value }))} onChange={(docType) => setDraft({ ...draft, docType })} />
            <TextInput label="Caption" optional value={draft.caption} maxLength={200} onChange={(caption) => setDraft({ ...draft, caption })} />
            <TextArea label="Description" optional value={draft.description} maxLength={600} onChange={(description) => setDraft({ ...draft, description })} />
            <Select label="Related expense" value={draft.expenseId} options={[{ value: '', label: 'None' }, ...store.expenses.filter((item) => item.campaignId === campaign.id).map((item) => ({ value: item.id, label: item.description }))]} onChange={(expenseId) => setDraft({ ...draft, expenseId })} />
            <Select label="Related milestone" value={draft.milestoneId} options={[{ value: '', label: 'None' }, ...store.milestones.filter((item) => item.campaignId === campaign.id).map((item) => ({ value: item.id, label: item.title }))]} onChange={(milestoneId) => setDraft({ ...draft, milestoneId })} />
            <Select label="Related update" value={draft.updateId} options={[{ value: '', label: 'None' }, ...store.campaignUpdates.filter((item) => item.campaignId === campaign.id).map((item) => ({ value: item.id, label: item.title }))]} onChange={(updateId) => setDraft({ ...draft, updateId })} />
            <SingleImage label="Document image" optional={false} value={draft.sample ? undefined : draft.fileSrc} onChange={(fileSrc) => setDraft({ ...draft, fileSrc, sample: false })} />
            <fieldset className="set-fieldset">
              <legend className="field-label">Or use a fictional sample</legend>
              <div className="chat-chips">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.src}
                    type="button"
                    className={draft.sample && draft.fileSrc === sample.src ? 'chip selected' : 'chip'}
                    aria-pressed={draft.sample && draft.fileSrc === sample.src}
                    onClick={() => setDraft({ ...draft, fileSrc: sample.src, sample: true })}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {errors.fileSrc ? <p className="error-text">{errors.fileSrc}</p> : null}
            <Checkbox
              label="This public document contains no identity documents, home addresses, signatures, bank details or other personal data."
              checked={draft.noPersonalData}
              onChange={(noPersonalData) => setDraft({ ...draft, noPersonalData })}
            />
            {errors.noPersonalData ? <p className="error-text">{errors.noPersonalData}</p> : null}
            {errors.form ? <p className="error-text">{errors.form}</p> : null}
            <div className="inline-actions">
              <button type="button" className="btn btn-primary" onClick={addPublic}>
                Add to public evidence
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel ws-card wide private-zone" aria-labelledby="verify-title">
        <h2 id="verify-title">Verification (private placeholder)</h2>
        <p className="small">
          Identity and registration review would require a future secure service with proper consent, storage and human review. This prototype has none, so it
          never asks for real identity documents and never shows these records publicly.
        </p>
        <ul className="ws-list">
          {privateDocs.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{doc.docType}</strong>
                <span className="muted small">Submitted {formatDate(doc.createdAt)} · no file stored</span>
              </div>
              <StatusPill tone="neutral">Submitted (demo) — not reviewed</StatusPill>
            </li>
          ))}
        </ul>
        <div className="ws-subform">
          <Select
            label="Demonstrate a submission with a fictional sample"
            value={verificationType}
            options={VERIFICATION_SAMPLES.map((value) => ({ value, label: value }))}
            onChange={setVerificationType}
          />
          <button type="button" className="btn btn-outline btn-sm" onClick={submitVerification}>
            Submit sample for demo review
          </button>
        </div>
        <p className="muted small">
          Badges: organizers cannot grant themselves a verified badge. {campaign.demoVerification ? 'This campaign shows a seeded “Demo verification” example, labelled as such.' : 'This campaign shows “Not independently verified”.'}
        </p>
      </section>
    </div>
  )
}
