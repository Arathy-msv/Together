import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { actingParticipantId, sponsorOffer } from '../lib/sponsors.ts'
import { trackJourney } from '../lib/analytics.ts'
import { formatMinor } from '../lib/transparency.ts'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Leaderboard, RankBanner } from '../components/Leaderboard.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { FundraisingBadge } from '../components/StatusBadge.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { FundUseTab, StoryTab, TrustTab, UpdatesTab } from '../components/campaign/PublicSections.tsx'
import { ReferralIntro } from '../components/referral/ReferralIntro.tsx'
import { ShareKit } from '../components/sharing/ShareKit.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { useVoucherStore } from '../hooks/useVoucherStore.ts'
import { campaignDetailsPath, campaignPlayPath, campaignSharePath } from '../lib/campaigns.ts'
import { absoluteAppUrl } from '../lib/publicUrl.ts'
import { setShareContext } from '../lib/attribution.ts'
import { canHaveSharingPages, shareWorkspacePath } from '../lib/referrals.ts'
import { publishedUpdates } from '../lib/transparency.ts'
import { isFunded } from '../lib/lifecycle.ts'
import { OrgNotFound } from './org/OrgNotFound.tsx'
import { formatDate, formatINR, parseWholeRupees, shortPurpose } from '../lib/format.ts'
import { canUseFeature, campaignUsesSponsor } from '../lib/features.ts'
import { CampaignPartnerOffers } from './org/PartnerOffersPublic.tsx'
import { campaignOffers } from '../lib/vouchers.ts'
import { GAME_EXPLANATION, campaignGameSettings, gameAmountRules } from '../lib/gameContribution.ts'
import { gameMeta } from '../lib/games.ts'
import { getPending, isUnlocked, markGameIntroSeen, newToken, setPending, unlockCampaign } from '../lib/pending.ts'
import { snapshotReferral } from '../lib/attribution.ts'
import { activeReferral, currentPlayer, joinPlayer, rememberReferral } from '../lib/players.ts'
import type { Campaign, CampaignView, DemoStore, Referral } from '../lib/types.ts'
import { NotFoundPage } from './NotFound.tsx'

type DetailPanel = 'story' | 'updates' | 'fund' | 'offers' | 'share'

const PANEL_TITLES: Record<DetailPanel, string> = {
  story: 'Story',
  updates: 'Updates',
  fund: 'How funds are used',
  offers: 'Partner offers',
  share: 'Share this campaign',
}

function panelFromTab(tab: string | null): DetailPanel | null {
  if (tab === 'trust') return 'fund'
  if (tab === 'story' || tab === 'updates' || tab === 'fund' || tab === 'offers' || tab === 'share') return tab
  return null
}

/** Secondary campaign content opens in a modal so the main page stays short. */
function CampaignDetailSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    function onCancel(event: Event) {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className="campaign-sheet"
      aria-labelledby="campaign-sheet-title"
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="campaign-sheet-card">
        <header className="campaign-sheet-head">
          <h2 id="campaign-sheet-title">{title}</h2>
          <button type="button" className="campaign-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="campaign-sheet-body">{children}</div>
      </div>
    </dialog>
  )
}

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

function CampaignDetails({ view, referral }: { view: CampaignView; referral?: Referral }) {
  const { campaign } = view
  const id = campaign.id
  const navigate = useNavigate()
  const { org, base } = useOrg()
  const store = useDemoStore()
  const vouchers = useVoucherStore()
  const [params, setParams] = useSearchParams()
  const [unlocked, setUnlocked] = useState(() => isUnlocked(id))
  const [tab, setTab] = useState<'direct' | 'game'>('direct')
  const panel = panelFromTab(params.get('tab'))
  const hasOffers = campaignOffers(org, vouchers, campaign).length > 0

  useEffect(() => {
    document.title = referral ? `${referral.displayName} is supporting ${campaign.title}` : `${campaign.title} — ${campaign.organizerName}`
    trackJourney('campaign_viewed', { campaignId: id })
  }, [campaign.title, campaign.organizerName, referral, id])

  useEffect(() => {
    setShareContext(id, referral?.id ?? null)
  }, [id, referral])

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) rememberReferral(id, ref)
  }, [id, params])

  useEffect(() => {
    if (panel === 'updates') trackJourney('update_viewed', { campaignId: id })
  }, [panel, id])

  function chooseMode(next: 'direct' | 'game') {
    setTab(next)
    trackJourney('giving_mode_selected', { campaignId: id, mode: next })
  }

  const needsCode = campaign.access === 'closed' && !campaign.isDraft && !unlocked
  const playPath = campaignPlayPath(campaign.id, campaign.gameType, base)
  const player = campaign.access === 'closed' ? currentPlayer(campaign.id) : null
  const needsName = campaign.access === 'closed' && !campaign.isDraft && !needsCode && !player

  function openPanel(next: DetailPanel, milestoneId?: string) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next)
    if (milestoneId) nextParams.set('milestone', milestoneId)
    else if (next !== 'fund') nextParams.delete('milestone')
    setParams(nextParams, { replace: true })
  }

  function closePanel() {
    const nextParams = new URLSearchParams(params)
    nextParams.delete('tab')
    nextParams.delete('milestone')
    setParams(nextParams, { replace: true })
  }

  const purpose = shortPurpose(campaign.description)
  const campaignUrl = absoluteAppUrl(campaignSharePath(campaign.id, base))
  const closedFunded = isFunded(view) && !view.canGive
  return (
    <div className="container page-pad campaign campaign-compact">
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
            <div className="campaign-title-row">
              <h1>{campaign.title}</h1>
              <button type="button" className="campaign-share-btn" onClick={() => openPanel('share')} aria-label="Share this campaign">
                <ShareIcon />
                Share
              </button>
            </div>
            <span className="status-row">
              <FundraisingBadge view={view} />
            </span>
          </div>
          {purpose ? <p className="campaign-purpose">{purpose}</p> : null}
          {campaignUsesSponsor(org, campaign) ? (
            <p className="sponsor-banner notice success compact">
              <strong>Sponsor-funded play is available.</strong> A sponsor reward is separate from your own gift. It stays pending until an Organization Admin confirms the simulated funds.
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
              <button type="button" className="btn btn-primary btn-block" onClick={() => openPanel('updates')}>
                See what happens next
              </button>
            ) : (
              <a href="#support" className="btn btn-primary btn-block">
                Support this campaign
              </a>
            )}
          </div>
          {campaign.access === 'closed' && !needsCode ? <Leaderboard campaignId={campaign.id} /> : null}
          <nav className="campaign-detail-links" aria-label="More about this campaign">
            <button type="button" className={panel === 'updates' ? 'active' : ''} onClick={() => openPanel('updates')}>
              Updates
            </button>
            <button type="button" className={panel === 'fund' ? 'active' : ''} onClick={() => openPanel('fund')}>
              How funds are used
            </button>
            {hasOffers ? (
              <button type="button" className={panel === 'offers' ? 'active' : ''} onClick={() => openPanel('offers')}>
                Partner offers
              </button>
            ) : null}
          </nav>
        </div>

        <aside className="support-column">
          {closedFunded ? (
            <FundedPanel view={view} store={store} onNext={() => openPanel('updates')} />
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
                  onTab={chooseMode}
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
              {referral ? (
                <p className="muted small">Your contribution goes to the original campaign. {referral.displayName}’s page is credited for sharing it.</p>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {panel ? (
        <CampaignDetailSheet title={PANEL_TITLES[panel]} onClose={closePanel}>
          {panel === 'story' ? <StoryTab campaign={campaign} store={store} onShowUpdates={() => openPanel('updates')} /> : null}
          {panel === 'updates' ? (
            <UpdatesTab
              campaign={campaign}
              store={store}
              onOpenExpenses={(milestoneId) => openPanel('fund', milestoneId)}
            />
          ) : null}
          {panel === 'fund' ? (
            <>
              <FundUseTab key={params.get('milestone') ?? 'all'} campaign={campaign} store={store} initialMilestone={params.get('milestone')} />
              <section className="organizer-info" aria-labelledby="organizer-info-title">
                <h3 id="organizer-info-title">Who is running this campaign</h3>
                <TrustTab campaign={campaign} store={store} org={org} />
              </section>
            </>
          ) : null}
          {panel === 'offers' ? <CampaignPartnerOffers campaign={campaign} /> : null}
          {panel === 'share' ? (
            <div id="campaign-share-kit" className="campaign-share-block">
              {canUseFeature(org, 'shareKit') ? (
                <ShareKit org={org} campaign={campaign} url={campaignUrl} mode="campaign" defaultOpen title="Share this campaign" />
              ) : (
                <div className="campaign-simple-share">
                  <p className="muted small">Copying a campaign link still works.</p>
                  <ShareLinkButton url={campaignUrl} />
                </div>
              )}
              {canHaveSharingPages(view) ? (
                <Link to={shareWorkspacePath(base, campaign.id)} className="btn btn-outline">
                  Create my sharing page
                </Link>
              ) : null}
            </div>
          ) : null}
        </CampaignDetailSheet>
      ) : null}
    </div>
  )
}

function SponsorPlayChoice({ campaignId, currency }: { campaignId: string; currency: Campaign['currency'] }) {
  const [mode, setMode] = useState(() => sessionStorage.getItem(`together.playMode.${campaignId}`) === 'sponsor')
  const offer = sponsorOffer(campaignId, actingParticipantId())
  function choose(sponsor: boolean) {
    sessionStorage.setItem(`together.playMode.${campaignId}`, sponsor ? 'sponsor' : 'personal')
    setMode(sponsor)
    trackJourney('giving_mode_selected', { campaignId, mode: sponsor ? 'sponsor' : 'direct' })
  }
  if (!offer) return <p className="muted small">An Organization Admin has not added a sponsor commitment for this campaign yet.</p>
  return (
    <fieldset className="give-choice">
      <legend className="sr-only">Who funds this play</legend>
      <label className={!mode ? 'give-option selected' : 'give-option'}>
        <input type="radio" name={`fund-${campaignId}`} checked={!mode} onChange={() => choose(false)} />
        <span>
          <strong>My own contribution</strong>
          <em>Play builds a suggestion you review and confirm.</em>
        </span>
      </label>
      <label className={mode ? 'give-option selected' : 'give-option'}>
        <input type="radio" name={`fund-${campaignId}`} checked={mode} onChange={() => choose(true)} />
        <span>
          <strong>Sponsor-funded play</strong>
          <em>
            {offer.next ? `Next reward ${formatMinor(offer.next.amountMinor, currency)}. ` : 'No reward left for you. '}
            {offer.exhausted ? 'The sponsor budget or your cap is used up.' : `${formatMinor(offer.remainingMinor, currency)} of the sponsor budget is still available.`} Nothing is added to your checkout.
          </em>
        </span>
      </label>
    </fieldset>
  )
}

function ShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="campaign-share-icon">
      <circle cx="15" cy="4.5" r="2.25" fill="currentColor" />
      <circle cx="5" cy="10" r="2.25" fill="currentColor" />
      <circle cx="15" cy="15.5" r="2.25" fill="currentColor" />
      <path d="M7.1 8.9 12.9 5.6M7.1 11.1l5.8 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function ShareLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
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

/** Replaces the contribution panel once the goal is met and contributions have stopped. */
function FundedPanel({ view, store, onNext }: { view: CampaignView; store: DemoStore; onNext: () => void }) {
  const { campaign } = view
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
    if (pending?.method === 'direct') return null
    if (campaign.fixedAmounts.includes(250)) return 250
    return campaign.fixedAmounts[0] ?? null
  })
  const [custom, setCustom] = useState(() => {
    const pending = getPending(campaign.id)
    if (pending?.method !== 'direct') return ''
    if (campaign.donationMode === 'custom') return String(pending.amount)
    if (!campaign.fixedAmounts.includes(pending.amount)) return String(pending.amount)
    return ''
  })
  const [error, setError] = useState('')
  const blocked = blockMessage(view.status, campaign.opensAt)
  const overGoal = view.canGive && isFunded(view)

  return (
    <div className="give-panel">
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
            <SponsorPlayChoice campaignId={campaign.id} currency={campaign.currency} />
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
              setCustom('')
              setError('')
            }}
            onCustom={(value) => {
              setCustom(value)
              setSelected(null)
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
                  campaign.donationMode === 'custom'
                    ? 'Enter a whole amount greater than zero.'
                    : 'Choose a suggested amount, or enter your own.',
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
  if (mode === 'fixed' && selected != null && amounts.includes(selected) && selected > 0) return selected
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
