import type { Contribution } from './types.ts'

const PLAYERS_KEY = 'together.players.v1'
const CURRENT_KEY = 'together.currentPlayer.v1'
const REFERRAL_KEY = 'together.referralIntent.v1'

export interface Player {
  id: string
  campaignId: string
  name: string
  referralCode: string
  createdAt: string
}

export interface LeaderRow {
  player: Player
  /** One point for every rupee they gave, plus every rupee given through their referral. */
  points: number
  ownRupees: number
  referralRupees: number
  referralCount: number
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Keep the in-memory result if the browser cannot store it.
  }
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== 'object') return false
  const player = value as Player
  return (
    typeof player.id === 'string' &&
    typeof player.campaignId === 'string' &&
    typeof player.name === 'string' &&
    player.name.trim().length >= 2 &&
    typeof player.referralCode === 'string' &&
    player.referralCode.length >= 4 &&
    typeof player.createdAt === 'string'
  )
}

function readPlayers(): Player[] {
  const parsed = readJson(PLAYERS_KEY)
  return Array.isArray(parsed) ? parsed.filter(isPlayer) : []
}

function savePlayers(players: Player[]): void {
  writeJson(PLAYERS_KEY, players)
}

export function listPlayers(campaignId: string): Player[] {
  return readPlayers()
    .filter((player) => player.campaignId === campaignId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function clearPlayers(campaignId?: string): void {
  if (!campaignId) {
    try {
      localStorage.removeItem(PLAYERS_KEY)
      localStorage.removeItem(CURRENT_KEY)
      localStorage.removeItem(REFERRAL_KEY)
    } catch {
      // Ignore blocked storage.
    }
    return
  }
  savePlayers(readPlayers().filter((player) => player.campaignId !== campaignId))
  const current = readMap(CURRENT_KEY)
  delete current[campaignId]
  writeJson(CURRENT_KEY, current)
  const referrals = readMap(REFERRAL_KEY)
  delete referrals[campaignId]
  writeJson(REFERRAL_KEY, referrals)
}

function readMap(key: string): Record<string, string> {
  const parsed = readJson(key)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function referralCode(existing: Player[]): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = new Set(existing.map((player) => player.referralCode))
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = ''
    for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)]
    if (!used.has(code)) return code
  }
  return `P${Date.now().toString(36).toUpperCase()}`.slice(0, 8)
}

export function cleanPlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 40)
}

/** Remembers a player by name. The same name in a private group is the same player. */
export function joinPlayer(campaignId: string, rawName: string, now = new Date()): Player | null {
  const name = cleanPlayerName(rawName)
  if (name.length < 2) return null
  const players = readPlayers()
  const existing = players.find(
    (player) => player.campaignId === campaignId && player.name.toLowerCase() === name.toLowerCase(),
  )
  const player =
    existing ??
    ({
      id: crypto.randomUUID(),
      campaignId,
      name,
      referralCode: referralCode(players),
      createdAt: now.toISOString(),
    } satisfies Player)
  if (!existing) savePlayers([...players, player])
  const current = readMap(CURRENT_KEY)
  current[campaignId] = player.id
  writeJson(CURRENT_KEY, current)
  return player
}

export function currentPlayer(campaignId: string): Player | null {
  const id = readMap(CURRENT_KEY)[campaignId]
  return id ? (readPlayers().find((player) => player.id === id && player.campaignId === campaignId) ?? null) : null
}

export function rememberReferral(campaignId: string, code: string): void {
  const cleaned = code.trim().toUpperCase()
  if (cleaned.length < 4) return
  const map = readMap(REFERRAL_KEY)
  map[campaignId] = cleaned
  writeJson(REFERRAL_KEY, map)
}

/** A stored referral that belongs to a different player in this private group. */
export function activeReferral(campaignId: string, playerId?: string): string | undefined {
  const code = readMap(REFERRAL_KEY)[campaignId]
  if (!code) return undefined
  const owner = readPlayers().find((player) => player.campaignId === campaignId && player.referralCode === code)
  if (!owner || owner.id === playerId) return undefined
  return owner.referralCode
}

function rupees(contributions: Contribution[]): number {
  return contributions.reduce((sum, contribution) => sum + (Number.isFinite(contribution.amount) ? contribution.amount : 0), 0)
}

/**
 * Ranks a private group's named players.
 * Points equal the rupees they contributed plus the rupees given through their referral.
 */
export function leaderboard(players: Player[], contributions: Contribution[]): LeaderRow[] {
  const successful = contributions.filter((contribution) => contribution.status === 'success')
  return players
    .map((player) => {
      const own = successful.filter((contribution) => contribution.playerId === player.id)
      const referred = successful.filter(
        (contribution) => contribution.referralCode === player.referralCode && contribution.playerId !== player.id,
      )
      const ownRupees = rupees(own)
      const referralRupees = rupees(referred)
      return {
        player,
        points: ownRupees + referralRupees,
        ownRupees,
        referralRupees,
        referralCount: referred.length,
      }
    })
    .sort((a, b) => b.points - a.points || a.player.name.localeCompare(b.player.name))
}

export interface Standing {
  rank: number
  row: LeaderRow
  leader: LeaderRow
  /** Points between this player and the current #1. Zero when they lead or are level on points. */
  behindLeader: number
}

/** Where a player sits against the current #1. */
export function standing(rows: LeaderRow[], playerId?: string): Standing | null {
  if (!playerId || rows.length === 0) return null
  const index = rows.findIndex((row) => row.player.id === playerId)
  if (index < 0) return null
  const row = rows[index]
  const leader = rows[0]
  return {
    rank: index + 1,
    row,
    leader,
    behindLeader: Math.max(0, leader.points - row.points),
  }
}

const SAMPLE_PLAYERS: Player[] = [
  {
    id: 'player_asha',
    campaignId: 'cmp_circle',
    name: 'Asha Menon',
    referralCode: 'ASHA01',
    createdAt: '2026-10-12T09:00:00.000Z',
  },
  {
    id: 'player_rohan',
    campaignId: 'cmp_circle',
    name: 'Rohan Iyer',
    referralCode: 'ROHAN1',
    createdAt: '2026-10-13T09:00:00.000Z',
  },
  {
    id: 'player_meera',
    campaignId: 'cmp_circle',
    name: 'Meera Shah',
    referralCode: 'MEERA1',
    createdAt: '2026-10-14T09:00:00.000Z',
  },
]

/** Adds the sample Class Circle roster once, so a fresh or restored demo has named players. */
export function ensureSampleRoster(campaignIds: string[]): void {
  if (!campaignIds.includes('cmp_circle')) return
  const players = readPlayers()
  if (players.some((player) => player.campaignId === 'cmp_circle')) return
  savePlayers([...players, ...SAMPLE_PLAYERS])
}

export function referralLink(campaignId: string, code: string, base = ''): string {
  const path = `${base}/campaigns/${campaignId}?ref=${encodeURIComponent(code)}`
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`
}
