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

const {
  canUseFeature,
  clampFeaturesToPlan,
  disableImpact,
  inferFeatures,
  planEntitles,
  recommendedFeatures,
} = await import('../src/lib/features.ts')
const { createOrganization, loadOrganizations, saveOrganization } = await import('../src/lib/orgStorage.ts')
const { exportOrganizationRecords, publishWithPolicy } = await import('../src/lib/featureActions.ts')
const { blankForm, formToCampaign } = await import('../src/lib/wizard.ts')
const { loadStore, saveStore } = await import('../src/lib/storage.ts')
const { statusOf } = await import('../src/lib/campaigns.ts')

beforeEach(() => local.clear())

test('starter plan does not entitle sponsor play or review approval', () => {
  assert.equal(planEntitles('starter', 'sponsorPlay'), false)
  assert.equal(planEntitles('starter', 'reviewApproval'), false)
  assert.equal(planEntitles('organization', 'sponsorPlay'), true)
})

test('canUseFeature requires platform, plan and organization activation', () => {
  const org = createOrganization('community')
  assert.equal(canUseFeature(org, 'shareKit'), true)
  assert.equal(canUseFeature(org, 'sponsorPlay'), false)
  const locked = { ...org, features: { ...org.features, shareKit: false } }
  assert.equal(canUseFeature(locked, 'shareKit'), false)
  const orgPlan = { ...org, plan: { id: 'starter' as const, selectedAt: org.plan.selectedAt }, features: { ...org.features, recordExports: true } }
  assert.equal(canUseFeature(orgPlan, 'recordExports'), false)
})

test('two organizations keep independent feature selections across refresh', () => {
  const a = createOrganization('community')
  const b = createOrganization('organization')
  saveOrganization({ ...a, features: { ...a.features, shareKit: true, updateCommitments: false } })
  saveOrganization({ ...b, features: { ...recommendedFeatures('company', 'organization'), sponsorPlay: true, reviewApproval: true } })
  const again = loadOrganizations()
  const a2 = again.find((item) => item.id === a.id)!
  const b2 = again.find((item) => item.id === b.id)!
  assert.equal(a2.features.updateCommitments, false)
  assert.equal(b2.features.sponsorPlay, true)
  assert.equal(a2.features.sponsorPlay, false)
})

test('disabling sponsor play is blocked while an active sponsored campaign exists', () => {
  const org = createOrganization('organization')
  saveOrganization({ ...org, features: { ...org.features, sponsorPlay: true }, website: { status: 'published', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } })
  const form = blankForm(org)
  form.title = 'Sponsored drive'
  form.description = 'A long enough description for validation and publishing.'
  form.sponsorEnabled = true
  const campaign = formToCampaign(form, { isDraft: false })
  campaign.sponsorEnabled = true
  const store = loadStore()
  store.campaigns.unshift(campaign)
  saveStore(store)
  const impact = disableImpact({ ...org, features: { ...org.features, sponsorPlay: true } }, 'sponsorPlay', loadStore())
  assert.equal(impact.blocked, true)
  assert.match(impact.summary.join(' '), /active campaign/)
})

test('review approval routes publish into pending_review', () => {
  const org = createOrganization('organization')
  const withReview = { ...org, features: { ...recommendedFeatures('company', 'organization'), reviewApproval: true } }
  saveOrganization({ ...withReview, website: { status: 'published', publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } })
  const form = blankForm(withReview)
  form.title = 'Needs a second look'
  form.description = 'Enough text for the campaign story before it goes to review.'
  const campaign = formToCampaign(form, { isDraft: false })
  const result = publishWithPolicy(campaign)
  assert.equal(result.mode, 'pending_review')
  const saved = loadStore().campaigns.find((item) => item.id === campaign.id)!
  assert.equal(saved.approvalStatus, 'pending_review')
  assert.equal(saved.isDraft, true)
  // A campaign waiting for review must stay distinguishable from a plain unsubmitted draft so it
  // is still reachable from "Manage" in the workspace list, not stuck behind only an "Edit" link.
  assert.equal(statusOf(saved, []), 'pending_review')
})

test('export rejects when recordExports is off', () => {
  const org = createOrganization('starter')
  assert.throws(() => exportOrganizationRecords(org), /not enabled/)
})

test('existing published organizations keep practical toolkit after migration', () => {
  const maple = loadOrganizations().find((item) => item.slug === 'maple-grove')!
  assert.equal(maple.features.shareKit, true)
  assert.equal(maple.features.updateCommitments, true)
  const inferred = inferFeatures({ ...maple, features: recommendedFeatures(maple.type, maple.plan.id) })
  assert.equal(inferred.shareKit, true)
})

test('clampFeaturesToPlan clears entitlements the plan does not include', () => {
  const features = recommendedFeatures('company', 'organization')
  features.sponsorPlay = true
  const clamped = clampFeaturesToPlan(features, 'starter')
  assert.equal(clamped.sponsorPlay, false)
  assert.equal(clamped.shareKit, true)
})
