import type { SaveStatus } from '../../hooks/useAutosave.ts'
import { draftTitle, type CampaignDraft } from '../../lib/drafts.ts'
import { formatDateTime } from '../../lib/format.ts'
import { CAMPAIGN_GROUPS, type CampaignGroup, type RequiredItem } from '../../lib/wizard.ts'

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

/**
 * Progress indicator for campaign drafts: What and goal, then Review and publish.
 */
export function SetupIndicator({
  items,
  current,
  onGroup,
}: {
  items: RequiredItem[]
  current: CampaignGroup
  onGroup?: (group: CampaignGroup) => void
}) {
  const done = items.filter((item) => item.done).length
  const missing = items.length - done
  const lastId = CAMPAIGN_GROUPS[CAMPAIGN_GROUPS.length - 1].id
  return (
    <nav className="setup-indicator" aria-label="Campaign setup">
      <ol>
        {CAMPAIGN_GROUPS.map((group) => {
          const own = items.filter((item) => item.step === group.id)
          const ownDone = own.filter((item) => item.done).length
          const complete = group.id === lastId ? missing === 0 : own.length > 0 && ownDone === own.length
          const status = group.id === lastId ? (missing === 0 ? 'Ready' : `${missing} still needed`) : own.length ? `${ownDone} of ${own.length} required` : 'Optional'
          const state = group.id === current ? 'current' : complete ? 'done' : 'todo'
          const body = (
            <>
              <span className="setup-mark" aria-hidden="true">
                {complete && group.id !== current ? '✓' : group.id}
              </span>
              <span className="setup-text">
                <strong>{group.label}</strong>
                <em>{status}</em>
              </span>
            </>
          )
          return (
            <li key={group.id} className={state}>
              {onGroup ? (
                <button type="button" onClick={() => onGroup(group.id)} aria-current={group.id === current ? 'step' : undefined}>
                  {body}
                </button>
              ) : (
                <span aria-current={group.id === current ? 'step' : undefined}>{body}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
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
                  {draft.kind === 'assistant' ? 'Campaign assistant' : 'Campaign form'} · Last edited {formatDateTime(draft.updatedAt)} ·{' '}
                  {total - done === 0 ? 'Ready for review' : `${total - done} required ${total - done === 1 ? 'detail' : 'details'} still needed`}
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
