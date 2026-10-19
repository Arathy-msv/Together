import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { CoverArt, Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useCampaignView } from '../hooks/useDemoStore.ts'
import { formatDateRange, formatINR, parseWholeRupees, plural } from '../lib/format.ts'
import { getPending, isUnlocked, newToken, setPending, unlockCampaign } from '../lib/pending.ts'
import { NotFoundPage } from './NotFound.tsx'

export function CampaignPage() {
  const { id = '' } = useParams()
  const view = useCampaignView(id)
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(() => (id ? isUnlocked(id) : false))
  const [tab, setTab] = useState<'direct' | 'game'>('direct')

  useEffect(() => {
    if (view) document.title = `${view.campaign.title} — Together`
  }, [view])

  if (!view) return <NotFoundPage />

  const { campaign } = view
  const needsCode = campaign.access === 'closed' && !campaign.isDraft && !unlocked

  return (
    <div className="page campaign-page">
      <div className="campaign-layout">
        <div className="campaign-story">
          <CoverArt id={campaign.coverImageId} label={campaign.title} />
          <div className="title-row">
            <h1>{campaign.title}</h1>
            <StatusBadge status={view.status} />
          </div>
          <p className="organizer-line">
            <LeafDot />
            <span>
              <strong>{campaign.organizerName}</strong>
              <em>Organiser</em>
            </span>
            <span className="dates">{formatDateRange(campaign.opensAt, campaign.closesAt)}</span>
          </p>
          <p className="story">{campaign.description}</p>
          <div className="progress-block">
            <div className="raised-line">
              <span>
                <strong>{formatINR(view.raised)}</strong> raised of {formatINR(campaign.goalAmount)}
              </span>
              <b>{view.percent}% of goal</b>
            </div>
            <ProgressBar value={view.percent} muted={!view.canGive && view.status !== 'active'} />
            <div className="card-foot">
              <span>
                <Icon name="users" size={16} />
                {plural(view.supporters, 'successful demo contribution')}
              </span>
              <span>Simulated progress · no real money</span>
            </div>
          </div>
        </div>
        <div className="campaign-side">
          {needsCode ? (
            <AccessGate
              onUnlock={(code) => {
                if (campaign.accessCode && code.trim().toUpperCase() === campaign.accessCode.toUpperCase()) {
                  unlockCampaign(campaign.id)
                  setUnlocked(true)
                  return true
                }
                return false
              }}
            />
          ) : (
            <GivePanel
              key={campaign.id}
              viewId={campaign.id}
              tab={campaign.participation.direct ? tab : 'game'}
              onTab={setTab}
              onContinue={(amount, method) => {
                const pending = getPending(campaign.id)
                setPending({
                  token: pending?.token ?? newToken(),
                  campaignId: campaign.id,
                  amount,
                  method,
                })
                navigate(`/campaigns/${campaign.id}/confirm`)
              }}
            />
          )}
          {campaign.participation.game ? (
            <article className="side-card">
              <CoverArt id="garden" label="Garden game" />
              <div>
                <h2>Grow Our Garden</h2>
                <p>Play a free planting moment, then choose whether to contribute.</p>
                <Link to={`/campaigns/${campaign.id}/play`} className="btn btn-secondary">
                  Play free
                </Link>
              </div>
            </article>
          ) : null}
          <article className="side-card soon">
            <Icon name="gift" />
            <div>
              <div className="coming-row">
                <h2>Voucher rewards</h2>
                <span className="coming-badge">Coming soon</span>
              </div>
              <p>Special thank-you vouchers for supporters will be available here soon.</p>
            </div>
          </article>
        </div>
      </div>
      <p className="demo-banner">No real money is collected. This is a demonstration of Together.</p>
    </div>
  )
}

function GivePanel({
  viewId,
  tab,
  onTab,
  onContinue,
}: {
  viewId: string
  tab: 'direct' | 'game'
  onTab: (tab: 'direct' | 'game') => void
  onContinue: (amount: number, method: 'direct' | 'game') => void
}) {
  const view = useCampaignView(viewId)
  const campaign = view?.campaign
  const [selected, setSelected] = useState<number | null>(() => {
    if (!campaign || campaign.donationMode !== 'fixed') return null
    const pending = getPending(campaign.id)
    if (pending?.method === 'direct' && campaign.fixedAmounts.includes(pending.amount)) return pending.amount
    if (campaign.fixedAmounts.includes(250)) return 250
    return campaign.fixedAmounts[0] ?? null
  })
  const [custom, setCustom] = useState(() => {
    if (!campaign || campaign.donationMode !== 'custom') return ''
    const pending = getPending(campaign.id)
    return pending?.method === 'direct' ? String(pending.amount) : ''
  })
  const [error, setError] = useState('')

  if (!view || !campaign) return null
  const blocked = blockMessage(view.status, campaign.opensAt)

  return (
    <section className="give-card">
      {campaign.participation.direct && campaign.participation.game ? (
        <div className="tabs" role="tablist">
          <button type="button" className={tab === 'direct' ? 'tab selected' : 'tab'} onClick={() => onTab('direct')}>
            Donate directly
          </button>
          <button type="button" className={tab === 'game' ? 'tab selected' : 'tab'} onClick={() => onTab('game')}>
            Play & give
          </button>
        </div>
      ) : (
        <h2>{campaign.participation.game ? 'Play & give' : 'Donate directly'}</h2>
      )}

      {blocked ? (
        <div className="status-message">
          <strong>{blocked.title}</strong>
          <p>{blocked.body}</p>
        </div>
      ) : tab === 'game' && campaign.participation.game ? (
        <div className="play-invite">
          <h3>Plant a little encouragement</h3>
          <p>The garden game is free. Playing does not charge you or change the fundraising total. You can add a simulated contribution afterwards.</p>
          <Link to={`/campaigns/${campaign.id}/play`} className="btn btn-primary">
            Play free
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      ) : campaign.participation.direct ? (
        <>
          <AmountPicker
            mode={campaign.donationMode}
            amounts={campaign.fixedAmounts}
            value={selected}
            customValue={custom}
            error={error}
            onSelect={(amount) => {
              setSelected(amount)
              setError('')
            }}
            onCustom={(value) => {
              setCustom(value)
              setError('')
            }}
          />
          <p className="summary-line">
            Simulated contribution <strong>{previewAmount(campaign.donationMode, selected, custom)}</strong>
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              const amount = chosenAmount(campaign.donationMode, campaign.fixedAmounts, selected, custom)
              if (amount == null) {
                setError(
                  campaign.donationMode === 'fixed'
                    ? 'Choose one of the suggested amounts.'
                    : 'Enter a whole amount greater than zero.',
                )
                return
              }
              onContinue(amount, 'direct')
            }}
          >
            Continue to demo payment
            <Icon name="arrow" size={16} />
          </button>
          <p className="hint center">Only confirmation updates demo progress.</p>
        </>
      ) : (
        <p>This campaign has no open participation options.</p>
      )}
    </section>
  )
}

function chosenAmount(
  mode: 'fixed' | 'custom',
  amounts: number[],
  selected: number | null,
  custom: string,
): number | null {
  if (mode === 'fixed') {
    if (selected == null || !amounts.includes(selected) || selected <= 0) return null
    return selected
  }
  const amount = parseWholeRupees(custom)
  if (amount == null || amount > 10_000_000) return null
  return amount
}

function previewAmount(mode: 'fixed' | 'custom', selected: number | null, custom: string): string {
  if (mode === 'fixed') return selected ? formatINR(selected) : '—'
  const amount = parseWholeRupees(custom)
  return amount ? formatINR(amount) : '—'
}

function blockMessage(status: string, opensAt: string): { title: string; body: string } | null {
  switch (status) {
    case 'scheduled':
      return {
        title: 'Scheduled',
        body: `This campaign opens on ${new Date(opensAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Contributions are not open yet.`,
      }
    case 'closed':
      return {
        title: 'Closed',
        body: 'This campaign is closed and cannot accept contributions.',
      }
    case 'completed':
      return {
        title: 'Completed',
        body: 'This campaign reached its goal and closed. Thank you to everyone who took part in the demo.',
      }
    case 'draft':
      return {
        title: 'Draft',
        body: 'This campaign is still a draft. Publish it from the organiser flow before collecting simulated contributions.',
      }
    default:
      return null
  }
}

function AccessGate({ onUnlock }: { onUnlock: (code: string) => boolean }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  return (
    <section className="give-card">
      <h2>This is a closed demo campaign</h2>
      <p>Enter the demo access code from the organiser. This is not secure access control.</p>
      <label htmlFor="demo-code">
        Demo access code
        <input
          id="demo-code"
          value={code}
          autoComplete="off"
          onChange={(event) => setCode(event.target.value.toUpperCase())}
        />
      </label>
      {error ? <p className="field-error">{error}</p> : null}
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => {
          const ok = onUnlock(code)
          if (!ok) setError('That demo code does not match. Check the code on the organiser dashboard.')
        }}
      >
        Continue
      </button>
    </section>
  )
}

function LeafDot() {
  return <span className="leaf-dot" aria-hidden="true" />
}
