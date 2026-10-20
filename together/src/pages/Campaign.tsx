import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { CampaignCover, OrgLogo } from '../components/CampaignImage.tsx'
import { Leaderboard, RankBanner } from '../components/Leaderboard.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { FundUseTab, StoryTab, TrustTab, UpdatesTab } from '../components/campaign/PublicSections.tsx'
import { ReferralIntro } from '../components/referral/ReferralIntro.tsx'
import { CampaignQuestions } from '../components/ai/CampaignQuestions.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { campaignDetailsPath, campaignPlayPath } from '../lib/campaigns.ts'
import { followedAt, setFollowing } from '../lib/follows.ts'
import { setShareContext } from '../lib/attribution.ts'
import { canHaveSharingPages, shareWorkspacePath } from '../lib/referrals.ts'
import { campaignMilestones, deliverySummary, latestUpdateDate } from '../lib/transparency.ts'
import { OrgNotFound } from './org/OrgNotFound.tsx'
import { formatDate, formatDateRange, formatINR, parseWholeRupees } from '../lib/format.ts'
import { GAME_EXPLANATION, campaignGameSettings, gameActionAmounts } from '../lib/gameContribution.ts'
import { gameMeta } from '../lib/games.ts'
import { getPending, isUnlocked, markGameIntroSeen, newToken, setPending, unlockCampaign } from '../lib/pending.ts'
import { snapshotReferral } from '../lib/attribution.ts'
import { activeReferral, currentPlayer, joinPlayer, rememberReferral } from '../lib/players.ts'
import type { Campaign, CampaignView, DemoStore, Referral } from '../lib/types.ts'
import { NotFoundPage } from './NotFound.tsx'

export function CampaignPage() {
  const { id = '' } = useParams()
  const view = useCampaignView(id)
  if (!view) return <NotFoundPage />
  return <CampaignDetails key={view.campaign.id} view={view} />
}

/** /campaigns/:id/r/:code — the same campaign, introduced by one supporter. */
export function ReferralCampaignPage() {
  const { id = '', code = '' } = useParams()
  const view = useCampaignView(id)
  const store = useDemoStore()
  const referral = store.referrals.find((item) => item.code === code && item.campaignId === id)
  if (!view || !referral) return <OrgNotFound kind="campaign" />
  return <CampaignDetails key={referral.id} view={view} referral={referral} />
}

type SectionTab = 'story' | 'updates' | 'fund'
const SECTION_TABS: Array<{ id: SectionTab; label: string }> = [
  { id: 'story', label: 'Story' },
  { id: 'updates', label: 'Updates' },
  { id: 'fund', label: 'How funds are used' },
]

/** The first sentence of the description, kept short enough to read at a glance. */
function shortPurpose(text: string): string {
  const trimmed = text.trim()
  const sentence = trimmed.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? trimmed
  return sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence
}

function CampaignDetails({ view, referral }: { view: CampaignView; referral?: Referral }) {
  const { campaign } = view
  const id = campaign.id
  const navigate = useNavigate()
  const { org, base } = useOrg()
  const store = useDemoStore()
  const [params, setParams] = useSearchParams()
  const [unlocked, setUnlocked] = useState(() => isUnlocked(id))
  const [tab, setTab] = useState<'direct' | 'game'>('direct')
  const requested = params.get('tab') === 'trust' ? 'fund' : params.get('tab')
  const section = (SECTION_TABS.find((item) => item.id === requested)?.id ?? 'story') as SectionTab

  useEffect(() => {
    document.title = referral ? `${referral.displayName} is supporting ${campaign.title}` : `${campaign.title} — ${campaign.organizerName}`
  }, [campaign.title, campaign.organizerName, referral])

  useEffect(() => {
    setShareContext(id, referral?.id ?? null)
  }, [id, referral])

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) rememberReferral(id, ref)
  }, [id, params])

  const needsCode = campaign.access === 'closed' && !campaign.isDraft && !unlocked
  const playPath = campaignPlayPath(campaign.id, campaign.gameType, base)
  const player = campaign.access === 'closed' ? currentPlayer(campaign.id) : null
  const needsName = campaign.access === 'closed' && !campaign.isDraft && !needsCode && !player

  function showSection(next: SectionTab | 'trust') {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next === 'trust' ? 'fund' : next)
    setParams(nextParams, { replace: true })
  }

  function openSection(next: SectionTab | 'trust') {
    showSection(next)
    const tabId = next === 'trust' ? 'fund' : next
    requestAnimationFrame(() => {
      document.getElementById(`tab-${tabId}`)?.scrollIntoView({ block: 'start' })
      document.getElementById(`tab-${tabId}`)?.focus()
    })
  }

  const purpose = shortPurpose(campaign.description)

  const followButton = <FollowButton campaignId={campaign.id} />

  return (
    <div className="container page-pad campaign">
      {referral ? (
        <Link to={campaignDetailsPath(campaign.id, base)} className="back-link page-back">
          ← Back to campaign
        </Link>
      ) : (
        <Link to={`${base}/campaigns`} className="back-link page-back">
          ← Back to campaigns
        </Link>
      )}
      {referral ? <ReferralIntro referral={referral} view={view} /> : null}
      {campaign.access === 'closed' && !needsCode ? <RankBanner campaignId={campaign.id} contributeHref="#support" /> : null}
      <div className="campaign-grid">
        <div className="campaign-main">
          {referral ? null : <CampaignCover campaign={campaign} className="campaign-hero" />}
          <div className="campaign-title">
            <h1>{campaign.title}</h1>
            <StatusBadge status={view.status} />
          </div>
          <div className="campaign-meta">
            <div className="org-line">
              <OrgLogo name={campaign.organizerName} logoData={campaign.logoData} size={36} />
              <span>
                {referral ? 'Original campaign organized by' : 'Organized by'} <strong>{campaign.organizerName}</strong> · {org.name}
              </span>
            </div>
            <span className="muted small">{formatDateRange(campaign.opensAt, campaign.closesAt)}</span>
          </div>
          {purpose ? (
            <p className="campaign-purpose">
              {purpose}{' '}
              <button type="button" className="link-button" onClick={() => openSection('story')}>
                Read the full story
              </button>
            </p>
          ) : null}
          <div className="mobile-support" aria-label="Campaign progress">
            <div className="money-row">
              <span>
                <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)}
              </span>
              <strong>{view.percent}%</strong>
            </div>
            <ProgressBar value={view.percent} muted={!view.canGive} />
            <a href="#support" className="btn btn-primary btn-block">
              Support this campaign
            </a>
          </div>
          {campaign.access === 'closed' && !needsCode ? <Leaderboard campaignId={campaign.id} /> : null}
          <div className="section-tabs" role="tablist" aria-label="Campaign information">
            {SECTION_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={section === item.id}
                aria-controls={`panel-${item.id}`}
                tabIndex={section === item.id ? 0 : -1}
                className={section === item.id ? 'active' : ''}
                onClick={() => showSection(item.id)}
                onKeyDown={(event) => {
                  const index = SECTION_TABS.findIndex((entry) => entry.id === section)
                  const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
                  if (!delta) return
                  event.preventDefault()
                  const next = SECTION_TABS[(index + delta + SECTION_TABS.length) % SECTION_TABS.length]
                  showSection(next.id)
                  document.getElementById(`tab-${next.id}`)?.focus()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${section}`} aria-labelledby={`tab-${section}`} className="section-panel">
            {section === 'story' ? <StoryTab campaign={campaign} store={store} onShowUpdates={() => showSection('updates')} /> : null}
            {section === 'updates' ? <UpdatesTab campaign={campaign} store={store} follow={followButton} /> : null}
            {section === 'fund' ? (
              <>
                <FundUseTab campaign={campaign} store={store} />
                <section className="organizer-info" aria-labelledby="organizer-info-title">
                  <h3 id="organizer-info-title">Who is running this campaign</h3>
                  <TrustTab campaign={campaign} store={store} org={org} />
                </section>
              </>
            ) : null}
          </div>
          <CampaignQuestions campaign={campaign} store={store} onOpenTab={openSection} />
        </div>

        <aside className="support-column">
          <div className="panel support-panel" id="support">
            <h2>Support this campaign</h2>
            <span className="eyebrow-label">Campaign goal</span>
            <div className="money-row big">
              <span>
                <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)}
              </span>
              <strong>{view.percent}%</strong>
            </div>
            <ProgressBar value={view.percent} muted={!view.canGive} />
            <p className="muted small">
              {view.supporters === 1 ? '1 confirmed simulated contribution' : `${view.supporters} confirmed simulated contributions`}
            </p>
            <div className="divider" />
            {needsCode ? (
              <AccessGate
                onUnlock={(code, name) => {
                  if (!campaign.accessCode || code.trim().toUpperCase() !== campaign.accessCode.toUpperCase()) {
                    return 'That code doesn’t match. Ask the organizer for the group’s access code.'
                  }
                  const joined = joinPlayer(campaign.id, name)
                  if (!joined) return 'Add the name you want kept on this private group’s player list.'
                  unlockCampaign(campaign.id)
                  setUnlocked(true)
                  if (campaign.participation.game) navigate(playPath)
                  return null
                }}
              />
            ) : needsName ? (
              <NameGate
                onJoin={(name) => {
                  const joined = joinPlayer(campaign.id, name)
                  if (!joined) return false
                  if (campaign.participation.game && params.get('view') !== 'details') navigate(playPath)
                  return true
                }}
              />
            ) : (
              <GivePanel
                key={campaign.id}
                view={view}
                tab={campaign.participation.direct ? tab : 'game'}
                onTab={setTab}
                onContinue={(amount) => {
                  const pending = getPending(campaign.id)
                  const giver = currentPlayer(campaign.id)
                  const token = pending?.method === 'direct' ? pending.token : newToken()
                  setPending({
                    token,
                    referralId: snapshotReferral(token, campaign.id),
                    campaignId: campaign.id,
                    amount,
                    method: 'direct',
                    playerId: giver?.id,
                    playerName: giver?.name,
                    referralCode: activeReferral(campaign.id, giver?.id),
                  })
                  navigate(`${base}/campaigns/${campaign.id}/confirm`)
                }}
              />
            )}
            {referral ? <p className="muted small">Your contribution goes to the original campaign. {referral.displayName}’s page is credited for sharing it.</p> : null}
          </div>
          <DeliverySnapshot campaign={campaign} store={store} onOpen={() => openSection('updates')} />
          <div className="panel aside-card share-card">
            <h2 className="aside-title">Help spread the word</h2>
            <ShareLinkButton url={`${window.location.origin}${campaignDetailsPath(campaign.id, base).split('?')[0]}`} />
            {canHaveSharingPages(view) ? (
              <>
                <Link to={shareWorkspacePath(base, campaign.id)} className="btn btn-outline btn-block">
                  Create my sharing page
                </Link>
                <span className="muted small">Add your message and get your own link to this campaign.</span>
              </>
            ) : null}
          </div>
          <div className="panel aside-card">{followButton}</div>
        </aside>
      </div>

    </div>
  )
}

function DeliverySnapshot({ campaign, store, onOpen }: { campaign: Campaign; store: DemoStore; onOpen: () => void }) {
  const milestones = campaignMilestones(store, campaign.id)
  const delivery = deliverySummary(milestones)
  const last = latestUpdateDate(store, campaign.id)
  return (
    <div className="panel aside-card delivery-snapshot">
      <span className="eyebrow-label">Progress reported by the organizer</span>
      {delivery.total > 0 ? (
        <>
          <strong>
            {delivery.complete} of {delivery.total} milestones reported complete
          </strong>
          <span className="delivery-bar" aria-hidden="true">
            <i style={{ width: `${Math.round((delivery.complete / delivery.total) * 100)}%` }} />
          </span>
          {delivery.delayed ? <span className="small warn-text">{delivery.delayed} past expected date</span> : null}
        </>
      ) : (
        <strong>No delivery milestones yet</strong>
      )}
      <span className="muted small">{last ? `Latest update ${formatDate(last)}` : 'Awaiting update'}</span>
      <button type="button" className="link-button small" onClick={onOpen}>
        See updates and timeline
      </button>
    </div>
  )
}

function ShareLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setStatus('copied')
          } catch {
            setStatus('failed')
          }
        }}
      >
        {status === 'copied' ? 'Link copied.' : 'Share campaign link'}
      </button>
      <span className={status === 'failed' ? 'error-text small' : 'sr-only'} role="status">
        {status === 'copied' ? 'Link copied.' : status === 'failed' ? `Copy failed. Copy this link instead: ${url}` : ''}
      </span>
    </>
  )
}

function FollowButton({ campaignId }: { campaignId: string }) {
  const [following, setFollowingState] = useState(() => followedAt(campaignId))
  const [error, setError] = useState('')
  return (
    <div className="follow-box">
      <button
        type="button"
        className={following ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
        aria-pressed={Boolean(following)}
        onClick={() => {
          const next = !following
          if (!setFollowing(campaignId, next)) {
            setError('This browser could not save the bookmark.')
            return
          }
          setError('')
          setFollowingState(next ? new Date().toISOString() : null)
        }}
      >
        {following ? 'Following on this device' : 'Follow updates on this device'}
      </button>
      <span className="muted small">A local bookmark only — no emails or notifications are sent.</span>
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  )
}

function GivePanel({
  view,
  tab,
  onTab,
  onContinue,
}: {
  view: CampaignView
  tab: 'direct' | 'game'
  onTab: (tab: 'direct' | 'game') => void
  onContinue: (amount: number) => void
}) {
  const { campaign } = view
  const { base } = useOrg()
  const [selected, setSelected] = useState<number | null>(() => {
    if (campaign.donationMode !== 'fixed') return null
    const pending = getPending(campaign.id)
    if (pending?.method === 'direct' && campaign.fixedAmounts.includes(pending.amount)) return pending.amount
    if (campaign.fixedAmounts.includes(250)) return 250
    return campaign.fixedAmounts[0] ?? null
  })
  const [custom, setCustom] = useState(() => {
    if (campaign.donationMode !== 'custom') return ''
    const pending = getPending(campaign.id)
    return pending?.method === 'direct' ? String(pending.amount) : ''
  })
  const [error, setError] = useState('')
  const blocked = blockMessage(view.status, campaign.opensAt)

  return (
    <div>
      {campaign.participation.direct && campaign.participation.game ? (
        <div className="underline-tabs" role="group" aria-label="How do you want to help?">
          <button type="button" aria-pressed={tab === 'direct'} className={tab === 'direct' ? 'active' : ''} onClick={() => onTab('direct')}>
            Give directly
          </button>
          <button type="button" aria-pressed={tab === 'game'} className={tab === 'game' ? 'active' : ''} onClick={() => onTab('game')}>
            Play a game
          </button>
        </div>
      ) : null}

      {blocked ? (
        <div className="notice warn compact">
          <div>
            <strong>{blocked.title}</strong>
            <p className="small">{blocked.body}</p>
          </div>
        </div>
      ) : tab === 'game' && campaign.participation.game ? (
        <div className="play-cta">
          <strong>{gameMeta(campaign.gameType).name}</strong>
          <p className="small">{GAME_EXPLANATION}</p>
          <p className="muted small">{gameActionAmounts(campaign.gameType, campaignGameSettings(campaign).ratePaise)}</p>
          <Link
            to={campaignPlayPath(campaign.id, campaign.gameType, base)}
            className="btn btn-primary btn-block btn-lg"
            onClick={() => markGameIntroSeen(campaign.id)}
          >
            Start playing
          </Link>
          {campaign.participation.direct ? (
            <button type="button" className="link-button center-block" onClick={() => onTab('direct')}>
              Give directly instead
            </button>
          ) : null}
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
          <button
            type="button"
            className="btn btn-primary btn-block btn-lg"
            onClick={() => {
              const amount = chosenAmount(campaign.donationMode, campaign.fixedAmounts, selected, custom)
              if (amount == null) {
                setError(
                  campaign.donationMode === 'fixed' ? 'Choose one of the suggested amounts.' : 'Enter a whole amount greater than zero.',
                )
                return
              }
              onContinue(amount)
            }}
          >
            Continue to review
          </button>
          <p className="muted small center">Simulated payment — no real money is collected.</p>
        </>
      ) : (
        <p className="muted">This campaign has no open participation options.</p>
      )}
    </div>
  )
}

function chosenAmount(mode: 'fixed' | 'custom', amounts: number[], selected: number | null, custom: string): number | null {
  if (mode === 'fixed') {
    if (selected == null || !amounts.includes(selected) || selected <= 0) return null
    return selected
  }
  const amount = parseWholeRupees(custom)
  if (amount == null || amount > 10_000_000) return null
  return amount
}

function blockMessage(status: string, opensAt: string): { title: string; body: string } | null {
  switch (status) {
    case 'scheduled':
      return {
        title: 'Opens soon',
        body: `Contributions open on ${new Date(opensAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`,
      }
    case 'closed':
      return { title: 'Closed', body: 'This campaign is closed and cannot accept contributions.' }
    case 'completed':
      return { title: 'Goal reached', body: 'This campaign reached its goal and closed. Thank you to everyone who took part.' }
    case 'draft':
      return { title: 'Draft', body: 'Publish this campaign before it can accept simulated contributions.' }
    default:
      return null
  }
}

function AccessGate({ onUnlock }: { onUnlock: (code: string, name: string) => string | null }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  return (
    <form
      className="access-gate"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        setError(onUnlock(code, name) ?? '')
      }}
    >
      <strong>Private group</strong>
      <p className="muted small">
        Enter the demo access code and the name to keep on this group’s player list. This is not secure access control.
      </p>
      <label className="field-label" htmlFor="player-name">
        Your name
      </label>
      <input id="player-name" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
      <label className="field-label" htmlFor="demo-code">
        Access code
      </label>
      <input id="demo-code" value={code} autoComplete="off" onChange={(event) => setCode(event.target.value.toUpperCase())} />
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block">
        Join group
      </button>
    </form>
  )
}

function NameGate({ onJoin }: { onJoin: (name: string) => boolean }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  return (
    <form
      className="access-gate"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        if (!onJoin(name)) setError('Add a name of at least 2 characters. It stays on this private group’s player list.')
      }}
    >
      <strong>Add your name</strong>
      <p className="muted small">Private groups show each player’s name on the group’s leaderboard.</p>
      <label className="field-label" htmlFor="join-name">
        Your name
      </label>
      <input id="join-name" value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
      {error ? <p className="error-text">{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block">
        Join the board
      </button>
    </form>
  )
}
