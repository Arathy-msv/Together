import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { AmountPicker } from '../../components/AmountPicker.tsx'
import { LeafMark } from '../../components/illustrations.tsx'
import { CARTOON_GAMES, gameMeta } from '../../lib/games.ts'
import { parseWholeRupees } from '../../lib/format.ts'
import { getPending, newToken, setPending } from '../../lib/pending.ts'
import type { CampaignView, GameType } from '../../lib/types.ts'

export function GameFrame({
  view,
  game,
  side,
  children,
  note,
  preview = false,
}: {
  view: CampaignView
  game: GameType
  side: ReactNode
  children: ReactNode
  note?: string
  preview?: boolean
}) {
  const { campaign } = view
  const navigate = useNavigate()
  const pending = getPending(campaign.id)
  const [selected, setSelected] = useState<number | null>(() => {
    if (campaign.donationMode !== 'fixed') return null
    if (pending && campaign.fixedAmounts.includes(pending.amount)) return pending.amount
    return campaign.fixedAmounts.includes(250) ? 250 : (campaign.fixedAmounts[0] ?? null)
  })
  const [custom, setCustom] = useState(() =>
    campaign.donationMode === 'custom' && pending ? String(pending.amount) : '',
  )
  const [error, setError] = useState('')

  function continueGiving() {
    if (preview || !view.canGive) return
    const amount =
      campaign.donationMode === 'fixed'
        ? selected != null && campaign.fixedAmounts.includes(selected)
          ? selected
          : null
        : parseWholeRupees(custom)
    if (amount == null || amount <= 0 || amount > 10_000_000) {
      setError(
        campaign.donationMode === 'fixed'
          ? 'Choose one of the suggested amounts.'
          : 'Enter a whole amount greater than zero.',
      )
      return
    }
    const current = getPending(campaign.id)
    setPending({
      token: current?.method === 'game' ? current.token : newToken(),
      campaignId: campaign.id,
      amount,
      method: 'game',
      detail: note,
    })
    navigate(`/campaigns/${campaign.id}/confirm`)
  }

  return (
    <div className={`play-shell play-${game}${preview ? ' play-preview' : ''}`}>
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
            <nav className="play-nav" aria-label="Games">
              {CARTOON_GAMES.map((item) => (
                <NavLink
                  key={item}
                  to={`/campaigns/${campaign.id}/play/${item}`}
                  className={item === game ? 'active' : ''}
                >
                  {item === 'garden' ? 'Garden' : item === 'memory' ? 'Memory Match' : 'Puzzle'}
                </NavLink>
              ))}
            </nav>
            <div className="play-header-actions">
              <Link to={`/campaigns/${campaign.id}`}>About this campaign</Link>
              <span className="demo-pill sun">Demo</span>
            </div>
          </>
        )}
      </header>
      <div className="play-stage">
        {children}
        <div className="play-side">{side}</div>
      </div>
      <footer className="play-foot">
        <p>
          <LeafMark size={16} />
          Play for a little joy. Come together for a good cause.
        </p>
        <span>Free to play · Demo progress stays on this device</span>
      </footer>
      {preview ? null : (
        <div className="play-give">
          {view.canGive ? (
            <>
              <AmountPicker
                mode={campaign.donationMode}
                amounts={campaign.fixedAmounts}
                value={selected}
                customValue={custom}
                error={error}
                onSelect={(value) => {
                  setSelected(value)
                  setError('')
                }}
                onCustom={(value) => {
                  setCustom(value)
                  setError('')
                }}
              />
              <button type="button" className="btn btn-primary" onClick={continueGiving}>
                Continue to demo payment
              </button>
            </>
          ) : (
            <p>This campaign is not accepting simulated contributions right now. You can still play.</p>
          )}
        </div>
      )}
    </div>
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
