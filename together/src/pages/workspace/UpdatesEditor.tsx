import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AiButton } from '../../components/ai/AiUI.tsx'
import { UpdateWriter, type WrittenUpdate } from '../../components/ai/UpdateWriter.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { Checkbox, MediaEditor, Select, TextArea, TextInput, VideoEditor } from '../../components/workspace/fields.tsx'
import { formatDate } from '../../lib/format.ts'
import { fromDateInput, toDateInput, nowIso } from '../../lib/inputs.ts'
import { validateUpdate } from '../../lib/validation.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { campaignMilestones, deleteUpdate, formatMinor, newId, saveUpdate, UPDATE_TYPE_LABEL } from '../../lib/transparency.ts'
import type { CampaignUpdate, MediaItem, MediaVideo, PublishState, UpdateType } from '../../lib/types.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

interface UpdateDraft {
  id?: string
  type: UpdateType
  title: string
  date: string
  body: string
  media: MediaItem[]
  video?: MediaVideo
  milestoneId: string
  expenseIds: string[]
  mediaConsent: boolean
}

function toDraft(update?: CampaignUpdate): UpdateDraft {
  return {
    id: update?.id,
    type: update?.type ?? 'progress',
    title: update?.title ?? '',
    date: toDateInput(update?.date ?? nowIso()),
    body: update?.body ?? '',
    media: update?.media ?? [],
    video: update?.video,
    milestoneId: update?.milestoneId ?? '',
    expenseIds: update?.expenseIds ?? [],
    mediaConsent: update?.mediaConsent ?? false,
  }
}

export function UpdatesEditor({ campaign, store }: WorkspaceProps) {
  const updates = store.campaignUpdates
    .filter((item) => item.campaignId === campaign.id)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const milestones = campaignMilestones(store, campaign.id)
  const expenses = store.expenses.filter((item) => item.campaignId === campaign.id && item.status === 'published')
  const [draft, setDraft] = useState<UpdateDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [params, setParams] = useSearchParams()
  const [writing, setWriting] = useState(params.get('assist') === '1')
  const { base } = useOrg()
  const root = `${base}/dashboard/${campaign.id}`

  function fromWriter(update: WrittenUpdate): UpdateDraft {
    return { ...toDraft(), title: update.title, body: update.body, date: update.date, type: update.type, milestoneId: update.milestoneId, expenseIds: update.expenseIds }
  }

  function save(status: PublishState) {
    if (!draft) return
    const next = validateUpdate(draft, status === 'published')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const existing = updates.find((item) => item.id === draft.id)
    const now = nowIso()
    const date = fromDateInput(draft.date)!
    try {
      saveUpdate({
        id: draft.id ?? newId('upd'),
        campaignId: campaign.id,
        type: draft.type,
        title: draft.title.trim(),
        date,
        body: draft.body.trim(),
        media: draft.media,
        video: draft.video,
        milestoneId: draft.milestoneId || undefined,
        expenseIds: [...new Set(draft.expenseIds)],
        mediaConsent: draft.mediaConsent,
        status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        publishedAt: status === 'published' ? (existing?.publishedAt ?? now) : undefined,
      })
      setDraft(null)
      setNotice(status === 'published' ? 'Update published. It now appears on the public Updates tab.' : 'Draft saved. Drafts are not shown publicly.')
    } catch (problem) {
      setErrors({ form: problem instanceof StorageFullError ? 'Browser storage is full. Remove an image or the video and try again.' : 'The update could not be saved.' })
    }
  }

  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <div className="section-head-row">
          <h2>Public updates</h2>
          <div className="inline-actions">
            <AiButton onClick={() => setWriting(true)}>Help write an update</AiButton>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDraft(toDraft())}>
              + New update
            </button>
          </div>
        </div>
        {writing ? (
          <UpdateWriter
            campaign={campaign}
            store={store}
            root={root}
            initialMilestoneId={params.get('milestone') ?? ''}
            onClose={() => {
              setWriting(false)
              setParams({}, { replace: true })
            }}
            onApply={(update) => {
              if (draft && (draft.title || draft.body) && !window.confirm('Replace what is currently in the update editor?')) return
              setDraft(fromWriter(update))
              setNotice('Draft applied to the editor below. Review it, then save or publish.')
            }}
            onSaveDraft={(update) => {
              const now = nowIso()
              saveUpdate({
                id: newId('upd'),
                campaignId: campaign.id,
                type: update.type,
                title: update.title,
                date: fromDateInput(update.date) ?? now,
                body: update.body,
                media: [],
                milestoneId: update.milestoneId || undefined,
                expenseIds: update.expenseIds,
                mediaConsent: false,
                status: 'draft',
                createdAt: now,
                updatedAt: now,
              })
            }}
          />
        ) : null}
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        {updates.every((item) => item.status !== 'published') ? <p className="prompt-inline">Your campaign has no published updates yet.</p> : null}
        <ul className="ws-list">
          {updates.map((update) => (
            <li key={update.id}>
              <div>
                <strong>{update.title}</strong>
                <span className="muted small">
                  {UPDATE_TYPE_LABEL[update.type]} · {formatDate(update.date)} · {update.status === 'published' ? 'Published' : 'Draft — not public'}
                </span>
              </div>
              <div className="inline-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(toDraft(update))}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm(`Delete “${update.title}”?`)) deleteUpdate(update.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {draft ? (
        <section className="panel ws-card wide" aria-label={draft.id ? 'Edit update' : 'New update'}>
          <h2>{draft.id ? 'Edit update' : 'New update'}</h2>
          <div className="two-col">
            <Select
              label="Update type"
              value={draft.type}
              options={(Object.keys(UPDATE_TYPE_LABEL) as UpdateType[]).map((value) => ({ value, label: UPDATE_TYPE_LABEL[value] }))}
              onChange={(type) => setDraft({ ...draft, type: type as UpdateType })}
            />
            <TextInput label="Date" type="date" value={draft.date} error={errors.date} onChange={(date) => setDraft({ ...draft, date })} />
          </div>
          <TextInput label="Title" value={draft.title} maxLength={140} error={errors.title} onChange={(title) => setDraft({ ...draft, title })} />
          <TextArea
            label="Story"
            rows={6}
            maxLength={5000}
            value={draft.body}
            error={errors.body}
            help="What happened, what changed, what’s next. Avoid names, addresses or details that identify the people you help."
            onChange={(body) => setDraft({ ...draft, body })}
          />
          <MediaEditor items={draft.media} error={errors.media} onChange={(media) => setDraft({ ...draft, media })} />
          <VideoEditor video={draft.video} onChange={(video) => setDraft({ ...draft, video })} />
          {draft.media.length > 0 || draft.video ? (
            <>
              <Checkbox
                label="I have permission to publish these images or video, and they don’t show identifying details of people we help without their consent."
                checked={draft.mediaConsent}
                onChange={(mediaConsent) => setDraft({ ...draft, mediaConsent })}
              />
              {errors.mediaConsent ? <p className="error-text">{errors.mediaConsent}</p> : null}
            </>
          ) : null}
          <Select
            label="Related milestone"
            value={draft.milestoneId}
            options={[{ value: '', label: 'None' }, ...milestones.map((item) => ({ value: item.id, label: item.title }))]}
            onChange={(milestoneId) => setDraft({ ...draft, milestoneId })}
          />
          {expenses.length > 0 ? (
            <fieldset className="set-fieldset">
              <legend className="field-label">
                Related published expenses <span className="optional-tag">Optional</span>
              </legend>
              <p className="help">Linking an expense here never counts it twice — totals come from the expense list.</p>
              {expenses.map((expense) => (
                <label key={expense.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={draft.expenseIds.includes(expense.id)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        expenseIds: event.target.checked ? [...draft.expenseIds, expense.id] : draft.expenseIds.filter((id) => id !== expense.id),
                      })
                    }
                  />
                  {expense.description} · {formatMinor(expense.amountMinor, campaign.currency)}
                </label>
              ))}
            </fieldset>
          ) : null}
          {errors.form ? <p className="error-text">{errors.form}</p> : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary" onClick={() => save('published')}>
              Publish update
            </button>
            <button type="button" className="btn btn-outline" onClick={() => save('draft')}>
              Save as draft
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
