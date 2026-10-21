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

const { loadStore, saveStore } = await import('../src/lib/storage.ts')
const { switchIdentity, DEMO_USERS } = await import('../src/lib/identity.ts')
const { loadOrganizations, saveOrganization } = await import('../src/lib/orgStorage.ts')
const { confirmSponsorAllocation, createSponsorCommitment, sponsorOffer, unlockSponsorMilestone } = await import('../src/lib/sponsors.ts')
const { raisedOf, supporterCount } = await import('../src/lib/campaigns.ts')
const { normalizeFinalReport } = await import('../src/lib/records.ts')

beforeEach(() => {
  local.clear()
  switchIdentity(DEMO_USERS.togetherAdmin)
})

test('a sponsor reward stays pending, confirms once, and is not a personal supporter', () => {
  const store = loadStore()
  const org = loadOrganizations().find((item) => item.id === 'org_together')!
  saveOrganization({ ...org, features: { ...org.features, sponsorPlay: true } })
  const base = store.campaigns.find((item) => item.id === 'cmp_library')!
  const campaign = {
    ...base,
    id: 'cmp_memory_open',
    title: 'Memory Match sponsor test',
    gameType: 'memory' as const,
    opensAt: new Date(Date.now() - 86_400_000).toISOString(),
    closesAt: new Date(Date.now() + 86_400_000 * 30).toISOString(),
  }
  saveStore({ ...store, campaigns: [...store.campaigns, campaign] })
  const start = new Date(Date.now() - 86_400_000).toISOString()
  const end = new Date(Date.now() + 86_400_000).toISOString()
  createSponsorCommitment({
    organizationId: campaign.organizationId,
    campaignId: campaign.id,
    sponsorName: 'Fictional Sponsor',
    pledgedMinor: 10_000,
    perParticipantCapMinor: 5_000,
    unlocks: [{ id: 'match-1', label: 'First pair', rewardMinor: 5_000 }],
    startsAt: start,
    endsAt: end,
  })
  const first = unlockSponsorMilestone(campaign.id, 'user_mia')
  const again = unlockSponsorMilestone(campaign.id, 'user_mia')
  assert.ok(first)
  assert.equal(again, null)
  const before = raisedOf(campaign.id, loadStore().contributions)
  confirmSponsorAllocation(first!.id)
  confirmSponsorAllocation(first!.id)
  const after = loadStore()
  assert.equal(raisedOf(campaign.id, after.contributions), before + 50)
  assert.equal(after.contributions.filter((item) => item.id === `spn_gift_${first!.id}`).length, 1)
  assert.equal(supporterCount(campaign.id, after.contributions), supporterCount(campaign.id, after.contributions.filter((item) => item.source !== 'sponsor')))
  assert.equal(sponsorOffer(campaign.id, 'user_mia')?.next, null)
})

test('a non-memory campaign cannot take a sponsor commitment or offer sponsor play', () => {
  const store = loadStore()
  const org = loadOrganizations().find((item) => item.id === 'org_together')!
  saveOrganization({ ...org, features: { ...org.features, sponsorPlay: true } })
  const campaign = store.campaigns.find((item) => item.gameType === 'garden' && item.organizationId === org.id)!
  const start = new Date(Date.now() - 86_400_000).toISOString()
  const end = new Date(Date.now() + 86_400_000).toISOString()
  assert.throws(
    () =>
      createSponsorCommitment({
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        sponsorName: 'Fictional Sponsor',
        pledgedMinor: 10_000,
        perParticipantCapMinor: 5_000,
        unlocks: [{ id: 'match-1', label: 'First pair', rewardMinor: 5_000 }],
        startsAt: start,
        endsAt: end,
      }),
    /Memory Match/,
  )
  assert.equal(sponsorOffer(campaign.id, 'user_mia'), null)
  assert.equal(loadStore().sponsorCommitments.some((item) => item.campaignId === campaign.id), false)
})

test('a closure report can be partial without inventing completed milestones', () => {
  const report = normalizeFinalReport({
    status: 'published',
    closure: 'partial',
    outcomes: 'Some supplies arrived.',
    remainingPlan: 'The rest stays for the next term.',
    unmetExplanation: 'The second order was cancelled by the supplier.',
    changedPlan: 'We bought fewer jackets.',
    outstandingObligations: 'None',
    outcomeFields: [],
    evidenceDocumentIds: [],
    evidenceUpdateIds: [],
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  })
  assert.equal(report?.closure, 'partial')
  assert.equal(report?.unmetExplanation?.includes('supplier'), true)
})
