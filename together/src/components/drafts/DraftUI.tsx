import type { SaveStatus } from '../../hooks/useAutosave.ts'
import { draftTitle, type CampaignDraft } from '../../lib/drafts.ts'
import { formatDateTime } from '../../lib/format.ts'
import type { RequiredItem } from '../../lib/wizard.ts'

export function SaveIndicator({ status, savedAt, error }: { status: SaveStatus; savedAt: string | null; error: string }) {
  if (status === 'error') {
    return (
      <span className="save-indicator error" role="alert">
        Not saved — {error || 'this browser could not store your draft.'}
      </span>
    )
  }
  return (
    <span className={`save-indicator ${status}`} role="status" aria-live="polite">
      {status === 'saving'
        ? 'Saving…'
        : status === 'saved' && savedAt
          ? `Saved on this device · ${formatDateTime(savedAt)}`
          : 'Changes save automatically on this device'}
    </span>
  )
}

export function RequiredProgress({ items, onJump }: { items: RequiredItem[]; onJump?: (item: RequiredItem) => void }) {
  const done = items.filter((item) => item.done).length
  const missing = items.filter((item) => !item.done)
  return (
    <div className="required-progress">
      <div className="required-progress-head">
        <strong>
          {done} of {items.length} required details
        </strong>
        <span className="muted small">Optional story details never count against you.</span>
      </div>
      <span className="required-bar" aria-hidden="true">
        <i style={{ width: `${items.length ? Math.round((done / items.length) * 100) : 0}%` }} />
      </span>
      {onJump && missing.length > 0 ? (
        <ul className="missing-list" aria-label="Missing required details">
          {missing.map((item) => (
            <li key={item.id}>
              <button type="button" className="link-button" onClick={() => onJump(item)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** "Continue your campaign draft?" — shown when an organizer returns with unfinished drafts. */
export function ResumeDrafts({
  drafts,
  progress,
  onContinue,
  onStartAnother,
  onDiscard,
}: {
  drafts: CampaignDraft[]
  progress: (draft: CampaignDraft) => { done: number; total: number }
  onContinue: (draft: CampaignDraft) => void
  onStartAnother: () => void
  onDiscard: (draft: CampaignDraft) => void
}) {
  return (
    <section className="panel resume-card" aria-labelledby="resume-title">
      <h1 id="resume-title">Continue your campaign draft?</h1>
      <p className="muted">Drafts are saved on this device only. Starting another draft keeps these ones.</p>
      <ul className="resume-list">
        {drafts.map((draft) => {
          const { done, total } = progress(draft)
          return (
            <li key={draft.id}>
              <div>
                <strong>{draftTitle(draft)}</strong>
                <span className="muted small">
                  {draft.kind === 'assistant' ? 'Campaign assistant' : 'Campaign form'} · Last edited {formatDateTime(draft.updatedAt)} · {done} of {total}{' '}
                  required details
                </span>
              </div>
              <div className="inline-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onContinue(draft)}>
                  Continue draft
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm(`Discard “${draftTitle(draft)}”? This cannot be undone.`)) onDiscard(draft)
                  }}
                >
                  Discard draft
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn btn-outline" onClick={onStartAnother}>
        Start another draft
      </button>
    </section>
  )
}
