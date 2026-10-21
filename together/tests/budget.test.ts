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
const session = new MemoryStorage()
Object.assign(globalThis, { localStorage: local, sessionStorage: session })

const { beneficiaryNote, beneficiaryText, budgetLineError, budgetSummary, budgetToDrafts, draftLineTotal, draftsToBudget, organizerLine } = await import('../src/lib/budget.ts')
const { loadStore, STORAGE_KEY } = await import('../src/lib/storage.ts')
const { normalizeBudget, normalizeStory } = await import('../src/lib/records.ts')
const { blankForm, completeForm, formToCampaign, campaignToForm, validateStory } = await import('../src/lib/wizard.ts')
const { checkReadiness, readinessFromForm } = await import('../src/lib/ai/readiness.ts')
const { loadOrganizations } = await import('../src/lib/orgStorage.ts')

beforeEach(() => {
  local.clear()
  session.clear()
})

const line = (patch: Record<string, string>) => ({ id: crypto.randomUUID(), label: '', amount: '', quantity: '', unitCost: '', milestoneId: '', note: '', ...patch })

test('quantity × unit cost gives the total in integer minor units; a direct total also works', () => {
  assert.equal(draftLineTotal(line({ label: 'Books', quantity: '120', unitCost: '45.50' })), 546_000)
  assert.equal(draftLineTotal(line({ label: 'Transport', amount: '1800' })), 180_000)
  const saved = draftsToBudget([line({ label: 'Books', quantity: '120', unitCost: '45.50', note: 'Supplier quote' }), line({ label: 'Transport', amount: '1800' })])
  assert.deepEqual(
    saved.map((item) => [item.amountMinor, item.quantity, item.unitCostMinor, item.note]),
    [
      [546_000, 120, 4_550, 'Supplier quote'],
      [180_000, undefined, undefined, undefined],
    ],
  )
  assert.ok(saved.every((item) => Number.isSafeInteger(item.amountMinor)))
})

test('budget lines report the first problem and ignore blank rows', () => {
  assert.equal(budgetLineError([line({})]), null)
  assert.match(budgetLineError([line({ amount: '50' })])!, /description/)
  assert.match(budgetLineError([line({ label: 'Pens', quantity: '2.5', unitCost: '10' })])!, /whole number/)
  assert.match(budgetLineError([line({ label: 'Pens', quantity: '10' })])!, /both quantity and unit cost/)
  assert.equal(budgetLineError([line({ label: 'Pens', quantity: '10', unitCost: '12' })]), null)
})

test('the summary shows unallocated and over-target amounts without changing the target', () => {
  assert.deepEqual(budgetSummary([{ amountMinor: 4_000_000 }], 6_000_000), { targetMinor: 6_000_000, plannedMinor: 4_000_000, unallocatedMinor: 2_000_000, overTargetMinor: 0 })
  assert.deepEqual(budgetSummary([{ amountMinor: 7_000_000 }], 6_000_000), { targetMinor: 6_000_000, plannedMinor: 7_000_000, unallocatedMinor: 0, overTargetMinor: 1_000_000 })
})

test('an approximate budget needs an explanation, and an explained mismatch is not flagged', () => {
  const form = { ...blankForm(), title: 'School supplies', description: 'Notebooks and pencils for every classroom this year.', goalAmount: '60000' }
  form.budget = [line({ label: 'Books', amount: '40000' })]
  form.budgetApproximate = true
  assert.match(validateStory(form).budget ?? '', /Explain how you estimated/)
  form.budgetNote = 'Based on last year’s prices.'
  assert.equal(validateStory(form).budget, undefined)
  const org = loadOrganizations()[0]
  const ids = checkReadiness(readinessFromForm(form, org, [])).map((item) => item.id)
  assert.ok(!ids.includes('budget-mismatch'))
})

test('beneficiaries entered in the assistant or form survive review and publication', () => {
  const form = { ...blankForm(), title: 'School supplies', description: 'Notebooks and pencils for every classroom this year.', storyWho: 'All 420 pupils of Greenwood School.' }
  const campaign = formToCampaign(form, { isDraft: false })
  assert.equal(beneficiaryText(campaign.story), 'All 420 pupils of Greenwood School.')
  assert.equal(campaignToForm(campaign).storyWho, 'All 420 pupils of Greenwood School.')
})

test('older records with only the separate beneficiary field keep that text; nothing is invented', () => {
  const story = normalizeStory({ whoItHelps: '', whatTheyNeed: 'Books', whatItSupports: '', whatHappensNext: '', beneficiary: 'Grade 4 students', imageStory: [] })
  assert.equal(story?.whoItHelps, 'Grade 4 students')
  assert.equal(beneficiaryNote(story), '')
  const none = normalizeStory({ whoItHelps: '', whatTheyNeed: 'Our pupils need books', whatItSupports: '', whatHappensNext: '', beneficiary: '', imageStory: [] })
  assert.equal(beneficiaryText(none), '')
  const draft = completeForm({ organizationId: 'org_together', beneficiary: 'Families at three shelters' })
  assert.equal(draft.storyWho, 'Families at three shelters')
})

test('a distinct beneficiary note is kept as an addition, not a duplicate', () => {
  const story = { whoItHelps: 'Residents of our night shelters.', beneficiary: 'We never publish residents’ names or photos.' }
  assert.equal(beneficiaryText(story), 'Residents of our night shelters.')
  assert.equal(beneficiaryNote(story), 'We never publish residents’ names or photos.')
})

test('the organizer line does not repeat the organization name', () => {
  assert.equal(organizerLine('Greenwood School', 'Greenwood School'), 'Greenwood School')
  assert.equal(organizerLine('Greenwood School PTA', 'Greenwood School'), 'Greenwood School PTA · Greenwood School')
})

test('saved budgets keep itemized fields only when they add up, and old lines still load', () => {
  const lines = normalizeBudget([
    { id: 'a', label: 'Books', amountMinor: 546_000, quantity: 120, unitCostMinor: 4_550, milestoneId: 'ms_1', note: 'Quote' },
    { id: 'b', label: 'Bad maths', amountMinor: 100, quantity: 3, unitCostMinor: 50 },
    { id: 'c', label: 'Old line', amountMinor: 20_000 },
  ])!
  assert.deepEqual(lines[0], { id: 'a', label: 'Books', amountMinor: 546_000, quantity: 120, unitCostMinor: 4_550, milestoneId: 'ms_1', note: 'Quote' })
  assert.equal(lines[1].quantity, undefined)
  assert.deepEqual(lines[2], { id: 'c', label: 'Old line', amountMinor: 20_000 })
  assert.equal(budgetToDrafts(lines)[0].quantity, '120')
})

test('a v4 store migrates to v5 and copies beneficiaries only from the beneficiary field', () => {
  const v4 = {
    version: 4,
    campaigns: [
      {
        id: 'cmp_old',
        organizationId: 'org_together',
        currency: 'INR',
        title: 'Old campaign',
        description: 'Saved before beneficiaries were unified.',
        coverImageId: 'garden',
        organizerName: 'Riverside School PTA',
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
        story: { whoItHelps: '', whatTheyNeed: '', whatItSupports: '', whatHappensNext: '', beneficiary: 'Year 3 pupils', imageStory: [] },
        budget: [{ id: 'b1', label: 'Paint', amountMinor: 50_000 }],
      },
    ],
    contributions: [],
  }
  local.setItem(STORAGE_KEY, JSON.stringify(v4))
  const store = loadStore()
  assert.equal(store.version, 6)
  const campaign = store.campaigns.find((item) => item.id === 'cmp_old')!
  assert.equal(campaign.story?.whoItHelps, 'Year 3 pupils')
  assert.deepEqual(campaign.budget, [{ id: 'b1', label: 'Paint', amountMinor: 50_000 }])
  assert.equal(JSON.parse(local.getItem(STORAGE_KEY)!).version, 6)
})
