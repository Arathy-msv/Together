import { useState } from 'react'
import { useDemoStore } from '../hooks/useDemoStore.ts'
import { formatINR } from '../lib/format.ts'
import { currentPlayer, leaderboard, listPlayers, referralLink } from '../lib/players.ts'

export function Leaderboard({ campaignId, compact = false }: { campaignId: string; compact?: boolean }) {
  const store = useDemoStore()
  const players = listPlayers(campaignId)
  const gifts = store.contributions.filter((contribution) => contribution.campaignId === campaignId)
  const rows = leaderboard(players, gifts)
  const mine = currentPlayer(campaignId)
  const visible = compact ? rows.slice(0, 5) : rows
  const [copied, setCopied] = useState(false)

  async function copyReferral() {
    if (!mine) return
    const link = referralLink(campaignId, mine.referralCode)
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const area = document.createElement('textarea')
      area.value = link
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className={compact ? 'leaderboard compact' : 'panel leaderboard'} aria-labelledby={`board-${campaignId}`}>
      <div className="leaderboard-head">
        <div>
          <h2 id={`board-${campaignId}`}>Leadership board</h2>
          <p className="muted small">
            {players.length === 1 ? '1 player' : `${players.length} players`} in this private group. You earn 1 point for every rupee you
            contribute, and the same points when someone contributes through your referral.
          </p>
        </div>
      </div>
      {mine ? (
        <div className="referral-card">
          <div>
            <span className="eyebrow-label">Your name</span>
            <strong>{mine.name}</strong>
          </div>
          <div>
            <span className="eyebrow-label">Your referral</span>
            <strong className="referral-code">{mine.referralCode}</strong>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void copyReferral()}>
            {copied ? 'Link copied' : 'Copy referral link'}
          </button>
        </div>
      ) : (
        <p className="muted small">Join with your name to get a referral and a place on this board.</p>
      )}
      {rows.length === 0 ? (
        <p className="muted">No players yet.</p>
      ) : (
        <ol className="leader-list">
          {visible.map((row, index) => (
            <li key={row.player.id} className={row.player.id === mine?.id ? 'mine' : ''}>
              <span className="rank" aria-hidden="true">
                {index + 1}
              </span>
              <span className="leader-name">
                <strong>{row.player.name}</strong>
                <span className="muted small">
                  {row.referralCount === 0
                    ? 'No referral gifts yet'
                    : `${row.referralCount === 1 ? '1 referral gift' : `${row.referralCount} referral gifts`} · ${formatINR(row.referralRupees)}`}
                </span>
              </span>
              <span className="leader-points">
                <strong>{row.points}</strong>
                <span className="muted small">{row.points === 1 ? 'point' : 'points'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {compact && rows.length > visible.length ? (
        <p className="muted small">Showing the top {visible.length}. The full board is on the campaign page.</p>
      ) : null}
    </section>
  )
}
