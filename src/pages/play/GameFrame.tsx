import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ContributionBar } from '../../components/ContributionBar.tsx'
import { GoalGesture } from '../../components/GoalGesture.tsx'
import { Leaderboard, RankBanner } from '../../components/Leaderboard.tsx'
import { ContributionLayer } from '../../components/ContributionDialogs.tsx'
import { LeafMark } from '../../components/illustrations.tsx'
import type { GameContribution } from '../../hooks/useGameContribution.ts'
import { campaignDetailsPath, goalReached } from '../../lib/campaigns.ts'
import { gameMeta } from '../../lib/games.ts'
import type { CampaignView, GameType } from '../../lib/types.ts'

export function GameFrame({
  view,
  game,
  side,
  children,
  contribution,
  onNextRound,
  preview = false,
}: {
  view: CampaignView
  game: GameType
  side: ReactNode
  children: ReactNode
  contribution: GameContribution
  onNextRound?: () => void
  preview?: boolean
}) {
  const { campaign } = view
  const finished = !preview && goalReached(view.raised, campaign.goalAmount)

  return (
    <>
      <div
        className={`play-shell play-${game}${preview ? ' play-preview' : ''}`}
        inert={contribution.paused || undefined}
        data-game-root
        tabIndex={-1}
      >
        <header className="play-header">
          {preview ? (
            <span className="brand" aria-label="Together">
              <LeafMark />
              <span>Together</span>
            </span>
          ) : (
            <Link to="/" className="brand" aria-label="Together home">
              <LeafMark />
              <span>Together</span>
            </Link>
          )}
          {preview ? (
            <span className="demo-pill sun">Preview</span>
          ) : (
            <>
              <p className="play-nav single" aria-current="page">
                {gameMeta(game).name}
              </p>
              <div className="play-header-actions">
                <Link to={campaignDetailsPath(campaign.id)}>About this campaign</Link>
                <span className="demo-pill sun">Demo</span>
              </div>
            </>
          )}
        </header>
        {campaign.access === 'closed' && !preview ? (
          <div className="play-rank">
            <RankBanner campaignId={campaign.id} />
          </div>
        ) : null}
        <div className="play-stage">
          <div className="play-live" inert={finished || undefined}>
            {children}
            <div className="play-side">
              {side}
              {campaign.access === 'closed' ? <Leaderboard campaignId={campaign.id} compact /> : null}
            </div>
          </div>
          {finished ? (
            <GoalGesture
              campaignTitle={campaign.title}
              goal={campaign.goalAmount}
              backTo={campaignDetailsPath(campaign.id)}
              resting="This game rests here. Thank you for helping the campaign grow."
            />
          ) : null}
        </div>
        {finished || view.canGive || preview ? null : (
          <p className="play-closed-note">
            This campaign is not accepting contributions right now. You can still play; any suggestion stays saved here.
          </p>
        )}
        {finished ? null : <ContributionBar contribution={contribution} />}
      </div>
      <ContributionLayer contribution={contribution} onNextRound={onNextRound} />
    </>
  )
}

export function GameTitle({ game, organizer }: { game: GameType; organizer: string }) {
  const meta = gameMeta(game)
  return (
    <div className="play-copy">
      <p className="play-kicker">
        <LeafMark size={14} />
        {organizer} · Community campaign
      </p>
      <h1>{meta.name}</h1>
      <p>{meta.blurb}</p>
    </div>
  )
}
