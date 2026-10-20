import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'
import { closeCampaign, deleteCampaign } from '../lib/campaigns.ts'
import { formatDate, formatDateTime, formatINR, formatMoney } from '../lib/format.ts'
import { gameMeta } from '../lib/games.ts'
import { clearGameData } from '../lib/gameLedger.ts'
import { resetOrganizations } from '../lib/orgStorage.ts'
import { deleteDraft, draftTitle, listDrafts } from '../lib/drafts.ts'
import { resetStore } from '../lib/storage.ts'
import type { CampaignView, CurrencyCode } from '../lib/types.ts'

/** Totals per currency, so campaigns in different currencies are never added together. */
function formatTotals(views: CampaignView[], fallback: CurrencyCode): string {
  const totals = new Map<CurrencyCode, number>()
  for (const view of views) totals.set(view.campaign.currency, (totals.get(view.campaign.currency) ?? 0) + view.raised)
  if (totals.size === 0) return formatMoney(0, fallback)
  return [...totals].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')
}

export function DashboardPage() {
  const views = [...useCampaignViews()].sort(
    (a, b) => Date.parse(b.campaign.createdAt) - Date.parse(a.campaign.createdAt),
  )
  const { org, base, workspace } = useOrg()
  const [params] = useSearchParams()
  const createdId = params.get('created')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [drafts, setDrafts] = useState(() => listDrafts(org.id))

  useEffect(() => {
    document.title = `Organizer — ${org.name}`
  }, [org.name])

  const published = views.filter((view) => !view.campaign.isDraft)
  const contributions = published.reduce((sum, view) => sum + view.supporters, 0)

  async function copyLink(id: string) {
    const url = `${window.location.origin}${base}/campaigns/${id}`
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
          <h1>Campaigns</h1>
          <p className="muted">Saved on this device.</p>
        </div>
        <div className="page-head-actions">
          <Link to={`${workspace}/campaigns/new`} className={createdId ? 'btn btn-outline' : 'btn btn-primary'}>
            Create a campaign
          </Link>
        </div>
      </div>

      {createdId && views.some((view) => view.campaign.id === createdId) ? (
        <section className="panel ready-card" role="status" aria-labelledby="ready-title">
          <span className="success-pill">Published</span>
          <h2 id="ready-title">Your campaign is ready to share.</h2>
          <p className="muted">
            “{views.find((view) => view.campaign.id === createdId)?.campaign.title}” is now on your demo website. The link works on this device.
          </p>
          <div className="inline-actions">
            <button type="button" className="btn btn-primary" onClick={() => void copyLink(createdId)}>
              {copiedId === createdId ? 'Link copied.' : 'Copy campaign link'}
            </button>
            <Link to={`${base}/campaigns/${createdId}?view=details`} className="btn btn-outline">
              View campaign
            </Link>
            <Link to={`${workspace}/campaigns/${createdId}`} className="btn btn-outline">
              Manage campaign
            </Link>
          </div>
        </section>
      ) : null}

      {deletedNotice ? (
        <div className="notice success" role="status">
          <Icon name="check" size={18} />
          {deletedNotice}
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <section className="panel drafts-panel" aria-labelledby="drafts-title">
          <h2 id="drafts-title">Drafts on this device</h2>
          <ul className="resume-list">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <div>
                  <strong>{draftTitle(draft)}</strong>
                  <span className="muted small">
                    {draft.kind === 'assistant' ? 'Campaign assistant' : 'Campaign form'} · Last edited {formatDateTime(draft.updatedAt)}
                  </span>
                </div>
                <div className="inline-actions">
                  <Link
                    to={draft.kind === 'assistant' ? `${workspace}/assistant?draftId=${draft.id}` : `${workspace}/campaigns/new?draftId=${draft.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    Continue draft
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (!window.confirm(`Discard “${draftTitle(draft)}”?`)) return
                      deleteDraft(draft.id)
                      setDrafts(listDrafts(org.id))
                    }}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {published.length > 0 ? (
      <div className="stat-cards">
        <StatCard icon="chart" tone="green" value={String(published.length)} label="campaigns" />
        <StatCard icon="gift" tone="gold" value={formatTotals(published, org.defaults.currency)} label="simulated contributions" />
        <StatCard icon="users" tone="coral" value={String(contributions)} label="contributions" />
      </div>
      ) : null}

      {views.length === 0 ? (
        <div className="panel empty">
          <h2>No campaigns yet</h2>
          <p className="muted">Create your first fundraiser. It takes four short steps.</p>
          <Link to={`${workspace}/campaigns/new`} className="btn btn-primary">
            Create a campaign
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
                  base={base}
                  workspace={workspace}
                  copied={copiedId === view.campaign.id}
                  menuOpen={menuId === view.campaign.id}
                  confirmDelete={confirmDeleteId === view.campaign.id}
                  onCopy={() => void copyLink(view.campaign.id)}
                  onMenu={() => {
                    setMenuId((current) => (current === view.campaign.id ? null : view.campaign.id))
                    setConfirmDeleteId(null)
                  }}
                  onDismiss={() => {
                    setMenuId(null)
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

      <div className="notice warn">
        <Icon name="info" size={20} />
        <div>
          <strong>Demo sharing limitation</strong>
          <p className="small">Campaign links in this demo work only on this browser and device. They are not public links.</p>
        </div>
        {confirmReset ? (
          <div className="inline-actions">
            <span className="small">Restore sample campaigns and organization branding, and clear your changes?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => {
                resetStore()
                resetOrganizations()
                clearGameData()
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
  base,
  workspace,
  copied,
  menuOpen,
  confirmDelete,
  onCopy,
  onMenu,
  onDismiss,
  onClose,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  view: CampaignView
  base: string
  workspace: string
  copied: boolean
  menuOpen: boolean
  confirmDelete: boolean
  onCopy: () => void
  onMenu: () => void
  onDismiss: () => void
  onClose: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const { campaign, raised, percent, supporters, status } = view
  const canClose = !campaign.isDraft && status !== 'closed' && status !== 'completed'
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onDismiss()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [menuOpen, onDismiss])

  return (
    <tr>
      <td data-label="Campaign">
        <div className="table-campaign">
          <CampaignCover campaign={campaign} />
          <div>
            <strong>{campaign.title}</strong>
            <span className="muted small">
              {campaign.participation.game ? gameMeta(campaign.gameType).name : 'Direct giving'}
              {campaign.access === 'closed' && campaign.accessCode ? ` · Code ${campaign.accessCode}` : ''}
            </span>
          </div>
        </div>
      </td>
      <td data-label="Progress">
        <div className="money-row">
          <span>
            <strong>{formatINR(raised, campaign.currency)}</strong> / {formatINR(campaign.goalAmount, campaign.currency)}
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
            <Link to={`${workspace}/campaigns/new?draft=${campaign.id}`} className="btn btn-outline btn-sm">
              Edit
            </Link>
          ) : (
            <>
              <Link to={`${workspace}/campaigns/${campaign.id}`} className="btn btn-primary btn-sm">
                Manage
              </Link>
              <Link to={`${base}/campaigns/${campaign.id}?view=details`} className="btn btn-outline btn-sm">
                View
              </Link>
            </>
          )}
          {campaign.isDraft ? null : (
            <button type="button" className="btn btn-outline btn-sm" onClick={onCopy}>
              <Icon name="copy" size={15} />
              {copied ? 'Link copied.' : 'Copy link'}
            </button>
          )}
          <div className="menu-wrap" ref={menuRef}>
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
