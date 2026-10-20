import { PAISE_PER_RUPEE } from './gameContribution.ts'

export const WARMTH_ACTIONS = [
  { id: 'lining', label: 'Add warm lining', pricePaise: 50 * PAISE_PER_RUPEE },
  { id: 'zip', label: 'Zip jacket', pricePaise: 50 * PAISE_PER_RUPEE },
  { id: 'tag', label: 'Attach kindness tag', pricePaise: 25 * PAISE_PER_RUPEE },
] as const

export type WarmthActionId = (typeof WARMTH_ACTIONS)[number]['id']
export type JacketColor = 'navy' | 'forest' | 'coral'

export const JACKET_COLORS: { id: JacketColor; label: string; swatch: string }[] = [
  { id: 'navy', label: 'Navy', swatch: '#1c2c4a' },
  { id: 'forest', label: 'Forest', swatch: '#1f4a34' },
  { id: 'coral', label: 'Coral', swatch: '#d98978' },
]

export const WARMTH_QUICK_RUPEES = [50, 100, 125, 250]

export function warmthAction(id: WarmthActionId) {
  return WARMTH_ACTIONS.find((action) => action.id === id) ?? WARMTH_ACTIONS[0]
}

export function warmthTotal(done: readonly WarmthActionId[]): number {
  return WARMTH_ACTIONS.filter((action) => done.includes(action.id)).reduce((sum, action) => sum + action.pricePaise, 0)
}

/** The next paid action. Colour is free and is not part of this list. */
export function nextWarmthAction(done: readonly WarmthActionId[]): WarmthActionId | null {
  return WARMTH_ACTIONS.find((action) => !done.includes(action.id))?.id ?? null
}

export function isJacketColor(value: unknown): value is JacketColor {
  return value === 'navy' || value === 'forest' || value === 'coral'
}

export function jacketImage(color: JacketColor, kind: 'open' | 'zipped' | 'lining' | 'folded'): string {
  if (color === 'navy' && kind === 'open') return '/games/jacket-open.jpg'
  if (color === 'navy' && kind === 'zipped') return '/games/jacket-zipped.jpg'
  return `/games/warmth/jacket-${color}-${kind}.jpg`
}

export function jacketColorFromDetail(detail?: string): JacketColor | null {
  const match = detail?.match(/colour (navy|forest|coral)/)
  return match && isJacketColor(match[1]) ? match[1] : null
}

export interface WarmthProgress {
  roundId: string
  color: JacketColor
}

export function parseWarmthProgress(value: unknown): WarmthProgress | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as WarmthProgress
  if (typeof raw.roundId !== 'string' || raw.roundId.length < 4 || !isJacketColor(raw.color)) return null
  return { roundId: raw.roundId, color: raw.color }
}
