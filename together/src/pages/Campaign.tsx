import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { CampaignCover, OrgLogo } from '../components/CampaignImage.tsx'
import { Leaderboard, RankBanner } from '../components/Leaderboard.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { DeliveryBadge, FundraisingBadge } from '../components/StatusBadge.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { FundUseTab, StoryTab, TrustTab, UpdatesTab } from '../components/campaign/PublicSections.tsx'
import { ReferralIntro } from '../components/referral/ReferralIntro.tsx'
import { ShareKit } from '../components/sharing/ShareKit.tsx'
import { CampaignQuestions } from '../components/ai/CampaignQuestions.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { campaignDetailsPath, campaignPlayPath, campaignSharePath } from '../lib/campaigns.ts'
import { followedAt, setFollowing } from '../lib/follows.ts'
import { setShareContext } from '../lib/attribution.ts'
import { canHaveSharingPages, shareWorkspacePath } from '../lib/referrals.ts'
import { campaignMilestones, deliverySummary, publishedUpdates } from '../lib/transparency.ts'
import { deliveryState, isFunded } from '../lib/lifecycle.ts'
import { OrgNotFound } from './org/OrgNotFound.tsx'
import { formatDate, formatDateRange, formatINR, parseWholeRupees, shortPurpose } from '../lib/format.ts'
import { canUseFeature, campaignUsesSponsor } from '../lib/features.ts'
import { CampaignPartnerOffers } from './org/PartnerOffersPublic.tsx'
import { GAME_EXPLANATION, campaignGameSettings, gameAmountRules } from '../lib/gameContribution.ts'
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
  const campaignUrl = `${window.location.origin}${campaignSharePath(campaign.id, base)}`

  const followButton = <FollowButton campaignId={campaign.id} />
  const closedFunded = isFunded(view) && !view.canGive

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
            <span className="status-row">
              <FundraisingBadge view={view} />
              {campaign.isDraft ? null : <DeliveryBadge state={deliveryState(campaignMilestones(store, campaign.id))} />}
            </span>
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
          {canUseFeature(org, 'updateCommitments') && campaign.nextUpdateAt ? (
            <p className="muted small">Next update expected by {formatDate(campaign.nextUpdateAt)} (organizer commitment).</p>
          ) : null}
          {campaignUsesSponsor(org, campaign) ? (
            <p className="sponsor-banner notice success compact">
              <strong>Sponsor-funded play is on.</strong> The organization has confirmed a sponsor for play. Sponsor amounts are not tracked or received in this prototype — what you confirm is your own simulated contribution.
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
            {closedFunded ? (
              <button type="button" className="btn btn-primary btn-block" onClick={() => openSection('updates')}>
                See what happens next
              </button>
            ) : (
              <a href="#support" className="btn btn-primary btn-block">
                Support this campaign
              </a>
            )}
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
            {section === 'updates' ? (
              <UpdatesTab
                campaign={campaign}
                store={store}
                follow={followButton}
                onOpenExpenses={(milestoneId) => {
                  const nextParams = new URLSearchParams(params)
                  nextParams.set('tab', 'fund')
                  nextParams.set('milestone', milestoneId)
                  setParams(nextParams, { replace: true })
                  requestAnimationFrame(() => {
                    document.getElementById('tab-fund')?.scrollIntoView({ block: 'start' })
                    document.getElementById('tab-fund')?.focus()
                  })
                }}
              />
            ) : null}
            {section === 'fund' ? (
              <>
                <FundUseTab key={params.get('milestone') ?? 'all'} campaign={campaign} store={store} initialMilestone={params.get('milestone')} />
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
          {closedFunded ? (
            <FundedPanel view={view} store={store} onNext={() => openSection('updates')} />
          ) : (
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
            {campaign.story?.whatItSupports?.trim() ? (
              <p className="small support-purpose">
                <strong>Your contribution supports:</strong> {shortPurpose(campaign.story.whatItSupports)}
              </p>
            ) : null}
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
          )}
          {closedFunded ? null : <DeliverySnapshot campaign={campaign} store={store} onOpen={() => openSection('updates')} />}
          <div className="panel aside-card share-card">
            <h2 className="aside-title">Help spread the word</h2>
            <ShareLinkButton url={campaignUrl} />
            {canHaveSharingPages(view) ? (
              <>
                <Link to={shareWorkspacePath(base, campaign.id)} className="btn btn-outline btn-block">
                  Create my sharing page
                </Link>
                <span className="muted small">Add your message and get your own link to this campaign.</span>
              </>
            ) : null}
            {canUseFeature(org, 'shareKit') ? (
              <a href="#campaign-share-kit" className="link-button small">
                Open the full sharing kit — QR code, poster, WhatsApp, email, social images
              </a>
            ) : null}
          </div>
          <CampaignPartnerOffers campaign={campaign} />
          <div className="panel aside-card">{followButton}</div>
        </aside>
      </div>
      <div id="campaign-share-kit">
        <ShareKit org={org} campaign={campaign} url={campaignUrl} mode="campaign" defaultOpen={false} title="Share this campaign" />
      </div>
    </div>
  )
}

function DeliverySnapshot({ campaign, store, onOpen }: { campaign: Campaign; store: DemoStore; onOpen: () => void }) {
  const milestones = campaignMilestones(store, campaign.id)
  const delivery = deliverySummary(milestones)
  const latest = publishedUpdates(store, campaign.id)[0]
  return (
    <div className="panel aside-card delivery-snapshot">
      <span className="eyebrow-label">Delivery, as reported by the organizer</span>
      <DeliveryBadge state={deliveryState(milestones)} />
      {delivery.total > 0 ? (
        <>
          <strong>
            {delivery.complete} of {delivery.total} planned activities reported complete
          </strong>
          <span className="delivery-bar" aria-hidden="true">
            <i style={{ width: `${Math.round((delivery.complete / delivery.total) * 100)}%` }} />
          </span>
          {delivery.delayed ? <span className="small warn-text">{delivery.delayed} past expected date</span> : null}
        </>
      ) : (
        <strong>No delivery activities planned yet</strong>
      )}
      {latest ? (
        <span className="small">
          Latest update · {formatDate(latest.date)}: <strong>{latest.title}</strong>
        </span>
      ) : (
        <span className="muted small">No updates published yet</span>
      )}
      <button type="button" className="link-button small" onClick={onOpen}>
        See updates and timeline
      </button>
    </div>
  )
}

/** Replaces the contribution panel once the goal is met and contributions have stopped. */
function FundedPanel({ view, store, onNext }: { view: CampaignView; store: DemoStore; onNext: () => void }) {
  const { campaign } = view
  const milestones = campaignMilestones(store, campaign.id)
  const delivery = deliverySummary(milestones)
  const latest = publishedUpdates(store, campaign.id)[0]
  return (
    <div className="panel support-panel funded-panel" id="support">
      <h2>Funding goal reached</h2>
      <div className="money-row big">
        <span>
          <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)}
        </span>
        <strong>{view.percent}%</strong>
      </div>
      <ProgressBar value={view.percent} />
      <p className="muted small">
        Fundraising has closed. {view.supporters === 1 ? '1 confirmed simulated contribution' : `${view.supporters} confirmed simulated contributions`}.
      </p>
      <div className="divider" />
      <span className="eyebrow-label">Delivery, as reported by the organizer</span>
      <DeliveryBadge state={deliveryState(milestones)} />
      <p className="small">
        {delivery.total > 0
          ? `${delivery.complete} of ${delivery.total} planned activities reported complete.`
          : 'The organizer has not planned delivery activities yet.'}{' '}
        Reaching the goal does not mean the work is done.
      </p>
      {latest ? (
        <p className="small">
          Latest update · {formatDate(latest.date)}: <strong>{latest.title}</strong>
        </p>
      ) : (
        <p className="muted small">No updates published yet.</p>
      )}
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onNext}>
        See what happens next
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
  const { org, base } = useOrg()
  const sponsorPlay = campaignUsesSponsor(org, campaign)
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
  const overGoal = view.canGive && isFunded(view)

  return (
    <div>
      {campaign.participation.direct && campaign.participation.game && !blocked ? (
        <fieldset className="give-choice">
          <legend>How would you like to help?</legend>
          <label className={tab === 'direct' ? 'give-option selected' : 'give-option'}>
            <input type="radio" name={`give-${campaign.id}`} checked={tab === 'direct'} onChange={() => onTab('direct')} />
            <span>
              <strong>Give directly</strong>
              <em>Choose an amount, review it, then confirm.</em>
            </span>
          </label>
          <label className={tab === 'game' ? 'give-option selected' : 'give-option'}>
            <input type="radio" name={`give-${campaign.id}`} checked={tab === 'game'} onChange={() => onTab('game')} />
            <span>
              <strong>Play to support</strong>
              <em>
                {gameMeta(campaign.gameType).name}. Play to build a suggested contribution. Review your final amount before confirming.
              </em>
            </span>
          </label>
        </fieldset>
      ) : null}

      {overGoal ? (
        <p className="notice success compact small">
          Funding goal reached. The organizer is still accepting contributions until {formatDate(campaign.closesAt)}.
        </p>
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
          <ul className="game-rules small">
            {gameAmountRules(campaign.gameType, campaignGameSettings(campaign)).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Link
            to={campaignPlayPath(campaign.id, campaign.gameType, base)}
            className="btn btn-primary btn-block btn-lg"
            onClick={() => markGameIntroSeen(campaign.id)}
          >
            Start playing
          </Link>
          {sponsorPlay ? (
            <p className="muted small">Sponsor allocations aren’t tracked in this prototype. Play, then review and confirm your own simulated contribution. No real payment is taken.</p>
          ) : null}
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
      return { title: 'Fundraising closed', body: 'This campaign is no longer accepting contributions.' }
    case 'completed':
      return { title: 'Funding goal reached', body: 'Fundraising has closed. See the updates for what happens next.' }
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
