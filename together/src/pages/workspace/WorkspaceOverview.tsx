import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandPreview } from '../../components/org/BrandPreview.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { ProgressBar } from '../../components/ProgressBar.tsx'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { toView } from '../../lib/campaigns.ts'
import { listDrafts } from '../../lib/drafts.ts'
import { formatINR } from '../../lib/format.ts'
import { hasUnpublishedChanges, isPubliclyAvailable, setupTasks, websiteStatusLabel } from '../../lib/website.ts'

/** /workspace/:organizationId/overview */
export function WorkspaceOverviewPage() {
  const { org, workspace, base } = useOrg()
  const stored = useOrganizations().find((item) => item.id === org.id)!
  const store = useDemoStore()
  const [params, setParams] = useSearchParams()
  const campaigns = store.campaigns.filter((campaign) => campaign.organizationId === org.id && !campaign.isDraft)
  const views = campaigns.map((campaign) => toView(campaign, store.contributions)).sort((a, b) => Date.parse(b.campaign.createdAt) - Date.parse(a.campaign.createdAt))
  const tasks = setupTasks(stored, campaigns.length, workspace)
  const next = tasks.find((task) => !task.done)
  const showChecklist = Boolean(next) || params.get('checklist') === '1'
  const drafts = listDrafts(org.id).length
  const pending = hasUnpublishedChanges(stored)

  useEffect(() => {
    document.title = `Overview — ${org.name}`
  }, [org.name])

  return (
    <div className="container page-pad workspace-overview">
      <div className="overview-grid">
        <div className="overview-main">
          {showChecklist ? (
            <section className="panel ws-card" aria-labelledby="checklist-title">
              <div className="section-head-row">
                <h1 id="checklist-title" className="overview-title">
                  {next ? 'Get started' : 'Setup checklist'}
                </h1>
                <span className="muted small">
                  {tasks.filter((task) => task.done).length} of {tasks.length} done
                </span>
              </div>
              <ol className="guide-list">
                {tasks.map((task) => (
                  <li key={task.id} className={task.done ? 'done' : task === next ? 'next' : ''}>
                    <span className="guide-mark" aria-hidden="true">
                      {task.done ? '✓' : tasks.indexOf(task) + 1}
                    </span>
                    <div>
                      <strong>{task.label}</strong>
                      <span className="muted small">{task.done ? 'Done' : task.hint}</span>
                    </div>
                    <span className="sr-only">{task.done ? '(done)' : '(to do)'}</span>
                  </li>
                ))}
              </ol>
              {next ? (
                <Link to={next.to} className="btn btn-primary">
                  {next.action}
                </Link>
              ) : (
                <div className="inline-actions">
                  <p className="muted small">Everything is set up.</p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setParams({}, { replace: true })}>
                    Hide checklist
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {!next ? (
            <section className="panel ws-card" aria-labelledby="campaigns-title">
              <div className="section-head-row">
                <h2 id="campaigns-title">Your campaigns</h2>
                <Link to={`${workspace}/campaigns/new`} className={showChecklist ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}>
                  Create a campaign
                </Link>
              </div>
              <ul className="ws-list">
                {views.slice(0, 5).map((view) => (
                  <li key={view.campaign.id}>
                    <div>
                      <strong>{view.campaign.title}</strong>
                      <span className="muted small">
                        {formatINR(view.raised, view.campaign.currency)} of {formatINR(view.campaign.goalAmount, view.campaign.currency)} · {view.percent}%
                      </span>
                      <ProgressBar value={view.percent} />
                    </div>
                    <StatusBadge status={view.status} />
                    <Link to={`${workspace}/campaigns/${view.campaign.id}`} className="btn btn-outline btn-sm">
                      Manage
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="inline-actions">
                <Link to={`${workspace}/campaigns`} className="link-button">
                  See all campaigns
                </Link>
                {drafts > 0 ? (
                  <Link to={`${workspace}/campaigns`} className="link-button">
                    {drafts} draft{drafts === 1 ? '' : 's'} saved on this device
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="panel ws-card overview-site" aria-label="Your website">
          <h2>Your website</h2>
          <span className={`status-pill ${stored.website.status}`}>{websiteStatusLabel(stored)}</span>
          <div className="preview-window small-preview">
            <BrandPreview org={org} views={views} device="mobile" />
          </div>
          {pending ? <p className="muted small">You have changes that aren’t published yet.</p> : null}
          <div className="inline-actions">
            <Link to={`${workspace}/website`} className="btn btn-outline btn-sm">
              Edit my website
            </Link>
            {isPubliclyAvailable(stored) ? (
              <Link to={base} className="btn btn-outline btn-sm">
                Open website
              </Link>
            ) : null}
          </div>
          <p className="muted small">Saved on this device. Other people can’t see it on their devices.</p>
        </aside>
      </div>
    </div>
  )
}
