import { emptyLedger, parseLedger, type GameLedger } from './gameContribution.ts'
import type { GameType } from './types.ts'

const LEDGER_KEY = 'together.gameLedger.v1'
const PROGRESS_KEY = 'together.gameProgress.v1'

const slot = (campaignId: string, gameId: GameType) => `${campaignId}::${gameId}`

function readMap(key: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function writeMap(key: string, map: Record<string, unknown>): void {
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    // Storage full or blocked: keep playing with in-memory state.
  }
}

export function readLedger(campaignId: string, gameId: GameType): GameLedger {
  const map = readMap(LEDGER_KEY)
  const entry = map[slot(campaignId, gameId)]
  return entry ? parseLedger(entry, campaignId, gameId) : emptyLedger(campaignId, gameId)
}

export function writeLedger(ledger: GameLedger): void {
  const map = readMap(LEDGER_KEY)
  map[slot(ledger.campaignId, ledger.gameId)] = ledger
  writeMap(LEDGER_KEY, map)
}

export function readProgress<T>(campaignId: string, gameId: GameType, parse: (value: unknown) => T | null): T | null {
  const entry = readMap(PROGRESS_KEY)[slot(campaignId, gameId)]
  if (entry === undefined) return null
  try {
    return parse(entry)
  } catch {
    return null
  }
}

export function writeProgress(campaignId: string, gameId: GameType, value: unknown): void {
  const map = readMap(PROGRESS_KEY)
  map[slot(campaignId, gameId)] = value
  writeMap(PROGRESS_KEY, map)
}

/** Removes pending game sessions and saved game progress for one campaign, or for all campaigns. */
export function clearGameData(campaignId?: string): void {
  for (const key of [LEDGER_KEY, PROGRESS_KEY]) {
    if (!campaignId) {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore blocked storage.
      }
      continue
    }
    const map = readMap(key)
    for (const entry of Object.keys(map)) {
      if (entry.startsWith(`${campaignId}::`)) delete map[entry]
    }
    writeMap(key, map)
  }
}

export function newRoundId(): string {
  return `round-${crypto.randomUUID()}`
}
