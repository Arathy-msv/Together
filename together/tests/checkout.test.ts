import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}

const storage = new MemoryStorage()
Object.assign(globalThis, { localStorage: storage, sessionStorage: new MemoryStorage() })

const { addContribution, raisedOf, upsertCampaign, getCampaign } = await import('../src/lib/campaigns.ts')
const { contributionAvailability } = await import('../src/lib/availability.ts')
const { readLedger, writeLedger } = await import('../src/lib/gameLedger.ts')
const { beginCheckout, defaultGameSettings, recordAction, settleConfirmed } = await import('../src/lib/gameContribution.ts')
const { loadStore } = await import('../src/lib/storage.ts')

beforeEach(() => storage.clear())

function pendingGarden(campaignId: string, plants: number) {
  let ledger = readLedger(campaignId, 'garden')
  for (let index = 1; index <= plants; index += 1) {
    ledger = recordAction(
      ledger,
      { actionId: `bed-1:plot-${index}`, roundId: 'bed-1', label: `Plot ${index}` },
      defaultGameSettings('garden'),
    ).ledger
  }
  writeLedger(ledger)
  return ledger
}

test('continuing play does not change campaign totals', () => {
  const before = raisedOf('cmp_library', loadStore().contributions)
  pendingGarden('cmp_library', 3)
  assert.equal(raisedOf('cmp_library', loadStore().contributions), before)
})

test('a confirmed session updates totals exactly once, even when confirmed twice', () => {
  const before = raisedOf('cmp_library', loadStore().contributions)
  const ledger = pendingGarden('cmp_library', 3)
  const session = ledger.session!
  writeLedger(beginCheckout(ledger, session.id))
  const first = addContribution({ id: session.id, campaignId: 'cmp_library', amount: session.suggestedPaise / 100, method: 'game' })
  const second = addContribution({ id: session.id, campaignId: 'cmp_library', amount: session.suggestedPaise / 100, method: 'game' })
  writeLedger(settleConfirmed(readLedger('cmp_library', 'garden'), session.id))
  assert.equal(first.id, second.id)
  assert.equal(raisedOf('cmp_library', loadStore().contributions), before + 150)
  assert.equal(readLedger('cmp_library', 'garden').session, null)
})

test('a failed payment leaves totals unchanged and keeps the pending amount', () => {
  const before = raisedOf('cmp_library', loadStore().contributions)
  const ledger = pendingGarden('cmp_library', 2)
  writeLedger(beginCheckout(ledger, ledger.session!.id))
  assert.equal(raisedOf('cmp_library', loadStore().contributions), before)
  assert.equal(readLedger('cmp_library', 'garden').session?.suggestedPaise, 10000)
})

test('closed or scheduled campaigns reject confirmation', () => {
  const campaign = getCampaign('cmp_library')!
  upsertCampaign({ ...campaign, manualClosedAt: new Date().toISOString() })
  const closed = contributionAvailability(getCampaign('cmp_library')!, loadStore().contributions)
  assert.equal(closed.ok, false)
  assert.match(closed.reason, /closed/)
  const scheduled = contributionAvailability(getCampaign('cmp_winter')!, loadStore().contributions)
  assert.equal(scheduled.ok, false)
  assert.match(scheduled.reason, /opens on/)
})
