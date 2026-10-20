import { useState, type ReactNode } from 'react'
import { useDemoStore } from '../hooks/useDemoStore.ts'
import { formatINR } from '../lib/format.ts'
import { useOrgBase } from './org/OrgContext.tsx'
import { currentPlayer, leaderboard, listPlayers, referralLink, standing, type LeaderRow, type Player, type Standing } from '../lib/players.ts'

function useBoard(campaignId: string) {
  const store = useDemoStore()
  const players = listPlayers(campaignId)
  const gifts = store.contributions.filter((contribution) => contribution.campaignId === campaignId)
  const rows = leaderboard(players, gifts)
  const mine = currentPlayer(campaignId)
  return { players, rows, mine, place: standing(rows, mine?.id) }
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function pointsLabel(points: number): string {
  return points === 1 ? 'point' : 'points'
}

function placeLabel(rank: number): string {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return `${rank}th`
}

/** The current #1, shown with the page header so the group can see who to catch. */
export function RankBanner({ campaignId, contributeHref }: { campaignId: string; contributeHref?: string }) {
  const { rows, mine, place } = useBoard(campaignId)
  const leader = rows[0]
  if (!leader) return null
  const youLead = place?.rank === 1

  return (
    <section className="rank-banner" aria-label="Top rank">
      <div className="rank-banner-leader">
        <span className="rank-medal" aria-hidden="true">
          <Crown />
          <b>1</b>
        </span>
        <div className="rank-banner-copy">
          <span>{youLead ? 'Your rank' : 'Top rank'}</span>
          <strong>
            {leader.player.name}
            {youLead ? <em className="you-chip">You</em> : null}
          </strong>
        </div>
        <p className="rank-banner-points">
          <b>{leader.points.toLocaleString('en-IN')}</b>
          <span>{pointsLabel(leader.points)}</span>
        </p>
      </div>
      <p className="rank-nudge">
        <Nudge leader={leader} mine={mine} place={place} contributeHref={contributeHref} />
      </p>
    </section>
  )
}

function Nudge({
  leader,
  mine,
  place,
  contributeHref,
}: {
  leader: LeaderRow
  mine: Player | null
  place: Standing | null
  contributeHref?: string
}) {
  const climb = contributeHref ? <a href={contributeHref}>Contribute to move up</a> : <span>Contribute to move up.</span>
  if (!mine || !place) {
    return (
      <>
        {leader.player.name} is #1. Join with your name, then contribute to climb the board.
      </>
    )
  }
  if (place.rank === 1) {
    return <>You’re in first place. Another contribution keeps you ahead of the group.</>
  }
  if (place.behindLeader === 0) {
    return (
      <>
        You’re #{place.rank}, level with {leader.player.name}. One contribution puts you at #1.
      </>
    )
  }
  return (
    <>
      You’re #{place.rank}, {place.behindLeader.toLocaleString('en-IN')} {pointsLabel(place.behindLeader)} behind {leader.player.name}. {climb}
    </>
  )
}

export function Leaderboard({ campaignId, compact = false }: { campaignId: string; compact?: boolean }) {
  const { players, rows, mine } = useBoard(campaignId)
  const visible = compact ? rows.slice(0, 3) : rows
  const podium = visible.slice(0, 3)
  const rest = compact ? [] : rows.slice(3)
  const mineBelow = compact && mine ? rows.findIndex((row) => row.player.id === mine.id) : -1
  const pinned = mineBelow >= 3 ? rows[mineBelow] : null
  const [copied, setCopied] = useState(false)
  const base = useOrgBase()

  async function copyReferral() {
    if (!mine) return
    const link = referralLink(campaignId, mine.referralCode, base)
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
          <p className="leaderboard-kicker">Private group</p>
          <h2 id={`board-${campaignId}`}>Leadership board</h2>
        </div>
        <p className="leaderboard-count">
          <strong>{players.length}</strong>
          <span>{players.length === 1 ? 'player' : 'players'}</span>
        </p>
      </div>
      <p className="leaderboard-rule">
        1 point for every rupee you contribute, and the same points when someone contributes through your referral.
      </p>
      {mine ? (
        <div className="referral-card">
          <div>
            <span className="eyebrow-label">Your name</span>
            <strong>{mine.name}</strong>
          </div>
          <div>
            <span className="eyebrow-label">Your sharing link</span>
            <strong className="referral-code">{mine.referralCode}</strong>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void copyReferral()}>
            {copied ? 'Link copied.' : 'Copy my link'}
          </button>
        </div>
      ) : (
        <p className="leaderboard-join">Join with your name to get your own sharing link and a place on this board.</p>
      )}
      {rows.length === 0 ? (
        <p className="muted">No players yet.</p>
      ) : (
        <>
          <ol className="podium">
            {podium.map((row, index) => (
              <PodiumCard key={row.player.id} row={row} rank={index + 1} mine={row.player.id === mine?.id} />
            ))}
          </ol>
          {rest.length > 0 ? (
            <ol className="leader-list" start={4}>
              {rest.map((row, index) => (
                <LeaderRowView key={row.player.id} row={row} rank={index + 4} mine={row.player.id === mine?.id} />
              ))}
            </ol>
          ) : null}
          {pinned ? (
            <ol className="leader-list your-place" aria-label="Your place">
              <LeaderRowView row={pinned} rank={mineBelow + 1} mine />
            </ol>
          ) : null}
        </>
      )}
      {compact && rows.length > podium.length ? (
        <p className="muted small">Showing the top {podium.length}. The full board is on the campaign page.</p>
      ) : null}
    </section>
  )
}

function PodiumCard({ row, rank, mine }: { row: LeaderRow; rank: number; mine: boolean }) {
  return (
    <li className={`place-${rank}${mine ? ' mine' : ''}`}>
      <span className="place-tag">
        {rank === 1 ? <Crown /> : null}
        {placeLabel(rank)}
        {mine ? <em className="you-chip">You</em> : null}
      </span>
      <span className="avatar" aria-hidden="true">
        {initials(row.player.name)}
      </span>
      <strong className="podium-name">{row.player.name}</strong>
      <span className="podium-points">
        <b>{row.points.toLocaleString('en-IN')}</b> {pointsLabel(row.points)}
      </span>
      <span className="podium-meta">{referralSummary(row)}</span>
    </li>
  )
}

function LeaderRowView({ row, rank, mine }: { row: LeaderRow; rank: number; mine: boolean }) {
  return (
    <li className={mine ? 'mine' : ''}>
      <span className="rank" aria-hidden="true">
        {rank}
      </span>
      <span className="avatar avatar-sm" aria-hidden="true">
        {initials(row.player.name)}
      </span>
      <span className="leader-name">
        <strong>
          {row.player.name}
          {mine ? <em className="you-chip">You</em> : null}
        </strong>
        <span className="muted small">{referralSummary(row)}</span>
      </span>
      <span className="leader-points">
        <strong>{row.points.toLocaleString('en-IN')}</strong>
        <span className="muted small">{pointsLabel(row.points)}</span>
      </span>
    </li>
  )
}

function referralSummary(row: LeaderRow): string {
  if (row.referralCount === 0) return 'No gifts through their link yet'
  const gifts = row.referralCount === 1 ? '1 gift through their link' : `${row.referralCount} gifts through their link`
  return `${gifts} · ${formatINR(row.referralRupees)}`
}

function Crown(): ReactNode {
  return (
    <svg className="crown" viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2 14h20l-1.4-8.2-4.8 3.4L12 2 8.2 9.2 3.4 5.8 2 14z" />
    </svg>
  )
}
