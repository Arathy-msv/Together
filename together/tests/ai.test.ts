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

const { parseCampaignMessage } = await import('../src/lib/ai/parse.ts')
const { checkReadiness, readinessFromForm, readinessFromCampaign } = await import('../src/lib/ai/readiness.ts')
const { draftCampaignUpdate, draftImpactReport, suggestReferralMessage, suggestCampaignDraft, shortenMessage, composeUpdateBody } = await import('../src/lib/ai/writers.ts')
const { answerPublicQuestion, buildPublicSnapshot, NOT_PUBLISHED } = await import('../src/lib/ai/answers.ts')
const { extractSampleReceipt } = await import('../src/lib/ai/receipts.ts')
const { previewSampleTranslation } = await import('../src/lib/ai/translations.ts')
const { recommendCampaignSetup } = await import('../src/lib/ai/setup.ts')
const { mockAssistant, mockSettings } = await import('../src/lib/ai/service.ts')
const { AiCancelledError, AiError, SIMULATION_LABEL } = await import('../src/lib/ai/types.ts')
const { loadStore } = await import('../src/lib/storage.ts')
const { fundSummary, formatMinor } = await import('../src/lib/transparency.ts')
const { blankForm } = await import('../src/lib/wizard.ts')
const { createOrganizationSeed } = await import('../src/data/organizations.ts')

mockSettings.latencyMs = 0
beforeEach(() => local.clear())

const orgs = createOrganizationSeed()
const lumen = orgs.find((org) => org.id === 'org_lumen')!
const harbour = orgs.find((org) => org.id === 'org_harbour')!

test('extracts an explicit amount and currency, and only suggests a category', () => {
  const parsed = parseCampaignMessage('Our company wants to raise ₹50,000 for school supplies.')
  assert.equal(parsed.amount, 50000)
  assert.equal(parsed.currency, 'INR')
  assert.equal(parsed.category, 'education')
  assert.deepEqual(parseCampaignMessage('We want 2 lakh rupees for blankets').amount, 200000)
  assert.equal(parseCampaignMessage('We have 200 students who need help').amount, undefined)
  assert.equal(parseCampaignMessage('Help our neighbours').amount, undefined)
})

test('readiness separates required, recommended and optional and never scores', () => {
  const form = { ...blankForm(lumen), title: '', description: 'Short.' }
  const items = checkReadiness(readinessFromForm(form, lumen, ['memory']))
  assert.ok(items.some((item) => item.level === 'required' && item.field === 'title'))
  assert.ok(items.some((item) => item.level === 'recommended' && item.id === 'budget-missing' && /budget breakdown could help supporters understand your target/.test(item.why)))
  assert.ok(items.some((item) => item.level === 'optional'))
  assert.ok(items.every((item) => !/%|score|fraud|verified/i.test(item.issue + item.why)))
})

test('readiness flags budget mismatch, unsupported impact claims and closing before opening', () => {
  const form = {
    ...blankForm(lumen),
    title: 'Coats',
    description: 'Every $10 clothes one child this winter, so please give generously to our coat drive.',
    goalAmount: '1000',
    budget: [{ id: 'b', label: 'Coats', amount: '600' }],
    opensAt: '2026-11-10T10:00',
    closesAt: '2026-11-01T10:00',
  }
  const items = checkReadiness(readinessFromForm(form, lumen, ['memory']))
  assert.ok(items.some((item) => item.id === 'budget-mismatch' && /\$600/.test(item.issue)))
  assert.ok(items.some((item) => item.id === 'impact'))
  assert.ok(items.some((item) => item.level === 'required' && item.field === 'dates' && /after opening/.test(item.issue)))
})

test('editorial advice is never required', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_maple_sports')!
  const items = checkReadiness(readinessFromCampaign(campaign, store, orgs.find((org) => org.id === 'org_maple')!))
  assert.ok(items.filter((item) => item.level === 'required').length === 0)
  assert.ok(items.some((item) => item.level !== 'required'))
})

test('campaign draft suggestions use only supplied facts and mark what is missing', () => {
  const form = { ...blankForm(lumen), description: 'Our company wants to raise ₹50,000 for school supplies.', goalAmount: '50000', currency: 'INR' as const, category: 'education' as const }
  const result = suggestCampaignDraft(form, lumen, ['memory', 'jacket', 'garden'])
  assert.equal(result.label, SIMULATION_LABEL)
  assert.match(result.content.story.whoItHelps, /^\[/)
  assert.equal(result.content.summary, 'Our company wants to raise ₹50,000 for school supplies.')
  assert.equal(result.content.game.gameType, 'memory')
  assert.ok(result.missing.some((item) => /Who the campaign helps/.test(item)))
  const mismatch = suggestCampaignDraft({ ...form, goalAmount: '45000' }, lumen, ['memory'])
  assert.ok(mismatch.missing.some((item) => /mentions ₹50,000 but the target is ₹45,000/.test(item)))
})

test('update drafts never turn a planned milestone into a completed one', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  const planned = store.milestones.find((item) => item.id === 'ms_hb_distribute')!
  const draft = draftCampaignUpdate({ campaign, milestone: planned, whatHappened: 'We met the shelter managers to plan the delivery route.', date: new Date().toISOString(), expenses: [], challenges: '', next: '', evidence: [] })
  assert.match(draft.content.body, /is planned and has not started yet/)
  assert.doesNotMatch(draft.content.body + draft.content.title, /complete/i)
  assert.ok(draft.missing.includes('What happens next'))
  const done = store.milestones.find((item) => item.id === 'ms_hb_identify')!
  assert.match(draftCampaignUpdate({ campaign, milestone: done, whatHappened: 'x', date: '', expenses: [], challenges: '', next: 'y', evidence: [] }).content.body, /reports “Confirm needs with each shelter” as complete/)
})

test('update drafts summarise only published expenses and cite their sources', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  const expenses = store.expenses.filter((item) => item.campaignId === campaign.id)
  const draft = draftCampaignUpdate({ campaign, whatHappened: '', date: '', expenses, challenges: 'Supplier delay', next: 'Collect batch two', evidence: [] })
  assert.match(draft.content.body, /\[Describe what happened — required\]/)
  assert.match(draft.content.spending, /Total ₹19,250/)
  assert.doesNotMatch(draft.content.spending, /awaiting invoice/)
  assert.ok(draft.sources.every((source) => source.kind !== 'expense' || expenses.find((item) => item.id === source.id)?.status === 'published'))
  assert.match(composeUpdateBody(draft.content), /What happens next: Collect batch two\./)
})

test('final report figures come from the app calculation and keep gaps visible', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_reading')!
  const summary = fundSummary(campaign, store)
  const report = draftImpactReport(campaign, store, '', '')
  const text = report.content.outcomesText
  assert.ok(text.includes(formatMinor(summary.contributedMinor, campaign.currency)))
  assert.ok(text.includes(formatMinor(summary.spentMinor, campaign.currency)))
  assert.ok(text.includes(formatMinor(summary.balanceMinor, campaign.currency)))
  assert.match(text, /Set up four reading corners — in progress/)
  assert.match(text, /\[Organizer to describe outcomes\]/)
  assert.ok(report.missing.some((item) => /Evidence for 1 published expense/.test(item)))
})

test('referral suggestions keep campaign facts and add nothing invented', () => {
  const empty = suggestReferralMessage({ campaignTitle: 'Winter Blankets for Shelters', organizerName: 'Open Harbour Outreach', why: '', connection: '', tone: 'warm' })
  assert.equal(empty.content.length, 0)
  const result = suggestReferralMessage({ campaignTitle: 'Winter Blankets for Shelters', organizerName: 'Open Harbour Outreach', why: 'nobody should be cold at night', connection: 'I volunteer on Thursdays', tone: 'warm' })
  assert.ok(result.content.length > 0 && result.content.length <= 3)
  for (const option of result.content) {
    assert.doesNotMatch(option, /match|urgent|last chance|\d+ (children|families)|guarantee/i)
  }
  assert.ok(result.content.some((option) => option.includes('Open Harbour Outreach')))
  assert.ok(shortenMessage(result.content[0]).length <= 200)
})

test('donor answers use public information only and unknown stays unknown', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  const snapshot = buildPublicSnapshot(campaign, store)
  assert.ok(!JSON.stringify(snapshot).includes('awaiting invoice'))
  assert.ok(!JSON.stringify(snapshot).includes('verification placeholder'))
  assert.ok(!JSON.stringify(snapshot).includes('draft'))
  const spending = answerPublicQuestion('How much spending has been reported?', snapshot).content
  assert.match(spending.text, /₹19,250/)
  assert.equal(spending.tab, 'fund')
  const distribution = answerPublicQuestion('Has distribution been completed?', snapshot).content
  assert.match(distribution.text, /planned \(organizer-reported\)/)
  const maple = store.campaigns.find((item) => item.id === 'cmp_maple_sports')!
  assert.equal(answerPublicQuestion('What has happened so far?', buildPublicSnapshot(maple, store)).content.text, NOT_PUBLISHED)
  const offTopic = answerPublicQuestion('What is the capital of France?', snapshot).content
  assert.equal(offTopic.intent, null)
  assert.match(offTopic.text, /only answer a few common questions/)
})

test('sample receipts map to fixed values; uploads are not "read"', () => {
  const result = extractSampleReceipt('sample-van')
  assert.equal(result.content.amountMinor, 125050)
  assert.equal(result.content.currency, 'INR')
  assert.throws(() => extractSampleReceipt('my-upload.jpg'), AiError)
})

test('translations: prepared text for samples only, never the original as a translation', () => {
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_harbour_blankets')!
  const prepared = previewSampleTranslation(campaign.story!.whoItHelps, 'ml').content
  assert.equal(prepared.status, 'prepared')
  assert.ok(prepared.status === 'prepared' && prepared.text.includes('60') && prepared.text !== campaign.story!.whoItHelps)
  assert.equal(previewSampleTranslation('Anything an organizer typed today.', 'ml').content.status, 'not_connected')
  assert.ok(campaign.translations?.ml?.whatItSupports)
  assert.ok(store.referrals.find((item) => item.id === 'ref_priya')?.translations?.ml?.message)
})

test('setup recommendations only offer available games', () => {
  const clothing = recommendCampaignSetup('clothing', ['garden', 'memory']).content
  const game = clothing.find((item) => item.id === 'game')!
  assert.ok(game.id === 'game' && game.gameType === null && /turned off/.test(game.reason))
  const environment = recommendCampaignSetup('environment', ['garden']).content.find((item) => item.id === 'game')!
  assert.ok(environment.id === 'game' && environment.gameType === 'garden')
})

test('service calls can be cancelled and report a simulation label', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(mockAssistant.extractSampleReceipt({ sampleId: 'sample-van' }, { signal: controller.signal }), AiCancelledError)
  const result = await mockAssistant.recommendCampaignSetup({ category: 'education', allowedGames: ['puzzle'] })
  assert.equal(result.label, SIMULATION_LABEL)
  void harbour
})
