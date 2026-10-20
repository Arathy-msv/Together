import { useState } from 'react'
import { useOrg } from '../org/OrgContext.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { canPublishApproved, eligibleReviewers, NO_REVIEWER_MESSAGE, publishApprovedRevision, reviewRevision } from '../../lib/featureActions.ts'
import { formatDateTime, formatMoney } from '../../lib/format.ts'
import { userName } from '../../lib/identity.ts'
import { can } from '../../lib/permissions.ts'
import { StorageFullError } from '../../lib/storage.ts'
import type { Campaign } from '../../lib/types.ts'

/** Short list of what a revision changes compared with the live campaign. */
function changedFields(campaign: Campaign): string[] {
  const revision = campaign.pendingRevision
  if (!revision) return []
  if (campaign.isDraft) return ['New campaign — not published yet']
  const next = revision.snapshot
  const lines: string[] = []
  if (next.title !== campaign.title) lines.push(`Title: “${next.title}”`)
  if (next.description !== campaign.description) lines.push('Description')
  if (next.goalAmount !== campaign.goalAmount) lines.push(`Goal: ${formatMoney(next.goalAmount, next.currency)}`)
  if (JSON.stringify(next.story) !== JSON.stringify(campaign.story)) lines.push('Story')
  if (JSON.stringify(next.budget) !== JSON.stringify(campaign.budget)) lines.push('Budget')
  if (next.opensAt !== campaign.opensAt || next.closesAt !== campaign.closesAt) lines.push('Dates')
  if (JSON.stringify(next.participation) !== JSON.stringify(campaign.participation)) lines.push('Ways to contribute')
  if (JSON.stringify(next.partnerOfferIds ?? []) !== JSON.stringify(campaign.partnerOfferIds ?? [])) lines.push('Partner offers')
  if (next.category !== campaign.category) lines.push('Category')
  return lines.length > 0 ? lines : ['Minor wording or settings']
}

const STEPS = ['Draft', 'Submitted', 'Reviewed', 'Published'] as const

function ReviewSteps({ current }: { current: number }) {
  return (
    <ol className="review-steps" aria-label="Review progress">
      {STEPS.map((step, index) => (
        <li key={step} className={index < current ? 'done' : index === current ? 'current' : ''} aria-current={index === current ? 'step' : undefined}>
          <span aria-hidden="true">{index < current ? '✓' : index + 1}</span>
          {step}
          <span className="sr-only">{index < current ? ' (done)' : index === current ? ' (current step)' : ''}</span>
        </li>
      ))}
    </ol>
  )
}

/** Review card: submitted → approved or changes requested → explicit Publish. Only another admin can approve. */
export function RevisionReview({ campaign }: { campaign: Campaign }) {
  const { org } = useOrg()
  const user = useCurrentUser()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const revision = campaign.pendingRevision
  if (!revision) return null
  const shortId = revision.id.replace(/^rev_/, '').slice(0, 8)
  const submitted = (
    <dl className="review-facts">
      <div>
        <dt>Submitted by</dt>
        <dd>
          {userName(revision.authorId)} · {formatDateTime(revision.submittedAt)}
        </dd>
      </div>
      <div>
        <dt>Revision reviewed</dt>
        <dd>
          <code>{shortId}</code> · {changedFields(campaign).join(', ')}
        </dd>
      </div>
      {revision.reviewedBy ? (
        <div>
          <dt>Reviewer decision</dt>
          <dd>
            {revision.status === 'approved' ? 'Approved' : 'Changes requested'} by {userName(revision.reviewedBy)}
            {revision.reviewedAt ? ` · ${formatDateTime(revision.reviewedAt)}` : ''}
            {revision.reviewNote ? ` — “${revision.reviewNote}”` : ''}
          </dd>
        </div>
      ) : null}
    </dl>
  )

  if (revision.status === 'rejected') {
    return (
      <section className="panel ws-card wide notice-card" aria-labelledby="revision-title">
        <ReviewSteps current={0} />
        <h2 id="revision-title">Changes requested</h2>
        {submitted}
        <p>
          <strong>What happens next:</strong>{' '}
          {campaign.isDraft ? 'Edit the draft and submit it again. Nothing is public yet.' : 'The published version stays public. Edit and save again to submit a new revision.'}
        </p>
      </section>
    )
  }

  if (revision.status === 'approved') {
    const mayPublish = canPublishApproved(campaign, org)
    return (
      <section className="panel ws-card wide" aria-labelledby="revision-title">
        <ReviewSteps current={3} />
        <h2 id="revision-title">Approved · ready to publish</h2>
        {submitted}
        <p>
          <strong>What happens next:</strong>{' '}
          {campaign.isDraft
            ? 'The campaign is not public yet. Publishing makes exactly this approved version visible to supporters.'
            : 'Supporters still see the current published version. Publishing replaces it with exactly this approved revision.'}{' '}
          Editing it again sends it back for review.
        </p>
        {mayPublish ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              try {
                publishApprovedRevision(campaign.id, revision.id)
                setError('')
              } catch (problem) {
                setError(problem instanceof StorageFullError || problem instanceof Error ? problem.message : 'The campaign could not be published.')
              }
            }}
          >
            {campaign.isDraft ? 'Publish approved campaign' : 'Publish approved changes'}
          </button>
        ) : (
          <p className="small muted">An Organization Admin or the campaign’s organizer can publish it.</p>
        )}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    )
  }

  const reviewer = can(user, 'campaign.review', { campaign, organization: org })
  const isAuthor = user?.id === revision.authorId
  const others = eligibleReviewers(org.id, revision.authorId)

  function decide(decision: 'approve' | 'reject') {
    try {
      reviewRevision(campaign.id, revision!.id, decision, note)
      setError('')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'This review could not be saved.')
    }
  }

  return (
    <section className="panel ws-card wide" aria-labelledby="revision-title">
      <ReviewSteps current={1} />
      <h2 id="revision-title">Waiting for review</h2>
      {submitted}
      <p className="muted small">
        {campaign.isDraft ? 'Supporters can’t see this campaign yet.' : 'Supporters keep seeing the last published version during review.'} Approving does not publish —
        publishing is a separate step after approval.
      </p>
      {reviewer && !isAuthor ? (
        <>
          <TextAreaNote value={note} onChange={setNote} />
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide('approve')}>
              Approve this revision
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => decide('reject')}>
              Request changes
            </button>
          </div>
        </>
      ) : reviewer && isAuthor ? (
        <p className="notice warn compact">You authored this revision, so you can’t approve it. {others.length > 0 ? 'Another Organization Admin will review it.' : NO_REVIEWER_MESSAGE}</p>
      ) : (
        <p className="small">{others.length > 0 ? 'An Organization Admin will review it.' : NO_REVIEWER_MESSAGE}</p>
      )}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

function TextAreaNote({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">
        Note for the author <span className="optional-tag">Optional</span>
      </span>
      <textarea rows={2} maxLength={400} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
