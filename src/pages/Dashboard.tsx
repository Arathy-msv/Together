import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CoverArt, Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'
import { closeCampaign, removeCampaign } from '../lib/campaigns.ts'
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
  const [closingId, setClosingId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    document.title = 'My demo campaigns — Together'
  }, [])

  const published = views.filter((view) => !view.campaign.isDraft)
  const raised = published.reduce((sum, view) => sum + view.raised, 0)

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
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 4000)
  }

  return (
    <div className="page dashboard-page">
      <section className="dash-hero">
        <div>
          <h1>Your community, growing together.</h1>
          <p>Campaigns saved in this browser only.</p>
        </div>
        <div className="stat-pills">
          <div>
            <strong>{published.length}</strong>
            <span>demo campaigns</span>
          </div>
          <div>
            <strong>{formatINR(raised)}</strong>
            <span>simulated contributions</span>
          </div>
        </div>
        <Link to="/create?new=1" className="btn btn-primary">
          + Create a Campaign
        </Link>
      </section>

      {createdId ? (
        <div className="banner success" role="status">
          Campaign saved in this browser.
          <Link to={`/campaigns/${createdId}`}>View campaign</Link>
        </div>
      ) : null}
      {copiedId ? (
        <div className="banner success" role="status">
          Demo link copied. Paste it into this browser to open the campaign.
        </div>
      ) : null}

      <section className="section">
        <h2>Your campaigns</h2>
        {views.length === 0 ? (
          <div className="empty-state">
            <h3>No campaigns in this browser yet</h3>
            <p>Create one, or reset the demo data to bring the sample campaigns back.</p>
            <Link to="/create?new=1" className="btn btn-primary">
              Create a Campaign
            </Link>
          </div>
        ) : (
          <div className="campaign-rows">
            {views.map((view) => (
              <DashboardRow
                key={view.campaign.id}
                view={view}
                copied={copiedId === view.campaign.id}
                confirming={closingId === view.campaign.id}
                onCopy={() => void copyLink(view.campaign.id)}
                onAskClose={() => setClosingId(view.campaign.id)}
                onCancelClose={() => setClosingId(null)}
                onClose={() => {
                  closeCampaign(view.campaign.id)
                  setClosingId(null)
                }}
                onDiscard={() => removeCampaign(view.campaign.id)}
              />
            ))}
          </div>
        )}
        <div className="inline-note">
          <Icon name="info" size={16} />
          <span>Links work with this browser’s local data. Campaign data is not shared across devices.</span>
          {confirmReset ? (
            <span className="reset-confirm">
              Reset sample campaigns and clear simulated contributions?
              <button
                type="button"
                className="text-danger"
                onClick={() => {
                  resetStore()
                  setConfirmReset(false)
                }}
              >
                Reset demo data
              </button>
              <button type="button" className="text-button" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" className="text-danger" onClick={() => setConfirmReset(true)}>
              Reset demo data
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Coming soon</h2>
          <p>More features are on the way to make Together even more helpful.</p>
        </div>
        <div className="soon-grid">
          <article className="soon-card">
            <Icon name="chart" />
            <h3>Campaign analytics</h3>
            <p>Track views, contributions and supporter activity.</p>
            <span className="coming-badge">Coming soon</span>
          </article>
          <article className="soon-card">
            <Icon name="bell" />
            <h3>Reminders</h3>
            <p>Get notified about important dates and activity.</p>
            <span className="coming-badge">Coming soon</span>
          </article>
          <article className="soon-card">
            <Icon name="users" />
            <h3>Accounts</h3>
            <p>Create an account to access your campaigns on any device.</p>
            <span className="coming-badge">Coming soon</span>
          </article>
        </div>
      </section>
    </div>
  )
}

function DashboardRow({
  view,
  copied,
  confirming,
  onCopy,
  onAskClose,
  onCancelClose,
  onClose,
  onDiscard,
}: {
  view: CampaignView
  copied: boolean
  confirming: boolean
  onCopy: () => void
  onAskClose: () => void
  onCancelClose: () => void
  onClose: () => void
  onDiscard: () => void
}) {
  const { campaign, raised, percent, supporters, status } = view
  const sharePath = `/campaigns/${campaign.id}`
  const canClose = !campaign.isDraft && status !== 'closed' && status !== 'completed'
  return (
    <article className="campaign-row">
      <CoverArt id={campaign.coverImageId} />
      <div className="row-main">
        <h3>{campaign.title}</h3>
        <p>
          <strong>{formatINR(raised)}</strong> of {formatINR(campaign.goalAmount)} (simulated)
        </p>
        <ProgressBar value={percent} muted={status === 'scheduled' || status === 'draft'} />
        <span className="percent">{percent}%</span>
        {campaign.access === 'closed' && campaign.accessCode ? (
          <p className="code-line">Demo access code: {campaign.accessCode}</p>
        ) : null}
      </div>
      <div className="row-meta">
        <strong>{supporters}</strong>
        <span>contributions (simulated)</span>
      </div>
      <StatusBadge status={status} />
      <div className="row-dates">
        <span>Opens {formatDate(campaign.opensAt)}</span>
        <span>Closes {formatDate(campaign.closesAt)}</span>
      </div>
      <div className="row-actions">
        {campaign.isDraft ? (
          <>
            <Link to={`/create?draft=${campaign.id}`} className="btn btn-primary">
              Continue editing
            </Link>
            <button type="button" className="text-button" onClick={onDiscard}>
              Discard draft
            </button>
          </>
        ) : (
          <>
            <Link to={sharePath} className="btn btn-primary">
              View campaign
            </Link>
            <p className="share-url">{sharePath}</p>
            <div className="row-links">
              <button type="button" className="text-button" onClick={onCopy}>
                <Icon name="copy" size={15} />
                {copied ? 'Link copied' : 'Copy demo link'}
              </button>
              {canClose ? (
                confirming ? (
                  <span className="reset-confirm">
                    Close this campaign?
                    <button type="button" className="text-danger" onClick={onClose}>
                      Close campaign
                    </button>
                    <button type="button" className="text-button" onClick={onCancelClose}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" className="text-button" onClick={onAskClose}>
                    Close campaign
                  </button>
                )
              ) : null}
            </div>
          </>
        )}
      </div>
    </article>
  )
}
