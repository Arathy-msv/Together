import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'
import { closeCampaign, deleteCampaign } from '../lib/campaigns.ts'
import { formatDate, formatINR } from '../lib/format.ts'
import { resetStore } from '../lib/storage.ts'
import type { CampaignView } from '../lib/types.ts'

export function DashboardPage() {
  const views = [...useCampaignViews()].sort(
    (a, b) => Date.parse(b.campaign.createdAt) - Date.parse(a.campaign.createdAt),
  )
  const [params] = useSearchParams()
  const createdId = params.get('created')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    document.title = 'My campaigns — Together'
  }, [])

  const published = views.filter((view) => !view.campaign.isDraft)
  const raised = published.reduce((sum, view) => sum + view.raised, 0)
  const contributions = published.reduce((sum, view) => sum + view.supporters, 0)

  async function copyLink(id: string) {
    const url = `${window.location.origin}/campaigns/${id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const area = document.createElement('textarea')
      area.value = url
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 3000)
  }

  function handleDelete(id: string, title: string) {
    deleteCampaign(id)
    setConfirmDeleteId(null)
    setMenuId(null)
    setDeletedNotice(`“${title}” was removed from this browser.`)
    window.setTimeout(() => setDeletedNotice((current) => (current?.includes(title) ? null : current)), 5000)
  }

  return (
    <div className="container page-pad">
      <div className="page-head">
        <div>
          <h1>My campaigns</h1>
          <p className="muted">Saved in this browser.</p>
        </div>
        <Link to="/create?new=1" className="btn btn-primary">
          Create campaign
        </Link>
      </div>

      {createdId ? (
        <div className="notice success" role="status">
          <Icon name="check" size={18} />
          Campaign created and saved in this browser.
          <Link to={`/campaigns/${createdId}`}>View campaign</Link>
        </div>
      ) : null}

      {deletedNotice ? (
        <div className="notice success" role="status">
          <Icon name="check" size={18} />
          {deletedNotice}
        </div>
      ) : null}

      <div className="stat-cards">
        <StatCard icon="chart" tone="green" value={String(published.length)} label="campaigns" />
        <StatCard icon="gift" tone="gold" value={formatINR(raised)} label="simulated contributions" />
        <StatCard icon="users" tone="coral" value={String(contributions)} label="contributions" />
      </div>

      {views.length === 0 ? (
        <div className="panel empty">
          <h2>No campaigns yet</h2>
          <p className="muted">Create one, or reset demo data to restore the sample campaigns.</p>
          <Link to="/create?new=1" className="btn btn-primary">
            Create campaign
          </Link>
        </div>
      ) : (
        <div className="panel table-panel">
          <table className="campaign-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Progress</th>
                <th>Contributions</th>
                <th>Status</th>
                <th>Dates</th>
                <th aria-label="Actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {views.map((view) => (
                <Row
                  key={view.campaign.id}
                  view={view}
                  copied={copiedId === view.campaign.id}
                  menuOpen={menuId === view.campaign.id}
                  confirmDelete={confirmDeleteId === view.campaign.id}
                  onCopy={() => void copyLink(view.campaign.id)}
                  onMenu={() => {
                    setMenuId((current) => (current === view.campaign.id ? null : view.campaign.id))
                    setConfirmDeleteId(null)
                  }}
                  onClose={() => {
                    closeCampaign(view.campaign.id)
                    setMenuId(null)
                  }}
                  onAskDelete={() => setConfirmDeleteId(view.campaign.id)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onConfirmDelete={() => handleDelete(view.campaign.id, view.campaign.title)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="soon-row">
        <div className="soon-tile">
          <span className="tile-icon">
            <Icon name="chart" size={20} />
          </span>
          <div>
            <strong>Advanced analytics</strong>
            <p className="muted small">Detailed insights about your campaign performance.</p>
          </div>
          <span className="soon-pill grey">Coming soon</span>
        </div>
        <div className="soon-tile">
          <span className="tile-icon">
            <Icon name="bell" size={20} />
          </span>
          <div>
            <strong>Reminders</strong>
            <p className="muted small">Set reminders to keep your campaign active.</p>
          </div>
          <span className="soon-pill grey">Coming soon</span>
        </div>
      </div>

      <div className="notice warn">
        <Icon name="info" size={20} />
        <div>
          <strong>Demo sharing limitation</strong>
          <p className="small">Campaign links in this demo work only on this browser and device. They are not public links.</p>
        </div>
        {confirmReset ? (
          <div className="inline-actions">
            <span className="small">Restore sample campaigns and clear your changes?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                resetStore()
                setConfirmReset(false)
              }}
            >
              Reset
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmReset(true)}>
            ↻ Reset demo data
          </button>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, tone, value, label }: { icon: string; tone: string; value: string; label: string }) {
  return (
    <div className="stat-card">
      <span className={`tile-icon ${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function Row({
  view,
  copied,
  menuOpen,
  confirmDelete,
  onCopy,
  onMenu,
  onClose,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  view: CampaignView
  copied: boolean
  menuOpen: boolean
  confirmDelete: boolean
  onCopy: () => void
  onMenu: () => void
  onClose: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const { campaign, raised, percent, supporters, status } = view
  const canClose = !campaign.isDraft && status !== 'closed' && status !== 'completed'
  return (
    <tr>
      <td data-label="Campaign">
        <div className="table-campaign">
          <CampaignCover campaign={campaign} />
          <div>
            <strong>{campaign.title}</strong>
            {campaign.access === 'closed' && campaign.accessCode ? (
              <span className="muted small">Access code {campaign.accessCode}</span>
            ) : (
              <span className="muted small">{campaign.organizerName}</span>
            )}
          </div>
        </div>
      </td>
      <td data-label="Progress">
        <div className="money-row">
          <span>
            <strong>{formatINR(raised)}</strong> / {formatINR(campaign.goalAmount)}
          </span>
          <span>{percent}%</span>
        </div>
        <ProgressBar value={percent} muted={status === 'scheduled' || status === 'draft'} />
      </td>
      <td data-label="Contributions">{supporters === 1 ? '1 contribution' : `${supporters} contributions`}</td>
      <td data-label="Status">
        <StatusBadge status={status} />
      </td>
      <td data-label="Dates" className="small muted">
        {formatDate(campaign.opensAt)}
        <br />
        {formatDate(campaign.closesAt)}
      </td>
      <td data-label="Actions">
        <div className="row-buttons">
          {campaign.isDraft ? (
            <Link to={`/create?draft=${campaign.id}`} className="btn btn-outline btn-sm">
              Edit
            </Link>
          ) : (
            <Link to={`/campaigns/${campaign.id}`} className="btn btn-outline btn-sm">
              View
            </Link>
          )}
          {campaign.isDraft ? null : (
            <button type="button" className="btn btn-outline btn-sm" onClick={onCopy}>
              <Icon name="copy" size={15} />
              {copied ? 'Copied' : 'Copy demo link'}
            </button>
          )}
          <div className="menu-wrap">
            <button type="button" className="btn btn-outline btn-sm icon-only" aria-label="More actions" aria-expanded={menuOpen} onClick={onMenu}>
              ···
            </button>
            {menuOpen ? (
              <div className="menu" role="menu">
                {canClose ? (
                  <button type="button" role="menuitem" onClick={onClose}>
                    Close campaign
                  </button>
                ) : null}
                {confirmDelete ? (
                  <div className="menu-confirm" role="group" aria-label="Confirm delete">
                    <p className="menu-note">
                      Delete this campaign and its simulated contributions from this browser? This cannot be undone.
                    </p>
                    <button type="button" role="menuitem" className="danger" onClick={onConfirmDelete}>
                      Yes, delete
                    </button>
                    <button type="button" role="menuitem" onClick={onCancelDelete}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" role="menuitem" className="danger" onClick={onAskDelete}>
                    {campaign.isDraft ? 'Discard draft' : 'Delete campaign'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  )
}
