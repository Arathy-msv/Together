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
Object.assign(globalThis, { localStorage: local, sessionStorage: new MemoryStorage() })

const format = await import('../src/lib/format.ts')
const { BRAND_PALETTES, contrastChecks, DEFAULT_BRANDING } = await import('../src/lib/theme.ts')
const { normalizeOrganization } = await import('../src/lib/organizations.ts')
const { loadStore, saveStore } = await import('../src/lib/storage.ts')
const { createReferral, mySharingPages } = await import('../src/lib/referrals.ts')

beforeEach(() => {
  format.setDisplayTimeZone(undefined)
})

test('date-only values keep their calendar day and date-times name the timezone', () => {
  assert.equal(format.formatDate('2026-10-21').includes('21 Oct 2026'), true)
  assert.equal(format.formatDate('2026-10-21').includes('Asia'), false)
  assert.equal(format.formatDate('2026-10-20').includes('20 Oct 2026'), true)
  const morning = format.formatDateTime('2026-10-21T04:30:00.000Z')
  assert.match(morning, /21 Oct 2026/)
  assert.match(morning, /10:00/)
  assert.match(morning, /Asia\/Kolkata/)
  const eveningBefore = format.formatDate('2026-10-20T20:00:00.000Z')
  assert.match(eveningBefore, /21 Oct 2026/)
  assert.equal(eveningBefore.includes('Asia'), false)
  format.setDisplayTimeZone('Europe/London')
  assert.match(format.formatDateTime('2026-10-21T04:30:00.000Z'), /05:30/)
  assert.match(format.formatDateTime('2026-10-21T04:30:00.000Z'), /Europe\/London/)
  assert.match(format.formatDate('2026-10-21'), /21 Oct 2026/)
  format.setDisplayTimeZone('not-a-zone')
  assert.equal(format.currentDisplayTimeZone(), 'Asia/Kolkata')
})

test('an organization timezone is kept only when it is a real zone', () => {
  const kept = normalizeOrganization({ id: 'org_tz', name: 'Harbour', timezone: 'America/New_York', slug: 'harbour' })
  assert.equal(kept?.timezone, 'America/New_York')
  const dropped = normalizeOrganization({ id: 'org_bad', name: 'Harbour', timezone: 'Mars/Base', slug: 'harbour-2' })
  assert.equal(dropped?.timezone, undefined)
})

test('every suggested palette passes the readable contrast checks', () => {
  for (const palette of BRAND_PALETTES) {
    const checks = contrastChecks({ ...DEFAULT_BRANDING, ...palette.colors })
    const failed = checks.filter((check) => !check.ok).map((check) => check.id)
    assert.deepEqual(failed, [], palette.name)
  }
})

test('my activity lists only this supporter’s sharing pages in this organization', () => {
  local.clear()
  format.setDisplayTimeZone(undefined)
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.organizationId === 'org_together')
  assert.ok(campaign)
  const mine = createReferral(campaign.id, {
    displayName: 'Asha',
    headline: 'Please help',
    message: 'I am asking friends to support this campaign with me.',
  })
  const latest = loadStore()
  latest.referrals.push({
    ...mine,
    id: 'ref_theirs',
    code: 'someone-else',
    ownerId: 'usr_someone_else',
    displayName: 'Someone else',
  })
  latest.referrals.push({
    ...mine,
    id: 'ref_other_org',
    code: 'other-org',
    organizationId: 'org_other',
    campaignId: 'cmp_other',
  })
  saveStore(latest)
  const pages = mySharingPages('org_together')
  assert.deepEqual(pages.map((page) => page.id), [mine.id])
  assert.equal(mySharingPages('org_other').length, 0)
})
