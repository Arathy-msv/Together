import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  data = new Map<string, string>()
  failWrites = false
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('QuotaExceededError')
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
const session = new MemoryStorage()
Object.assign(globalThis, { localStorage: local, sessionStorage: session })

const { loadStore, saveStore, STORAGE_KEY, StorageFullError } = await import('../src/lib/storage.ts')
const { DEMO_USERS, switchIdentity } = await import('../src/lib/identity.ts')
const { addContribution, raisedOf, statusOf } = await import('../src/lib/campaigns.ts')
const { referralTotals, makeReferralCode, createReferral, updateReferral } = await import('../src/lib/referrals.ts')
const { setShareContext, snapshotReferral, checkoutReferral } = await import('../src/lib/attribution.ts')
const { fundSummary, publicDocuments, deliverySummary, campaignMilestones, workspacePrompts, saveCampaignFields, formatMinor, publishedUpdates } = await import(
  '../src/lib/transparency.ts'
)
const { normalizeDocument, normalizeCampaignExtras } = await import('../src/lib/records.ts')
const { saveDraft, listDrafts, newDraftId } = await import('../src/lib/drafts.ts')
const { blankForm } = await import('../src/lib/wizard.ts')
const { applyTemplate, templateFor } = await import('../src/lib/templates.ts')
const { validateExpense, validateUpdate } = await import('../src/lib/validation.ts')

beforeEach(() => {
  local.failWrites = false
  local.clear()
  session.clear()
})

test('migrating a v2 store keeps every campaign and contribution and adds the new collections', () => {
  const v2 = {
    version: 2,
    campaigns: [
      {
        id: 'cmp_mine',
        organizationId: 'org_together',
        currency: 'INR',
        title: 'My own campaign',
        description: 'Created before this update existed.',
        coverImageId: 'garden',
        organizerName: 'Me',
        access: 'open',
        goalAmount: 1000,
        donationMode: 'custom',
        fixedAmounts: [],
        opensAt: new Date(Date.now() - 86_400_000).toISOString(),
        closesAt: new Date(Date.now() + 86_400_000).toISOString(),
        autoCloseOnGoal: true,
        participation: { direct: true, game: false },
        gameType: 'garden',
        createdAt: new Date().toISOString(),
      },
    ],
    contributions: [{ id: 'gift_1', campaignId: 'cmp_mine', amount: 300, method: 'direct', reference: 'DEMO-9', createdAt: new Date().toISOString(), status: 'success' }],
  }
  local.setItem(STORAGE_KEY, JSON.stringify(v2))
  const store = loadStore()
  assert.equal(store.version, 4)
  assert.ok(store.campaigns.some((item) => item.id === 'cmp_mine'))
  assert.ok(store.contributions.some((item) => item.id === 'gift_1'))
  assert.ok(store.referrals.some((item) => item.code === 'priya-shares'))
  assert.ok(store.milestones.length > 0 && store.expenses.length > 0 && store.campaignUpdates.length > 0)
  assert.equal(JSON.parse(local.getItem(STORAGE_KEY)!).version, 4)
})

test('records pointing at missing campaigns are dropped individually', () => {
  const store = loadStore()
  const raw = { ...store, milestones: [...store.milestones, { id: 'orphan', campaignId: 'nope', title: 'x', dueDate: new Date().toISOString() }] }
  local.setItem(STORAGE_KEY, JSON.stringify(raw))
  const reloaded = loadStore()
  assert.ok(!reloaded.milestones.some((item) => item.id === 'orphan'))
  assert.equal(reloaded.milestones.length, store.milestones.length)
})

test('a referral contribution counts once in the campaign and is also credited to the sharing page', () => {
  const store = loadStore()
  const referral = store.referrals.find((item) => item.code === 'priya-shares')!
  const before = raisedOf(referral.campaignId, store.contributions)
  const creditedBefore = referralTotals(referral, store.contributions).amount
  addContribution({ id: 'checkout_ref', campaignId: referral.campaignId, amount: 500, method: 'direct', referralId: referral.id })
  addContribution({ id: 'checkout_ref', campaignId: referral.campaignId, amount: 500, method: 'direct', referralId: referral.id })
  const after = loadStore()
  assert.equal(raisedOf(referral.campaignId, after.contributions), before + 500)
  assert.equal(referralTotals(referral, after.contributions).amount, creditedBefore + 500)
})

test('a referral from another campaign is never attached', () => {
  const store = loadStore()
  const referral = store.referrals.find((item) => item.code === 'priya-shares')!
  const saved = addContribution({ id: 'checkout_x', campaignId: 'cmp_library', amount: 100, method: 'direct', referralId: referral.id })
  assert.equal(saved.referralId, undefined)
})

test('attribution is snapshotted when review begins and later page visits do not change it', () => {
  setShareContext('cmp_a', 'ref_1')
  assert.equal(snapshotReferral('token_1', 'cmp_a'), 'ref_1')
  setShareContext('cmp_a', 'ref_2')
  assert.equal(snapshotReferral('token_1', 'cmp_a'), 'ref_1')
  assert.equal(checkoutReferral('token_1', 'cmp_a'), 'ref_1')
  setShareContext('cmp_a', null)
  assert.equal(snapshotReferral('token_2', 'cmp_a'), undefined)
})

test('referral codes are unique and personal edits never change campaign facts', () => {
  const taken = new Set(['priya-abcd'])
  let call = 0
  const code = makeReferralCode('Priya', taken, () => (call++ < 4 ? 0 : 0.5))
  assert.ok(code.startsWith('priya-') && !taken.has(code))
  const store = loadStore()
  const referral = createReferral('cmp_harbour_blankets', { displayName: 'Sam Lee', headline: 'Helping out', message: 'I care about this shelter a great deal.' })
  const updated = updateReferral(referral.id, { displayName: 'Sam', headline: 'New headline', message: 'Still caring about this shelter.' })!
  assert.equal(updated.code, referral.code)
  assert.equal(updated.campaignId, 'cmp_harbour_blankets')
  const campaign = loadStore().campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  assert.equal(campaign.goalAmount, store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!.goalAmount)
})

test('fund summary counts only published expenses, once each, in integer minor units', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  const base = fundSummary(campaign, store)
  const published = store.expenses.filter((item) => item.campaignId === campaign.id && item.status === 'published')
  assert.equal(base.spentMinor, published.reduce((sum, item) => sum + item.amountMinor, 0))
  assert.ok(store.expenses.some((item) => item.campaignId === campaign.id && item.status === 'draft'))
  // exp_hb_blankets1 is linked from two updates but counted once.
  assert.equal(store.campaignUpdates.filter((item) => item.expenseIds.includes('exp_hb_blankets1')).length, 2)
  assert.equal(published.filter((item) => item.id === 'exp_hb_blankets1').length, 1)

  store.expenses.push(
    { ...published[0], id: 'e_a', amountMinor: 1010, status: 'published' },
    { ...published[0], id: 'e_b', amountMinor: 2020, status: 'published' },
  )
  const next = fundSummary(campaign, store)
  assert.equal(next.spentMinor - base.spentMinor, 3030)
  assert.equal(next.balanceMinor, next.contributedMinor - next.spentMinor)
})

test('a negative balance is shown exactly, not clamped to zero', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_reading')!
  const summary = fundSummary(campaign, store)
  assert.ok(summary.balanceMinor < 0)
  assert.equal(summary.balanceMinor, summary.contributedMinor - summary.spentMinor)
  assert.equal(formatMinor(-120000, 'INR'), '−₹1,200')
})

test('reaching the funding goal does not mark delivery complete', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_reading')!
  assert.equal(statusOf(campaign, store.contributions), 'completed')
  const delivery = deliverySummary(campaignMilestones(store, campaign.id))
  assert.ok(delivery.complete < delivery.total)
  assert.ok(workspacePrompts(campaign, store).includes('Funding goal reached. Share what happens next.'))
})

test('private verification documents never appear in public evidence or keep files', () => {
  const store = loadStore()
  const docs = publicDocuments(store, 'cmp_harbour_blankets')
  assert.ok(docs.length > 0)
  assert.ok(docs.every((doc) => doc.visibility === 'public'))
  assert.ok(store.supportingDocuments.some((doc) => doc.campaignId === 'cmp_harbour_blankets' && doc.visibility === 'private'))
  const campaigns = new Map(store.campaigns.map((item) => [item.id, item]))
  const forced = normalizeDocument({ id: 'd', campaignId: 'cmp_harbour_blankets', visibility: 'private', fileSrc: '/docs/sample-quote.svg', title: 'ID' }, campaigns)!
  assert.equal(forced.fileSrc, undefined)
})

test('uploading evidence or editing the story never creates a verified badge', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_maple_garden')!
  assert.equal(campaign.demoVerification, undefined)
  switchIdentity(DEMO_USERS.mapleAdmin)
  saveCampaignFields(campaign.id, { description: campaign.description, demoVerification: { label: 'Verified', note: 'x', date: '' } } as never)
  assert.equal(loadStore().campaigns.find((item) => item.id === campaign.id)!.demoVerification, undefined)
  const relabelled = normalizeCampaignExtras({ ...campaign, demoVerification: { label: 'Verified', note: 'n', date: campaign.createdAt } })
  assert.equal(relabelled.demoVerification?.label, 'Demo verification')
})

test('only published updates are public', () => {
  const store = loadStore()
  const updates = publishedUpdates(store, 'cmp_harbour_blankets')
  assert.ok(updates.every((item) => item.status === 'published'))
  assert.ok(store.campaignUpdates.some((item) => item.campaignId === 'cmp_harbour_blankets' && item.status === 'draft'))
})

test('drafts are saved separately and a storage failure is reported, not hidden', () => {
  const form = blankForm()
  switchIdentity(DEMO_USERS.togetherAdmin)
  const first = saveDraft({ id: newDraftId(), organizationId: 'org_together', kind: 'form', form: { ...form, title: 'First' }, step: '1' })
  saveDraft({ id: newDraftId(), organizationId: 'org_together', kind: 'assistant', form: { ...form, title: 'Second' }, step: 'goal' })
  assert.equal(listDrafts('org_together').length, 2)
  assert.equal(listDrafts('org_maple').length, 0)
  local.failWrites = true
  assert.throws(() => saveDraft({ ...first, form: { ...first.form, title: 'Changed' } }), StorageFullError)
  local.failWrites = false
  assert.equal(listDrafts('org_together').find((item) => item.id === first.id)?.form.title, 'First')
})

test('applying a template keeps entered content and only replaces lists when asked', () => {
  const form = { ...blankForm(), title: 'Coats for winter', description: 'Our own words about the campaign.', storyWho: 'Families at the shelter', milestonePlan: [{ id: 'm', title: 'My step', due: '' }] }
  const filled = applyTemplate(form, templateFor('clothing'), { replaceLists: false, useGame: null })
  assert.equal(filled.form.title, form.title)
  assert.equal(filled.form.storyWho, form.storyWho)
  assert.deepEqual(filled.form.milestonePlan.map((item) => item.title), ['My step'])
  assert.ok(filled.form.budget.length > 0)
  const replaced = applyTemplate(form, templateFor('clothing'), { replaceLists: true, useGame: 'jacket' })
  assert.deepEqual(replaced.form.milestonePlan.map((item) => item.title), templateFor('clothing').milestones)
  assert.equal(replaced.form.description, form.description)
  assert.equal(replaced.form.gameType, 'jacket')
  assert.ok(replaced.changes.some((change) => change.kind === 'replace' && change.field === 'Milestone plan'))
})

test('publishing receipts and media requires explicit privacy confirmation', () => {
  assert.match(validateExpense({ description: 'Blankets', amount: '100', date: '2026-10-01', publicReceipt: 'data:image/jpeg;base64,x', receiptRedacted: false }, true).receiptRedacted ?? '', /removed/)
  assert.deepEqual(validateExpense({ description: 'Blankets', amount: '100', date: '2026-10-01', publicReceipt: 'data:image/jpeg;base64,x', receiptRedacted: false }, false), {})
  const media = [{ id: 'm', src: '/covers/cover-garden.jpg', caption: '', alt: 'Garden beds' }]
  assert.match(validateUpdate({ title: 'Beds built', date: '2026-10-01', body: 'We built the beds today.', media, mediaConsent: false }, true).mediaConsent ?? '', /permission/)
})

test('saving fails loudly when storage is full', () => {
  const store = loadStore()
  local.failWrites = true
  assert.throws(() => saveStore(store), StorageFullError)
})
