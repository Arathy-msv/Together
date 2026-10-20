import { PAISE_PER_RUPEE, formatPaise } from './gameContribution.ts'

/**
 * Grow a Giving Tree: personal care actions add priced items to a suggested-contribution
 * cart. Nothing here touches campaign totals; only a confirmed contribution does that.
 * Money is integer paise.
 */

export type CareKind = 'seed' | 'water' | 'fertilizer' | 'sun'

export interface CareAction {
  kind: CareKind
  label: string
  /** Name used in the cart, e.g. "Water". */
  item: string
  pricePaise: number
  points: number
  /** Short hint under a toolbar card. */
  hint: string
  /** Caption shown after the action completes. */
  done: string
  /** Caption when this is the recommended next step. */
  next: string
}

export const CARE_ORDER: CareKind[] = ['seed', 'water', 'fertilizer', 'sun']

export const CARE_ACTIONS: Record<CareKind, CareAction> = {
  seed: {
    kind: 'seed',
    label: 'Plant seed',
    item: 'Plant seed',
    pricePaise: 25 * PAISE_PER_RUPEE,
    points: 10,
    hint: 'Start your plant',
    done: 'Seed planted',
    next: 'Plant a seed',
  },
  water: {
    kind: 'water',
    label: 'Water',
    item: 'Water',
    pricePaise: 50 * PAISE_PER_RUPEE,
    points: 20,
    hint: 'Keeps it growing',
    done: 'Seedling watered',
    next: 'Water the seedling',
  },
  fertilizer: {
    kind: 'fertilizer',
    label: 'Fertilizer',
    item: 'Fertilizer',
    pricePaise: 75 * PAISE_PER_RUPEE,
    points: 30,
    hint: 'Helps it grow stronger',
    done: 'Fertilizer added',
    next: 'Add fertilizer',
  },
  sun: {
    kind: 'sun',
    label: 'Sunlight',
    item: 'Sunlight',
    pricePaise: 25 * PAISE_PER_RUPEE,
    points: 10,
    hint: 'Helps it stay healthy',
    done: 'Sunlight given',
    next: 'Give sunlight',
  },
}

export interface CareRecord {
  id: string
  kind: CareKind
  pricePaise: number
  points: number
  at: string
}

export interface ConfirmedGift {
  contributionId: string
  amountPaise: number
  suggestedPaise: number
  at: string
}

export interface GivingTreeState {
  version: 1
  campaignId: string
  /** Identifies this supporter's personal plant; action IDs are scoped to it. */
  plantId: string
  seedPlanted: boolean
  /** Personal care points. They stay after a contribution is confirmed. */
  carePoints: number
  careCounts: Record<CareKind, number>
  cart: CareRecord[]
  /** Supporter-chosen final amount. Null follows the game suggestion. */
  chosenPaise: number | null
  /** Contribution ID reserved for the current cart, so a repeated confirm cannot pay twice. */
  checkoutId: string
  /** Action IDs that were paid or cleared. They can never be added again. */
  settledIds: string[]
  lastConfirmed: ConfirmedGift | null
}

const zeroCounts = (): Record<CareKind, number> => ({ seed: 0, water: 0, fertilizer: 0, sun: 0 })

export function newGivingTree(campaignId: string, makeId: () => string = randomId): GivingTreeState {
  return {
    version: 1,
    campaignId,
    plantId: `plant-${makeId()}`,
    seedPlanted: false,
    carePoints: 0,
    careCounts: zeroCounts(),
    cart: [],
    chosenPaise: null,
    checkoutId: `gt-${makeId()}`,
    settledIds: [],
    lastConfirmed: null,
  }
}

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function canCare(state: GivingTreeState, kind: CareKind): boolean {
  return kind === 'seed' ? !state.seedPlanted : state.seedPlanted
}

/** The ID the next completed action of this kind will use. */
export function nextActionId(state: GivingTreeState, kind: CareKind): string {
  return `${state.plantId}:${kind}:${state.careCounts[kind] + 1}`
}

export function hasCare(state: GivingTreeState, actionId: string): boolean {
  return state.settledIds.includes(actionId) || state.cart.some((record) => record.id === actionId)
}

export type CareOutcome = 'added' | 'duplicate' | 'blocked'

/** Adds one completed care action. Repeating the same action ID leaves everything unchanged. */
export function recordCare(
  state: GivingTreeState,
  kind: CareKind,
  actionId: string,
  now: Date = new Date(),
): { state: GivingTreeState; outcome: CareOutcome } {
  if (hasCare(state, actionId)) return { state, outcome: 'duplicate' }
  if (!canCare(state, kind)) return { state, outcome: 'blocked' }
  const action = CARE_ACTIONS[kind]
  const record: CareRecord = { id: actionId, kind, pricePaise: action.pricePaise, points: action.points, at: now.toISOString() }
  return {
    outcome: 'added',
    state: {
      ...state,
      seedPlanted: state.seedPlanted || kind === 'seed',
      carePoints: state.carePoints + action.points,
      careCounts: { ...state.careCounts, [kind]: state.careCounts[kind] + 1 },
      cart: [...state.cart, record],
    },
  }
}

export function suggestedPaise(state: GivingTreeState): number {
  return state.cart.reduce((sum, record) => sum + record.pricePaise, 0)
}

export function chosenAmountPaise(state: GivingTreeState): number {
  return state.chosenPaise ?? suggestedPaise(state)
}

export interface CartLine {
  kind: CareKind
  item: string
  quantity: number
  unitPaise: number
  totalPaise: number
}

export function cartLines(state: GivingTreeState): CartLine[] {
  return CARE_ORDER.flatMap((kind) => {
    const records = state.cart.filter((record) => record.kind === kind)
    if (records.length === 0) return []
    const totalPaise = records.reduce((sum, record) => sum + record.pricePaise, 0)
    return [{ kind, item: CARE_ACTIONS[kind].item, quantity: records.length, unitPaise: CARE_ACTIONS[kind].pricePaise, totalPaise }]
  })
}

/** Recommends the least-practised care after planting: water, then fertilizer, then sunlight. */
export function recommendedCare(state: GivingTreeState): CareKind {
  if (!state.seedPlanted) return 'seed'
  const options: CareKind[] = ['water', 'fertilizer', 'sun']
  return options.reduce((best, kind) => (state.careCounts[kind] < state.careCounts[best] ? kind : best), options[0])
}

/** -1 before planting, then 0 (seed) to 4 (lush young plant). */
export function plantStage(state: Pick<GivingTreeState, 'seedPlanted' | 'carePoints'>): number {
  if (!state.seedPlanted) return -1
  if (state.carePoints >= 90) return 4
  if (state.carePoints >= 60) return 3
  if (state.carePoints >= 30) return 2
  return 1
}

export const TREE_MILESTONES = [
  { percent: 0, name: 'Seed' },
  { percent: 20, name: 'Sprout' },
  { percent: 40, name: 'Young plant' },
  { percent: 60, name: 'Small tree' },
  { percent: 80, name: 'Leafy flowering tree' },
  { percent: 100, name: 'Fully grown tree' },
] as const

/** Campaign progress to one decimal place, e.g. 37 or 37.2. */
export function campaignPercent(raised: number, goal: number): number {
  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) return 0
  return Math.min(100, Math.floor((raised / goal) * 1000 + 1e-9) / 10)
}

/** Shared tree stage from confirmed campaign money only. Pending cart money never counts. */
export function treeStage(raised: number, goal: number): number {
  const percent = campaignPercent(raised, goal)
  let stage = 0
  TREE_MILESTONES.forEach((milestone, index) => {
    if (percent >= milestone.percent) stage = index
  })
  return stage
}

/**
 * How far this visit's care has grown the one tree.
 * The fully grown stage is kept for the moment the campaign reaches its goal.
 */
export function careTreeStage(state: Pick<GivingTreeState, 'seedPlanted' | 'carePoints'>): number {
  if (!state.seedPlanted) return 0
  if (state.carePoints >= 70) return 4
  if (state.carePoints >= 60) return 3
  if (state.carePoints >= 30) return 2
  return 1
}

/** The tree on screen. Care can grow it, and confirmed campaign progress never shrinks it. */
export function visibleTreeStage(
  campaignStage: number,
  state: Pick<GivingTreeState, 'seedPlanted' | 'carePoints'>,
  goalMet: boolean,
): number {
  const last = TREE_MILESTONES.length - 1
  if (goalMet) return last
  const cared = state.seedPlanted ? careTreeStage(state) : 0
  return Math.min(last, Math.max(0, campaignStage, cared))
}

export function formatPercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`
}

/** Saves a chosen final amount. Pass null to follow the suggestion again. */
export function chooseAmount(state: GivingTreeState, paise: number | null): GivingTreeState {
  if (paise != null && (!Number.isSafeInteger(paise) || paise <= 0)) return state
  return { ...state, chosenPaise: paise }
}

function settleCart(state: GivingTreeState, makeId: () => string): GivingTreeState {
  const settled = new Set(state.settledIds)
  for (const record of state.cart) settled.add(record.id)
  return { ...state, cart: [], chosenPaise: null, checkoutId: `gt-${makeId()}`, settledIds: [...settled] }
}

/** Settles the cart after a confirmed contribution. Care points are kept. */
export function confirmCart(
  state: GivingTreeState,
  contributionId: string,
  amountPaise: number,
  now: Date = new Date(),
  makeId: () => string = randomId,
): GivingTreeState {
  if (contributionId !== state.checkoutId || state.cart.length === 0) return state
  const suggested = suggestedPaise(state)
  return {
    ...settleCart(state, makeId),
    lastConfirmed: { contributionId, amountPaise, suggestedPaise: suggested, at: now.toISOString() },
  }
}

/** Discards the suggestion. Its actions stay settled so they cannot be re-added. */
export function clearCart(state: GivingTreeState, makeId: () => string = randomId): GivingTreeState {
  if (state.cart.length === 0) return { ...state, chosenPaise: null }
  return settleCart(state, makeId)
}

/** Final amounts are whole rupees between ₹1 and ₹10,00,000. */
export const MAX_GIFT_PAISE = 1_000_000 * PAISE_PER_RUPEE

export function parseGiftAmount(input: string): { paise: number | null; error: string | null } {
  const cleaned = input.replace(/[₹,\s]/g, '')
  if (cleaned === '') return { paise: null, error: 'Enter an amount to contribute.' }
  if (!/^\d+$/.test(cleaned)) return { paise: null, error: 'Enter a whole rupee amount, like 100.' }
  const paise = Number(cleaned) * PAISE_PER_RUPEE
  if (!Number.isSafeInteger(paise) || paise <= 0) return { paise: null, error: 'Enter an amount greater than zero.' }
  if (paise > MAX_GIFT_PAISE) return { paise: null, error: `For this demo, choose ${formatPaise(MAX_GIFT_PAISE)} or less.` }
  return { paise, error: null }
}

/* ---------- Stored state validation ---------- */

function isKind(value: unknown): value is CareKind {
  return value === 'seed' || value === 'water' || value === 'fertilizer' || value === 'sun'
}

function isRecord(value: unknown): value is CareRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as CareRecord
  return (
    typeof record.id === 'string' &&
    isKind(record.kind) &&
    Number.isSafeInteger(record.pricePaise) &&
    record.pricePaise >= 0 &&
    Number.isSafeInteger(record.points) &&
    typeof record.at === 'string'
  )
}

const count = (value: unknown) => (Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : 0)

export function parseGivingTree(value: unknown, campaignId: string): GivingTreeState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<GivingTreeState>
  if (raw.version !== 1 || raw.campaignId !== campaignId) return null
  if (typeof raw.plantId !== 'string' || typeof raw.checkoutId !== 'string') return null
  const cart = Array.isArray(raw.cart) ? raw.cart.filter(isRecord) : []
  const counts = zeroCounts()
  for (const kind of CARE_ORDER) counts[kind] = count(raw.careCounts?.[kind])
  const confirmed = raw.lastConfirmed
  return {
    version: 1,
    campaignId,
    plantId: raw.plantId,
    seedPlanted: Boolean(raw.seedPlanted) || counts.seed > 0,
    carePoints: count(raw.carePoints),
    careCounts: counts,
    cart,
    chosenPaise: Number.isSafeInteger(raw.chosenPaise) && (raw.chosenPaise as number) > 0 ? (raw.chosenPaise as number) : null,
    checkoutId: raw.checkoutId,
    settledIds: Array.isArray(raw.settledIds) ? raw.settledIds.filter((id): id is string => typeof id === 'string') : [],
    lastConfirmed:
      confirmed && typeof confirmed === 'object' && typeof confirmed.contributionId === 'string'
        ? {
            contributionId: confirmed.contributionId,
            amountPaise: count(confirmed.amountPaise),
            suggestedPaise: count(confirmed.suggestedPaise),
            at: typeof confirmed.at === 'string' ? confirmed.at : new Date(0).toISOString(),
          }
        : null,
  }
}
