import { formatMoney } from './format.ts'
import type { Campaign, GameContributionSettings, GameType } from './types.ts'

/** Integer minor units per whole amount. Game money is stored in minor units and formatted in the campaign currency. */
export const PAISE_PER_RUPEE = 100
export const MAX_CONTRIBUTION_PAISE = 10_000_000 * PAISE_PER_RUPEE

export interface GameContributionConfig {
  defaultRatePaise: number
  /** Singular and plural names for one completed action, e.g. plant / plants. */
  noun: string
  nounPlural: string
  continueLabel: string
  roundCompleteLabel: string
  roundSize: { default: number; min: number; max: number }
  roundSizeLabel: string
}

export const GAME_CONTRIBUTION_CONFIG: Record<GameType, GameContributionConfig> = {
  garden: {
    defaultRatePaise: 50 * PAISE_PER_RUPEE,
    noun: 'plant',
    nounPlural: 'plants',
    continueLabel: 'Plant another',
    roundCompleteLabel: 'Next garden bed',
    roundSize: { default: 3, min: 3, max: 3 },
    roundSizeLabel: 'Plots per garden bed',
  },
  puzzle: {
    defaultRatePaise: 25 * PAISE_PER_RUPEE,
    noun: 'correct piece',
    nounPlural: 'correct pieces',
    continueLabel: 'Continue puzzle',
    roundCompleteLabel: 'Play another puzzle',
    roundSize: { default: 4, min: 2, max: 8 },
    roundSizeLabel: 'Pieces to place per puzzle',
  },
  memory: {
    defaultRatePaise: 50 * PAISE_PER_RUPEE,
    noun: 'matched pair',
    nounPlural: 'matched pairs',
    continueLabel: 'Find another pair',
    roundCompleteLabel: 'Play another round',
    roundSize: { default: 6, min: 2, max: 6 },
    roundSizeLabel: 'Pairs per round',
  },
  jacket: {
    defaultRatePaise: 50 * PAISE_PER_RUPEE,
    noun: 'completed stage',
    nounPlural: 'completed stages',
    continueLabel: 'Keep zipping',
    roundCompleteLabel: 'Zip another jacket',
    roundSize: { default: 4, min: 4, max: 4 },
    roundSizeLabel: 'Zip stages per jacket',
  },
}

export function gameConfig(game: GameType): GameContributionConfig {
  return GAME_CONTRIBUTION_CONFIG[game] ?? GAME_CONTRIBUTION_CONFIG.garden
}

/** "plant", "piece", "pair", "stage": the action name without its qualifier. */
export function shortNoun(game: GameType): string {
  return gameConfig(game).noun.replace(/^(completed|correct|matched) /, '')
}

export const GAME_EXPLANATION =
  'Play to build a suggested contribution. You can stop anytime and review your amount before confirming. No payment is taken while you play.'

/** What each game action suggests, in one short sentence. */
export function gameActionAmounts(game: GameType, ratePaise: number): string {
  if (game === 'jacket') {
    return `Adding a lining or zipping the jacket suggests ${formatMoney(50)} each. A kindness tag suggests ${formatMoney(25)}.`
  }
  return `Each ${gameConfig(game).noun} suggests ${formatPaise(ratePaise)}.`
}

/**
 * The full amount rule a supporter sees before and while playing: the per-action suggestion, who
 * decides the final amount, and the giving limit when the organizer set one.
 */
export function gameAmountRules(game: GameType, settings: Pick<GameContributionSettings, 'ratePaise' | 'allowCustom' | 'capPaise'>): string[] {
  const lines = [gameActionAmounts(game, settings.ratePaise)]
  lines.push(settings.allowCustom ? 'Your final contribution is your choice.' : 'Your contribution is the amount the game suggests.')
  if (settings.capPaise != null) lines.push(`Suggestions stop at a giving limit of ${formatPaise(settings.capPaise)}.`)
  return lines
}

export function gameIntroSentence(game: GameType, ratePaise: number): string {
  if (game === 'jacket') {
    return `Add a warm lining and zip the jacket for ${formatMoney(50)} each, then attach a kindness tag for ${formatMoney(25)}. You can edit the total before confirming. Nothing is charged while playing.`
  }
  return `Each completed ${shortNoun(game)} adds ${formatPaise(ratePaise)} to your suggested contribution. You can edit the total before confirming. Nothing is charged while playing.`
}

export function defaultGameSettings(game: GameType): GameContributionSettings {
  const config = gameConfig(game)
  return {
    ratePaise: config.defaultRatePaise,
    actionsPerRound: config.roundSize.default,
    allowCustom: true,
    capPaise: null,
  }
}

function isPositivePaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_CONTRIBUTION_PAISE
}

/** Validates stored settings and fills gaps from the game's defaults. */
export function normalizeGameSettings(game: GameType, value: unknown): GameContributionSettings {
  const fallback = defaultGameSettings(game)
  if (!value || typeof value !== 'object') return fallback
  const raw = value as Partial<GameContributionSettings>
  const { min, max } = gameConfig(game).roundSize
  const rounds =
    typeof raw.actionsPerRound === 'number' && Number.isInteger(raw.actionsPerRound)
      ? Math.min(max, Math.max(min, raw.actionsPerRound))
      : fallback.actionsPerRound
  const ratePaise = isPositivePaise(raw.ratePaise) ? raw.ratePaise : fallback.ratePaise
  const capPaise = isPositivePaise(raw.capPaise) && raw.capPaise >= ratePaise ? raw.capPaise : null
  return {
    ratePaise,
    actionsPerRound: rounds,
    allowCustom: typeof raw.allowCustom === 'boolean' ? raw.allowCustom : fallback.allowCustom,
    capPaise,
  }
}

export function campaignGameSettings(campaign: Pick<Campaign, 'gameType' | 'gameSettings'>): GameContributionSettings {
  return normalizeGameSettings(campaign.gameType, campaign.gameSettings)
}

/* ---------- Money ---------- */

export function formatPaise(paise: number): string {
  const safe = Number.isFinite(paise) ? Math.round(paise) : 0
  const whole = safe % PAISE_PER_RUPEE === 0
  return formatMoney(safe / PAISE_PER_RUPEE, undefined, whole ? 0 : 2)
}

/** Converts what a supporter typed (₹, commas and up to two decimals allowed) into paise. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹$£€,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [rupees, fraction = ''] = cleaned.split('.')
  const paise = Number(rupees) * PAISE_PER_RUPEE + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(paise) || paise <= 0) return null
  return paise
}

/** Shows paise as an editable rupee string without the currency sign. */
export function paiseToInput(paise: number): string {
  const rupees = Math.floor(paise / PAISE_PER_RUPEE)
  const rest = paise % PAISE_PER_RUPEE
  return rest === 0 ? String(rupees) : `${rupees}.${String(rest).padStart(2, '0')}`
}

export function contributionRuleMessage(paise: number | null): string | null {
  if (paise == null) return 'Enter an amount like 150 or 150.50.'
  if (paise <= 0) return 'Enter an amount greater than zero.'
  if (paise > MAX_CONTRIBUTION_PAISE) return 'Choose a smaller demonstration amount.'
  return null
}

/* ---------- Pending session ledger ---------- */

export type SessionStatus = 'pending' | 'checkout' | 'confirmed' | 'cancelled'

export interface ActionRecord {
  id: string
  roundId: string
  amountPaise: number
  label: string
  at: string
}

export interface PendingSession {
  id: string
  campaignId: string
  gameId: GameType
  /** Snapshot of the campaign rules when the session started. */
  ratePaise: number
  capPaise: number | null
  allowCustom: boolean
  actions: ActionRecord[]
  suggestedPaise: number
  customPaise: number | null
  capReached: boolean
  status: SessionStatus
  createdAt: string
  updatedAt: string
}

export interface ClosedSession {
  id: string
  status: 'confirmed' | 'cancelled'
  suggestedPaise: number
  at: string
}

export interface GameLedger {
  version: 1
  campaignId: string
  gameId: GameType
  session: PendingSession | null
  /** Action IDs that were paid or discarded. They can never add to a new suggestion. */
  settledActionIds: string[]
  closed: ClosedSession[]
}

export function emptyLedger(campaignId: string, gameId: GameType): GameLedger {
  return { version: 1, campaignId, gameId, session: null, settledActionIds: [], closed: [] }
}

export type RecordOutcome = 'added' | 'capped' | 'duplicate'

export interface RecordResult {
  ledger: GameLedger
  outcome: RecordOutcome
  addedPaise: number
}

export function hasAction(ledger: GameLedger, actionId: string): boolean {
  return ledger.settledActionIds.includes(actionId) || Boolean(ledger.session?.actions.some((action) => action.id === actionId))
}

/**
 * Adds one completed action to the pending suggestion. Calling it again with the same
 * action ID, or with an ID that was already paid or discarded, leaves the totals unchanged.
 */
export function recordAction(
  ledger: GameLedger,
  input: { actionId: string; roundId: string; label: string; amountPaise?: number },
  settings: GameContributionSettings,
  now: Date = new Date(),
  makeId: () => string = () => crypto.randomUUID(),
): RecordResult {
  if (hasAction(ledger, input.actionId)) return { ledger, outcome: 'duplicate', addedPaise: 0 }
  const at = now.toISOString()
  const base: PendingSession =
    ledger.session ?? {
      id: makeId(),
      campaignId: ledger.campaignId,
      gameId: ledger.gameId,
      ratePaise: settings.ratePaise,
      capPaise: settings.capPaise,
      allowCustom: settings.allowCustom,
      actions: [],
      suggestedPaise: 0,
      customPaise: null,
      capReached: false,
      status: 'pending',
      createdAt: at,
      updatedAt: at,
    }
  const listPrice = isPositivePaise(input.amountPaise) ? input.amountPaise : base.ratePaise
  const room = base.capPaise == null ? listPrice : Math.max(0, base.capPaise - base.suggestedPaise)
  const amountPaise = Math.min(listPrice, room)
  const suggestedPaise = base.suggestedPaise + amountPaise
  const capReached = base.capPaise != null && suggestedPaise >= base.capPaise
  const session: PendingSession = {
    ...base,
    actions: [...base.actions, { id: input.actionId, roundId: input.roundId, amountPaise, label: input.label, at }],
    suggestedPaise,
    capReached,
    status: 'pending',
    updatedAt: at,
  }
  return {
    ledger: { ...ledger, session },
    outcome: amountPaise < listPrice ? 'capped' : 'added',
    addedPaise: amountPaise,
  }
}

export function selectedPaise(session: PendingSession | null): number {
  if (!session) return 0
  return session.customPaise ?? session.suggestedPaise
}

export function isCustom(session: PendingSession | null): boolean {
  return session?.customPaise != null
}

/**
 * Saves a supporter-chosen total that stays fixed while the suggestion grows.
 * Passing null returns to automatic mode, where the chosen total follows the suggestion.
 */
/**
 * Raises this play session’s giving limit by one action amount after the supporter agrees.
 * The organizer’s campaign setting is left unchanged, and a second press does nothing until
 * play reaches the new limit.
 */
export function raiseGivingLimit(ledger: GameLedger, now: Date = new Date()): GameLedger {
  const session = ledger.session
  if (!session || session.capPaise == null || !session.capReached) return ledger
  const capPaise = session.capPaise + session.ratePaise
  return {
    ...ledger,
    session: {
      ...session,
      capPaise,
      capReached: session.suggestedPaise >= capPaise,
      updatedAt: now.toISOString(),
    },
  }
}

export function setCustomAmount(ledger: GameLedger, paise: number | null, now: Date = new Date()): GameLedger {
  const session = ledger.session
  if (!session) return ledger
  if (paise != null && (!session.allowCustom || !isPositivePaise(paise))) return ledger
  if (paise === session.customPaise) return ledger
  return { ...ledger, session: { ...session, customPaise: paise, updatedAt: now.toISOString() } }
}

function closeSession(ledger: GameLedger, status: 'confirmed' | 'cancelled', now: Date): GameLedger {
  const session = ledger.session
  if (!session) return ledger
  const settled = new Set(ledger.settledActionIds)
  for (const action of session.actions) settled.add(action.id)
  return {
    ...ledger,
    session: null,
    settledActionIds: [...settled],
    closed: [{ id: session.id, status, suggestedPaise: session.suggestedPaise, at: now.toISOString() }, ...ledger.closed].slice(0, 20),
  }
}

/** Discards the pending suggestion. Its actions stay settled so they are never added again. */
export function cancelSession(ledger: GameLedger, now: Date = new Date()): GameLedger {
  return closeSession(ledger, 'cancelled', now)
}

export function beginCheckout(ledger: GameLedger, sessionId: string, now: Date = new Date()): GameLedger {
  const session = ledger.session
  if (!session || session.id !== sessionId) return ledger
  return { ...ledger, session: { ...session, status: 'checkout', updatedAt: now.toISOString() } }
}

/** Returns a session from checkout to play after a cancelled or failed payment. */
export function returnToPending(ledger: GameLedger, sessionId?: string, now: Date = new Date()): GameLedger {
  const session = ledger.session
  if (!session || session.status !== 'checkout') return ledger
  if (sessionId && session.id !== sessionId) return ledger
  return { ...ledger, session: { ...session, status: 'pending', updatedAt: now.toISOString() } }
}

export function settleConfirmed(ledger: GameLedger, sessionId: string, now: Date = new Date()): GameLedger {
  if (!ledger.session || ledger.session.id !== sessionId) return ledger
  return closeSession(ledger, 'confirmed', now)
}

export function actionBreakdown(session: PendingSession, config: GameContributionConfig): string {
  const count = session.actions.length
  const prices = new Set(session.actions.map((action) => action.amountPaise))
  if (prices.size > 1) return `${count} ${count === 1 ? 'care action' : 'care actions'}`
  const noun = count === 1 ? config.noun : config.nounPlural
  return `${count} ${noun} × ${formatPaise(session.actions[0]?.amountPaise ?? session.ratePaise)}`
}

/* ---------- Validation for stored ledgers ---------- */

function isAction(value: unknown): value is ActionRecord {
  if (!value || typeof value !== 'object') return false
  const action = value as ActionRecord
  return (
    typeof action.id === 'string' &&
    typeof action.roundId === 'string' &&
    typeof action.label === 'string' &&
    typeof action.at === 'string' &&
    Number.isSafeInteger(action.amountPaise) &&
    action.amountPaise >= 0
  )
}

function parseSession(value: unknown, campaignId: string, gameId: GameType): PendingSession | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as PendingSession
  if (typeof raw.id !== 'string' || raw.campaignId !== campaignId || raw.gameId !== gameId) return null
  if (!isPositivePaise(raw.ratePaise)) return null
  if (!Array.isArray(raw.actions) || !raw.actions.every(isAction) || raw.actions.length === 0) return null
  const suggestedPaise = raw.actions.reduce((sum, action) => sum + action.amountPaise, 0)
  const capPaise = isPositivePaise(raw.capPaise) ? raw.capPaise : null
  const customPaise = isPositivePaise(raw.customPaise) && raw.allowCustom !== false ? raw.customPaise : null
  return {
    id: raw.id,
    campaignId,
    gameId,
    ratePaise: raw.ratePaise,
    capPaise,
    allowCustom: raw.allowCustom !== false,
    actions: raw.actions,
    suggestedPaise,
    customPaise,
    capReached: capPaise != null && suggestedPaise >= capPaise,
    status: raw.status === 'checkout' ? 'checkout' : 'pending',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
  }
}

export function parseLedger(value: unknown, campaignId: string, gameId: GameType): GameLedger {
  if (!value || typeof value !== 'object') return emptyLedger(campaignId, gameId)
  const raw = value as Partial<GameLedger>
  const settled = Array.isArray(raw.settledActionIds)
    ? raw.settledActionIds.filter((item): item is string => typeof item === 'string')
    : []
  const closed = Array.isArray(raw.closed)
    ? raw.closed.filter(
        (item): item is ClosedSession =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as ClosedSession).id === 'string' &&
          ((item as ClosedSession).status === 'confirmed' || (item as ClosedSession).status === 'cancelled'),
      )
    : []
  return {
    version: 1,
    campaignId,
    gameId,
    session: parseSession(raw.session, campaignId, gameId),
    settledActionIds: settled,
    closed,
  }
}
