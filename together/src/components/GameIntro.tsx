import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useOrg } from './org/OrgContext.tsx'
import { OrgGameBrand } from './org/OrgGameBrand.tsx'
import { campaignDetailsPath } from '../lib/campaigns.ts'
import { GAME_EXPLANATION, campaignGameSettings, gameAmountRules } from '../lib/gameContribution.ts'
import { GAME_THUMBS, gameMeta } from '../lib/games.ts'
import type { CampaignView } from '../lib/types.ts'

/** Plain explanation shown once before a supporter starts a game. */
export function GameIntro({ view, onStart }: { view: CampaignView; onStart: () => void }) {
  const { campaign } = view
  const { base } = useOrg()
  const meta = gameMeta(campaign.gameType)
  const heading = useRef<HTMLHeadingElement>(null)
  const details = campaignDetailsPath(campaign.id, base)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div className="pro game-intro-page">
      <header className="game-intro-head">
        <OrgGameBrand className="brand" />
        <Link to={details}>About this campaign</Link>
      </header>
      <section className="panel game-intro" aria-labelledby="game-intro-title">
        <img
          src={campaign.gameType === 'puzzle' && campaign.puzzleImageData ? campaign.puzzleImageData : GAME_THUMBS[campaign.gameType]}
          alt=""
        />
        <div className="game-intro-body">
          <span className="eyebrow-label">{campaign.title}</span>
          <h1 id="game-intro-title" ref={heading} tabIndex={-1}>
            {meta.name}
          </h1>
          <p>{GAME_EXPLANATION}</p>
          <ul className="game-intro-amounts">
            {gameAmountRules(campaign.gameType, campaignGameSettings(campaign)).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
              Start playing
            </button>
            {campaign.participation.direct ? (
              <Link to={`${details}#support`} className="btn btn-outline btn-lg">
                Give directly
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
