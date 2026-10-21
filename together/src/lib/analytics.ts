const KEY = 'together.demo.analytics.v1'

export type JourneyEvent =
  | 'campaign_viewed'
  | 'giving_mode_selected'
  | 'game_started'
  | 'review_opened'
  | 'contribution_confirmed'
  | 'sharing_page_created'
  | 'update_viewed'
  | 'voucher_claimed'
  | 'voucher_redeemed'

export interface JourneyRecord {
  id: string
  event: JourneyEvent
  at: string
  campaignId?: string
  mode?: 'direct' | 'game' | 'sponsor'
}

interface AnalyticsState {
  paused: boolean
  sessionId: string
  events: JourneyRecord[]
}

function empty(): AnalyticsState {
  return { paused: false, sessionId: crypto.randomUUID(), events: [] }
}

function read(): AnalyticsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<AnalyticsState>
    if (!parsed || !Array.isArray(parsed.events)) return empty()
    return { paused: Boolean(parsed.paused), sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : crypto.randomUUID(), events: parsed.events.filter((item) => item && typeof item.event === 'string').slice(-500) }
  } catch {
    return empty()
  }
}

function write(state: AnalyticsState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

/** Demo-only journey counts. Stores no free text, voucher codes, or supporter details. */
export function trackJourney(event: JourneyEvent, extra: { campaignId?: string; mode?: JourneyRecord['mode'] } = {}) {
  const state = read()
  if (state.paused) return
  state.events.push({ id: crypto.randomUUID(), event, at: new Date().toISOString(), campaignId: extra.campaignId, mode: extra.mode })
  if (state.events.length > 500) state.events = state.events.slice(-500)
  write(state)
}

export function setAnalyticsPaused(paused: boolean) {
  const state = read()
  state.paused = paused
  write(state)
}

export function analyticsPaused(): boolean {
  return read().paused
}

export function clearAnalytics() {
  const state = read()
  write({ paused: state.paused, sessionId: crypto.randomUUID(), events: [] })
}

export function analyticsSummary(windowDays = 30) {
  const state = read()
  const cutoff = Date.now() - windowDays * 86_400_000
  const recent = state.events.filter((item) => Date.parse(item.at) >= cutoff)
  const count = (event: JourneyEvent, mode?: JourneyRecord['mode']) => recent.filter((item) => item.event === event && (!mode || item.mode === mode)).length
  const views = count('campaign_viewed')
  const reviews = count('review_opened')
  const confirmed = count('contribution_confirmed')
  return {
    paused: state.paused,
    windowDays,
    views,
    participationStarts: count('giving_mode_selected') + count('game_started'),
    reviews,
    confirmed,
    byMode: {
      direct: count('contribution_confirmed', 'direct'),
      game: count('contribution_confirmed', 'game'),
      sponsor: count('contribution_confirmed', 'sponsor'),
    },
    /** Reviews opened in the window that have no later confirmation. An estimate, not a failed payment. */
    abandonedReviews: Math.max(0, reviews - confirmed),
    events: recent,
  }
}

export function exportAnalytics(): string {
  return JSON.stringify(analyticsSummary(), null, 2)
}
