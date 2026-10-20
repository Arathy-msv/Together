import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  private data = new Map<string, string>()
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
const memory = new MemoryStorage()
Object.assign(globalThis, { localStorage: memory, sessionStorage: new MemoryStorage() })

const { createOrganizationSeed, ORG_LUMEN, ORG_MAPLE } = await import('../src/data/organizations.ts')
const {
  DEFAULT_ORG_ID,
  effectiveParticipation,
  normalizeOrganization,
  selectableGames,
  slugify,
  validateOrganization,
} = await import('../src/lib/organizations.ts')
const { contrastChecks, contrastRatio, DEFAULT_BRANDING, themeVars } = await import('../src/lib/theme.ts')
const { loadOrganizations, ORG_STORAGE_KEY, saveOrganization } = await import('../src/lib/orgStorage.ts')
const { loadStore, STORAGE_KEY } = await import('../src/lib/storage.ts')
const { blankForm, campaignToForm, formToCampaign, validateSettings } = await import('../src/lib/wizard.ts')
const { activeSteps, nextStep, stepQuestion, validateStep } = await import('../src/lib/assistant.ts')

beforeEach(() => memory.clear())

const seeds = () => createOrganizationSeed()
const byId = (id: string) => seeds().find((org) => org.id === id)!

test('seeds a default organization plus a company, school and nonprofit with different branding', () => {
  const orgs = seeds()
  assert.deepEqual(orgs.map((org) => org.type), ['platform', 'company', 'school', 'nonprofit'])
  assert.equal(new Set(orgs.map((org) => org.branding.primary)).size, orgs.length)
  assert.equal(new Set(orgs.map((org) => org.slug)).size, orgs.length)
})

test('validation reports missing names, duplicate slugs, invalid colours and invalid links', () => {
  const all = seeds()
  const maple = byId(ORG_MAPLE)
  const errors = validateOrganization(
    {
      ...maple,
      name: '  ',
      slug: 'lumen-co',
      branding: { ...maple.branding, primary: 'green' },
      content: { ...maple.content, website: 'javascript:alert(1)', contactEmail: 'nope', socialLinks: [{ label: 'X', url: 'ftp://x' }] },
    },
    all,
  )
  assert.match(errors.name ?? '', /name/)
  assert.match(errors.slug ?? '', /already uses/)
  assert.match(errors['branding.primary'] ?? '', /hex/)
  assert.match(errors['content.website'] ?? '', /https/)
  assert.match(errors['content.contactEmail'] ?? '', /email/)
  assert.match(errors['content.socialLinks.0'] ?? '', /https/)
  assert.deepEqual(validateOrganization(maple, all), {})
})

test('slugify produces URL-safe slugs', () => {
  assert.equal(slugify('Lumen & Co.'), 'lumen-and-co')
  assert.equal(slugify('  École Saint-Michel  '), 'ecole-saint-michel')
})

test('a broken organization record is repaired on its own instead of discarding everything', () => {
  const repaired = normalizeOrganization({ id: 'org_x', name: 'Broken Club', branding: { primary: 'not-a-colour' }, defaults: { games: ['pencil', 'garden'] } })
  assert.ok(repaired)
  assert.equal(repaired.branding.primary, DEFAULT_BRANDING.primary)
  assert.deepEqual(repaired.defaults.games, ['garden'])
  assert.equal(repaired.slug, 'broken-club')
  assert.equal(normalizeOrganization({ name: 'No id' }), null)
})

test('loading organizations keeps valid records, skips junk and restores missing demo organizations', () => {
  const lumen = { ...byId(ORG_LUMEN), name: 'Lumen Renamed' }
  memory.setItem(ORG_STORAGE_KEY, JSON.stringify({ version: 1, organizations: [lumen, 42, { nope: true }] }))
  const orgs = loadOrganizations()
  assert.equal(orgs.find((org) => org.id === ORG_LUMEN)?.name, 'Lumen Renamed')
  assert.equal(orgs.length, 4)
  memory.setItem(ORG_STORAGE_KEY, '{not json')
  assert.equal(loadOrganizations().length, 4)
})

test('saved organization settings persist', () => {
  const maple = loadOrganizations().find((org) => org.id === ORG_MAPLE)!
  saveOrganization({ ...maple, branding: { ...maple.branding, primary: '#224466' } })
  assert.equal(loadOrganizations().find((org) => org.id === ORG_MAPLE)?.branding.primary, '#224466')
})

test('legacy campaigns without an organization are assigned to the default organization', () => {
  memory.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      campaigns: [
        {
          id: 'cmp_old',
          title: 'Old campaign',
          description: 'Saved before organizations existed.',
          coverImageId: 'library',
          organizerName: 'Someone',
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
      contributions: [{ id: 'g1', campaignId: 'cmp_old', amount: 50, method: 'direct', reference: 'DEMO-1', createdAt: new Date().toISOString(), status: 'success' }],
    }),
  )
  const store = loadStore()
  const old = store.campaigns.find((campaign) => campaign.id === 'cmp_old')!
  assert.equal(old.organizationId, DEFAULT_ORG_ID)
  assert.equal(old.currency, 'INR')
  assert.ok(store.contributions.some((gift) => gift.id === 'g1'))
  assert.ok(store.campaigns.some((campaign) => campaign.organizationId === ORG_LUMEN))
})

test('theme falls back to Together colours and always picks readable button text', () => {
  const vars = themeVars({ ...DEFAULT_BRANDING, primary: 'bad', accent: '#ffe066' })
  assert.equal(vars['--org-primary'], DEFAULT_BRANDING.primary)
  assert.ok(contrastRatio(vars['--org-primary'], vars['--org-on-primary']) >= 4.5)
  assert.ok(contrastRatio(vars['--org-accent'], vars['--org-on-accent']) >= 4.5)
  assert.ok(contrastRatio(vars['--org-ink'], vars['--org-bg']) >= 7)
  assert.ok(contrastRatio(vars['--org-link'], vars['--org-bg']) >= 4.5)
})

test('contrast checks warn about hard-to-read combinations', () => {
  const checks = contrastChecks({ ...DEFAULT_BRANDING, primary: '#f3f3a0', background: '#ffffff' })
  assert.equal(checks.find((check) => check.id === 'primary-bg')?.ok, false)
  assert.ok(contrastChecks(DEFAULT_BRANDING).every((check) => check.ok))
})

test('new campaigns start from organization defaults', () => {
  const lumen = byId(ORG_LUMEN)
  const form = blankForm(lumen)
  assert.equal(form.organizationId, ORG_LUMEN)
  assert.equal(form.currency, 'USD')
  assert.deepEqual(form.fixedAmounts, [10, 25, 50])
  assert.equal(form.organizerName, 'Lumen & Co.')
  assert.ok(selectableGames(lumen).includes(form.gameType))
})

test('changing the organization currency does not relabel an existing campaign', () => {
  const lumen = byId(ORG_LUMEN)
  const existing = formToCampaign({ ...blankForm(lumen), title: 'Test', description: 'A long enough description here.' }, { isDraft: true })
  const edited = formToCampaign({ ...campaignToForm(existing), currency: 'GBP' }, { isDraft: false, existing })
  assert.equal(edited.currency, 'USD')
  assert.equal(edited.organizationId, ORG_LUMEN)
})

test('a game turned off by the organization cannot be chosen for a new campaign', () => {
  const maple = byId(ORG_MAPLE)
  const form = { ...blankForm(maple), game: true, gameType: 'jacket' as const }
  assert.match(validateSettings(form, selectableGames(maple)).gameType ?? '', /not available/)
  assert.equal(validateSettings({ ...form, gameType: 'memory' }, selectableGames(maple)).gameType, undefined)
})

test('hiding games switches supporters to direct giving but never leaves a campaign without a way to give', () => {
  const org = { ...byId(ORG_MAPLE), visibility: { ...byId(ORG_MAPLE).visibility, games: false } }
  const both = { participation: { direct: true, game: true } } as Parameters<typeof effectiveParticipation>[0]
  const gameOnly = { participation: { direct: false, game: true } } as Parameters<typeof effectiveParticipation>[0]
  assert.deepEqual(effectiveParticipation(both, org), { direct: true, game: false })
  assert.deepEqual(effectiveParticipation(gameOnly, org), { direct: false, game: true })
})

test('assistant asks one question at a time and skips questions that do not apply', () => {
  const maple = byId(ORG_MAPLE)
  const form = { ...blankForm(maple), direct: true, game: false }
  assert.deepEqual(activeSteps(form), ['purpose', 'category', 'story', 'title', 'goal', 'dates', 'access', 'participation', 'amounts', 'cover'])
  assert.equal(nextStep('participation', form), 'amounts')
  assert.equal(nextStep('cover', form), 'review')
  assert.equal(stepQuestion('purpose', maple), 'Let’s create a campaign for Maple Grove Public School. What are you raising funds for?')
  assert.equal(stepQuestion('purpose', byId(ORG_LUMEN)), 'Let’s create a campaign for Lumen & Co. What are you raising funds for?')
})

test('assistant answers use the campaign form validation rules', () => {
  const form = blankForm(byId(ORG_MAPLE))
  assert.match(validateStep('title', { ...form, title: 'ab' }, []).title ?? '', /at least 3/)
  assert.match(validateStep('goal', { ...form, goalAmount: '0' }, []).goalAmount ?? '', /greater than zero/)
  assert.deepEqual(validateStep('title', { ...form, title: 'Science Lab Kits' }, []), {})
})
