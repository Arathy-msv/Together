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

const { loadOrganizations, ORG_STORAGE_KEY, createOrganization, discardUnfinishedOrganization, saveOrganization } = await import('../src/lib/orgStorage.ts')
const { validateSlug, RESERVED_SLUGS } = await import('../src/lib/organizations.ts')
const { hasUnpublishedChanges, isPubliclyAvailable, previewOrganization, websiteConfigOf, withDraftDiscarded, withPublishedWebsite, withWebsiteDraft } = await import('../src/lib/website.ts')
const { loadStore, STORAGE_KEY } = await import('../src/lib/storage.ts')
const { DEMO_PLANS } = await import('../src/lib/plans.ts')

beforeEach(() => local.clear())

test('organizations saved before the platform restructure migrate as published with a demo plan', () => {
  local.setItem(
    ORG_STORAGE_KEY,
    JSON.stringify({ version: 1, organizations: [{ id: 'org_maple', slug: 'maple-grove', name: 'Maple Grove Renamed', type: 'school', updatedAt: '2026-05-01T00:00:00.000Z' }] }),
  )
  const maple = loadOrganizations().find((org) => org.id === 'org_maple')!
  assert.equal(maple.name, 'Maple Grove Renamed')
  assert.equal(maple.website.status, 'published')
  assert.equal(maple.plan.id, 'community')
  assert.ok(JSON.parse(local.getItem(ORG_STORAGE_KEY)!).version === 2)
})

test('seeds three published organizations plus one unfinished setup', () => {
  const orgs = loadOrganizations()
  const published = orgs.filter((org) => org.website.status === 'published' && org.type !== 'platform')
  assert.deepEqual(published.map((org) => org.type).sort(), ['company', 'nonprofit', 'school'])
  assert.equal(new Set(published.map((org) => org.defaults.games.join())).size, 3)
  assert.equal(orgs.filter((org) => org.website.status === 'setup').length, 1)
})

test('website addresses: format, reserved names and case-insensitive duplicates', () => {
  const orgs = loadOrganizations()
  assert.match(validateSlug('Maple-Grove', 'org_new', orgs) ?? '', /already uses/)
  assert.match(validateSlug('workspace', 'org_new', orgs) ?? '', /reserved/)
  assert.ok(RESERVED_SLUGS.includes('o') && RESERVED_SLUGS.includes('start'))
  assert.match(validateSlug('green wood', 'org_new', orgs) ?? '', /lowercase/)
  assert.equal(validateSlug('greenwood-school', 'org_new', orgs), undefined)
  assert.equal(validateSlug('maple-grove', 'org_maple', orgs), undefined)
})

test('draft website edits stay separate from the published website until published', () => {
  const maple = loadOrganizations().find((org) => org.id === 'org_maple')!
  const edited = withWebsiteDraft(maple, { ...websiteConfigOf(maple), content: { ...maple.content, headline: 'New headline' } })
  assert.equal(edited.content.headline, maple.content.headline)
  assert.equal(previewOrganization(edited).content.headline, 'New headline')
  assert.ok(hasUnpublishedChanges(edited))
  assert.equal(withDraftDiscarded(edited).website.draft, undefined)
  const published = withPublishedWebsite(edited)
  assert.equal(published.content.headline, 'New headline')
  assert.equal(published.website.draft, undefined)
  assert.ok(published.website.publishedAt)
  assert.equal(published.slug, maple.slug)
})

test('a new organization starts in setup, is not public, and can be discarded', () => {
  const org = createOrganization('starter')
  assert.equal(org.plan.id, 'starter')
  assert.equal(org.website.status, 'setup')
  assert.equal(isPubliclyAvailable(org), false)
  assert.ok(loadOrganizations().some((item) => item.id === org.id))
  discardUnfinishedOrganization(org.id)
  assert.ok(!loadOrganizations().some((item) => item.id === org.id))
  const maple = loadOrganizations().find((item) => item.id === 'org_maple')!
  discardUnfinishedOrganization(maple.id)
  assert.ok(loadOrganizations().some((item) => item.id === 'org_maple'))
})

test('brand changes never alter campaign facts or currency', () => {
  const store = loadStore()
  const before = store.campaigns.filter((campaign) => campaign.organizationId === 'org_lumen').map((campaign) => [campaign.id, campaign.goalAmount, campaign.currency])
  const lumen = loadOrganizations().find((org) => org.id === 'org_lumen')!
  saveOrganization(withPublishedWebsite(withWebsiteDraft(lumen, { ...websiteConfigOf(lumen), branding: { ...lumen.branding, primary: '#880000' } })))
  const after = JSON.parse(local.getItem(STORAGE_KEY)!).campaigns.filter((campaign: { organizationId: string }) => campaign.organizationId === 'org_lumen').map((campaign: { id: string; goalAmount: number; currency: string }) => [campaign.id, campaign.goalAmount, campaign.currency])
  assert.deepEqual(after, before)
})

test('demo plans have no prices and state their limits', () => {
  for (const plan of DEMO_PLANS) {
    assert.match(plan.name, /demo plan/i)
    assert.ok(plan.limits.length > 0)
    assert.doesNotMatch(JSON.stringify(plan), /[₹$£€]\s?\d/)
  }
})

test('setup resumes on the right step across flow versions', async () => {
  const { resumeSetupStep, SETUP_STEP_COUNT } = await import('../src/lib/website.ts')
  assert.equal(SETUP_STEP_COUNT, 5)
  assert.equal(resumeSetupStep(undefined), 1)
  assert.equal(resumeSetupStep({ step: 2, updatedAt: '' }), 1)
  assert.equal(resumeSetupStep({ step: 4, updatedAt: '' }), 3)
  assert.equal(resumeSetupStep({ step: 6, updatedAt: '' }), 4)
  assert.equal(resumeSetupStep({ step: 2, updatedAt: '', flow: 4 }), 1)
  assert.equal(resumeSetupStep({ step: 3, updatedAt: '', flow: 4 }), 3)
  assert.equal(resumeSetupStep({ step: 4, updatedAt: '', flow: 4 }), 4)
  assert.equal(resumeSetupStep({ step: 2, updatedAt: '', flow: 5 }), 2)
  assert.equal(resumeSetupStep({ step: 9, updatedAt: '', flow: 5 }), 5)
})

test('the first-visit checklist is computed from saved state', async () => {
  const { setupTasks } = await import('../src/lib/website.ts')
  const fresh = createOrganization('community')
  const tasks = setupTasks(fresh, 0, `/workspace/${fresh.id}`)
  assert.deepEqual(tasks.map((task) => task.id), ['details', 'customize', 'publish', 'campaign'])
  assert.ok(tasks.every((task) => !task.done))
  assert.equal(tasks[0].to, `/start/${fresh.id}`)

  const maple = loadOrganizations().find((org) => org.slug === 'maple-grove')!
  const done = setupTasks(maple, 2, `/workspace/${maple.id}`)
  assert.ok(done.every((task) => task.done))
  assert.equal(setupTasks(maple, 0, `/workspace/${maple.id}`).find((task) => !task.done)?.id, 'campaign')
})
