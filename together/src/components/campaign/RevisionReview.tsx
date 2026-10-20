import { useState } from 'react'
import { useOrg } from '../org/OrgContext.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { eligibleReviewers, NO_REVIEWER_MESSAGE, reviewRevision } from '../../lib/featureActions.ts'
import { formatDateTime, formatMoney } from '../../lib/format.ts'
import { userName } from '../../lib/identity.ts'
import { can } from '../../lib/permissions.ts'
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

/** Review card for a campaign revision. Only another Organization Admin can approve. */
export function RevisionReview({ campaign }: { campaign: Campaign }) {
  const { org } = useOrg()
  const user = useCurrentUser()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const revision = campaign.pendingRevision
  if (!revision) return null

  if (revision.status === 'rejected') {
    return (
      <section className="panel ws-card wide notice-card" aria-labelledby="revision-title">
        <h2 id="revision-title">Changes requested</h2>
        <p>
          {userName(revision.reviewedBy)} sent this revision back{revision.reviewNote ? `: “${revision.reviewNote}”` : '.'}{' '}
          {campaign.isDraft ? 'Edit the draft and submit it again.' : 'The published version stays public. Edit and save again to submit a new revision.'}
        </p>
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
      <h2 id="revision-title">Waiting for review</h2>
      <p className="muted small">
        Revision submitted by {userName(revision.authorId)} on {formatDateTime(revision.submittedAt)}.{' '}
        {campaign.isDraft ? 'Supporters can’t see this campaign until it is approved.' : 'Supporters keep seeing the last published version until it is approved.'}
      </p>
      <ul className="small">
        {changedFields(campaign).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {reviewer && !isAuthor ? (
        <>
          <TextAreaNote value={note} onChange={setNote} />
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => decide('approve')}>
              Approve this revision and publish
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => decide('reject')}>
              Send back for changes
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
