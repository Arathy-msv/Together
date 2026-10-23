import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  clear() {
    this.data.clear()
  }
}

const local = new MemoryStorage()
Object.assign(globalThis, { localStorage: local })

const { analyticsSummary, clearAnalytics, exportAnalytics, setAnalyticsPaused, trackJourney } = await import('../src/lib/analytics.ts')

beforeEach(() => local.clear())

test('journey counts stay inside the allowed events and explain abandonment as a count gap', () => {
  trackJourney('campaign_viewed', { campaignId: 'cmp_demo' })
  trackJourney('giving_mode_selected', { campaignId: 'cmp_demo', mode: 'direct' })
  trackJourney('game_started', { campaignId: 'cmp_demo', mode: 'game' })
  trackJourney('review_opened', { campaignId: 'cmp_demo', mode: 'direct' })
  trackJourney('review_opened', { campaignId: 'cmp_demo', mode: 'game' })
  trackJourney('contribution_confirmed', { campaignId: 'cmp_demo', mode: 'direct' })
  trackJourney('voucher_claimed', { campaignId: 'cmp_demo' })
  trackJourney('voucher_redeemed', { campaignId: 'cmp_demo' })
  const summary = analyticsSummary()
  assert.equal(summary.views, 1)
  assert.equal(summary.participationStarts, 2)
  assert.equal(summary.reviews, 2)
  assert.equal(summary.confirmed, 1)
  assert.equal(summary.byMode.direct, 1)
  assert.equal(summary.abandonedReviews, 1)
  const exported = exportAnalytics()
  assert.equal(exported.includes('voucher code'), false)
  assert.equal(JSON.parse(exported).views, 1)
})

test('pause drops new events and clear keeps the pause flag', () => {
  trackJourney('campaign_viewed', { campaignId: 'cmp_demo' })
  setAnalyticsPaused(true)
  trackJourney('contribution_confirmed', { campaignId: 'cmp_demo', mode: 'sponsor' })
  assert.equal(analyticsSummary().confirmed, 0)
  assert.equal(analyticsSummary().views, 1)
  clearAnalytics()
  assert.equal(analyticsSummary().views, 0)
  assert.equal(analyticsSummary().paused, true)
})
