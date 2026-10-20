import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { toView } from '../../lib/campaigns.ts'
import { listDrafts } from '../../lib/drafts.ts'
import { formatDate } from '../../lib/format.ts'
import { demoPlan } from '../../lib/plans.ts'
import { formatMinor } from '../../lib/transparency.ts'
import type { CurrencyCode } from '../../lib/types.ts'
import { hasUnpublishedChanges, isPubliclyAvailable, websiteStatusLabel } from '../../lib/website.ts'

/** /workspace/:organizationId/overview */
export function WorkspaceOverviewPage() {
  const { org, workspace, base } = useOrg()
  const stored = useOrganizations().find((item) => item.id === org.id)!
  const store = useDemoStore()
  const campaigns = store.campaigns.filter((campaign) => campaign.organizationId === org.id)
  const published = campaigns.filter((campaign) => !campaign.isDraft)
  const views = published.map((campaign) => toView(campaign, store.contributions))
  const active = views.filter((view) => view.status === 'active').length
  const totals = new Map<CurrencyCode, number>()
  for (const view of views) totals.set(view.campaign.currency, (totals.get(view.campaign.currency) ?? 0) + Math.round(view.raised * 100))
  const updates = store.campaignUpdates.filter((item) => item.status === 'published' && campaigns.some((campaign) => campaign.id === item.campaignId)).length
  const referrals = store.referrals.filter((item) => item.organizationId === org.id).length
  const drafts = listDrafts(org.id).length
  const live = isPubliclyAvailable(stored)
  const pending = hasUnpublishedChanges(stored)

  useEffect(() => {
    document.title = `Overview — ${org.name}`
  }, [org.name])

  const steps = [
    { done: stored.website.status !== 'setup', label: 'Finish organization setup', to: `/start/${org.id}` },
    { done: live, label: 'Publish your website', to: `${workspace}/website` },
    { done: !pending, label: pending ? 'Publish or discard your unpublished website changes' : 'Website matches your latest edits', to: `${workspace}/website` },
    { done: published.length > 0, label: 'Create your first campaign', to: `${workspace}/campaigns/new?new=1` },
    { done: updates > 0, label: 'Share a campaign update', to: `${workspace}/campaigns` },
  ]

  return (
    <div className="container page-pad workspace-overview">
      <div className="workspace-grid">
        <section className="panel ws-card">
          <h2>Website</h2>
          <dl className="ws-stats">
            <div>
              <dt>Status</dt>
              <dd>{websiteStatusLabel(stored)}</dd>
            </div>
            <div>
              <dt>Last published</dt>
              <dd>{stored.website.publishedAt ? formatDate(stored.website.publishedAt) : 'Not yet'}</dd>
            </div>
          </dl>
          <p className="muted small">The public website uses published settings only. Website addresses work in this browser; other devices can’t see locally created websites.</p>
          <div className="inline-actions">
            <Link to={`${workspace}/website`} className="btn btn-primary btn-sm">
              Edit website
            </Link>
            {live ? (
              <Link to={base} className="btn btn-outline btn-sm">
                Open website
              </Link>
            ) : null}
          </div>
        </section>
        <section className="panel ws-card">
          <h2>Campaigns</h2>
          <dl className="ws-stats">
            <div>
              <dt>Published</dt>
              <dd>{published.length}</dd>
            </div>
            <div>
              <dt>Active now</dt>
              <dd>{active}</dd>
            </div>
            <div>
              <dt>Confirmed simulated contributions</dt>
              <dd>{totals.size ? [...totals].map(([currency, minor]) => formatMinor(minor, currency)).join(' + ') : '—'}</dd>
            </div>
            <div>
              <dt>Drafts · sharing pages</dt>
              <dd>
                {drafts} · {referrals}
              </dd>
            </div>
          </dl>
          <div className="inline-actions">
            <Link to={`${workspace}/campaigns`} className="btn btn-outline btn-sm">
              Manage campaigns
            </Link>
            {org.visibility.assistant ? (
              <Link to={`${workspace}/assistant`} className="btn btn-outline btn-sm">
                Create with assistant
              </Link>
            ) : null}
          </div>
        </section>
        <section className="panel ws-card wide">
          <h2>Setup guidance</h2>
          <ol className="guide-list">
            {steps.map((step) => (
              <li key={step.label} className={step.done ? 'done' : ''}>
                <span aria-hidden="true">{step.done ? '✓' : '○'}</span>
                {step.done ? <span>{step.label}</span> : <Link to={step.to}>{step.label}</Link>}
                <span className="sr-only">{step.done ? ' (done)' : ' (to do)'}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel ws-card wide">
          <h2>Demo plan</h2>
          <p>
            <strong>{demoPlan(org.plan.id).name}</strong> · selected {formatDate(org.plan.selectedAt)} · no payment collected.
          </p>
          <Link to={`${workspace}/plan`} className="link-button">
            View plan details
          </Link>
        </section>
      </div>
    </div>
  )
}
