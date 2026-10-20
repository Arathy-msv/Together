import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { CampaignCover, OrgLogo } from '../components/CampaignImage.tsx'
import { Leaderboard, RankBanner } from '../components/Leaderboard.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { StatusBadge } from '../components/StatusBadge.tsx'
import { useOrgBase } from '../components/org/OrgContext.tsx'
import { useCampaignView } from '../hooks/useDemoStore.ts'
import { campaignPlayPath } from '../lib/campaigns.ts'
import { formatDateRange, formatINR, parseWholeRupees } from '../lib/format.ts'
import { campaignGameSettings, gameIntroSentence } from '../lib/gameContribution.ts'
import { GAME_THUMBS, gameMeta } from '../lib/games.ts'
import { getPending, isUnlocked, newToken, setPending, unlockCampaign } from '../lib/pending.ts'
import { activeReferral, currentPlayer, joinPlayer, rememberReferral } from '../lib/players.ts'
import type { CampaignView } from '../lib/types.ts'
import { NotFoundPage } from './NotFound.tsx'

export function CampaignPage() {
  const { id = '' } = useParams()
  const view = useCampaignView(id)
  const navigate = useNavigate()
  const base = useOrgBase()
  const [params] = useSearchParams()
  const [unlocked, setUnlocked] = useState(() => (id ? isUnlocked(id) : false))
  const [tab, setTab] = useState<'direct' | 'game'>('direct')

  useEffect(() => {
    if (view) document.title = `${view.campaign.title} — ${view.campaign.organizerName}`
  }, [view])

  useEffect(() => {
    const ref = params.get('ref')
    if (id && ref) rememberReferral(id, ref)
  }, [id, params])

  if (!view) return <NotFoundPage />

  const { campaign } = view
  const needsCode = campaign.access === 'closed' && !campaign.isDraft && !unlocked
  const game = gameMeta(campaign.gameType)
  const playPath = campaignPlayPath(campaign.id, campaign.gameType, base)
  const contribution = campaignGameSettings(campaign)
  const gameIntro = gameIntroSentence(campaign.gameType, contribution.ratePaise)
  const player = campaign.access === 'closed' ? currentPlayer(campaign.id) : null
  const needsName = campaign.access === 'closed' && !campaign.isDraft && !needsCode && !player

  if (campaign.participation.game && !campaign.isDraft && !needsCode && !needsName && params.get('view') !== 'details') {
    return <Navigate to={playPath} replace />
  }

  return (
    <div className="container page-pad campaign">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`${base}/campaigns`}>Campaigns</Link>
        <span>/</span>
        <span>{campaign.title}</span>
      </nav>
      {campaign.access === 'closed' && !needsCode ? <RankBanner campaignId={campaign.id} contributeHref="#support" /> : null}
      <div className="campaign-grid">
        <div>
          <CampaignCover campaign={campaign} className="campaign-hero" />
          <div className="campaign-title">
            <h1>{campaign.title}</h1>
            <StatusBadge status={view.status} />
          </div>
          <div className="campaign-meta">
            <div className="org-line">
              <OrgLogo name={campaign.organizerName} logoData={campaign.logoData} size={36} />
              <span>
                Organised by <strong>{campaign.organizerName}</strong>
              </span>
            </div>
            <span className="muted small">{formatDateRange(campaign.opensAt, campaign.closesAt)}</span>
          </div>
          <p className="campaign-story">{campaign.description}</p>
          {campaign.access === 'closed' && !needsCode ? <Leaderboard campaignId={campaign.id} /> : null}
        </div>

        <aside className="panel support-panel" id="support">
          <h2>Support this campaign</h2>
          <div className="money-row big">
            <span>
              <strong>{formatINR(view.raised)}</strong> of {formatINR(campaign.goalAmount)}
            </span>
            <strong>{view.percent}%</strong>
          </div>
          <ProgressBar value={view.percent} muted={!view.canGive} />
          <p className="muted small">{view.supporters === 1 ? '1 contribution' : `${view.supporters} contributions`}</p>
          <div className="divider" />
          {needsCode ? (
            <AccessGate
              onUnlock={(code, name) => {
                if (!campaign.accessCode || code.trim().toUpperCase() !== campaign.accessCode.toUpperCase()) {
                  return 'That code does not match. Check the code on the organiser dashboard.'
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
                setPending({
                  token: pending?.method === 'direct' ? pending.token : newToken(),
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
        </aside>
      </div>

      <section className="panel game-strip">
        {campaign.participation.game ? (
          <>
            <img
              src={
                campaign.gameType === 'puzzle' && campaign.puzzleImageData
                  ? campaign.puzzleImageData
                  : GAME_THUMBS[campaign.gameType]
              }
              alt=""
            />
            <div>
              <h3>{game.name}</h3>
              <p className="muted small">{gameIntro}</p>
            </div>
            {needsCode ? null : (
              <Link to={playPath} className="btn btn-primary">
                Play {game.name}
              </Link>
            )}
          </>
        ) : (
          <div>
            <h3>Direct giving</h3>
            <p className="muted small">This campaign accepts direct simulated contributions.</p>
          </div>
        )}
        <button type="button" className="btn btn-disabled" disabled>
          Rewards coming soon
        </button>
      </section>
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
  const base = useOrgBase()
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
        <div className="underline-tabs" role="group" aria-label="Ways to support">
          <button type="button" aria-pressed={tab === 'direct'} className={tab === 'direct' ? 'active' : ''} onClick={() => onTab('direct')}>
            Donate
          </button>
          <button type="button" aria-pressed={tab === 'game'} className={tab === 'game' ? 'active' : ''} onClick={() => onTab('game')}>
            Play & give
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
          <p className="muted small">
            {gameMeta(campaign.gameType).blurb} {gameIntroSentence(campaign.gameType, campaignGameSettings(campaign).ratePaise)}
          </p>
          <Link to={campaignPlayPath(campaign.id, campaign.gameType, base)} className="btn btn-primary btn-block">
            Play {gameMeta(campaign.gameType).name}
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
            Continue to demo payment
          </button>
          <p className="muted small center">No real payment collected.</p>
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
      <p className="muted small">Private groups keep every player’s name for the leadership board and referrals.</p>
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
