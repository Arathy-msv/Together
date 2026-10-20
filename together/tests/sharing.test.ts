import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PNG } from 'pngjs'
import jsQR from 'jsqr'

const { buildShareContent, shareAssetFilename } = await import('../src/lib/sharing.ts')
const { qrPngDataUrl, qrSvgString } = await import('../src/lib/qr.ts')
const { DEFAULT_BRANDING } = await import('../src/lib/theme.ts')
import type { Campaign, Organization, Referral } from '../src/lib/types.ts'

function baseOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 'org_together',
    slug: 'together',
    name: 'Riverside School PTA',
    type: 'school',
    logo: '',
    favicon: '',
    tagline: 'Giving together',
    about: 'A parent-run association raising funds for Riverside School.',
    branding: DEFAULT_BRANDING,
    content: {
      headline: 'Give together',
      description: 'Support our campaigns',
      heroImage: '/covers/hero-library.jpg',
      ctaLabel: 'Give now',
      contactEmail: 'hello@riverside.example',
      location: 'Pune, India',
      footerText: 'Riverside School PTA',
      website: '',
      socialLinks: [],
      supporterNoun: 'families',
      impactTitle: 'Our impact',
      impactStory: '',
    },
    defaults: { currency: 'INR', suggestedAmounts: [100, 250, 500], visibility: 'open', durationDays: 30, games: ['garden'] },
    visibility: { games: true, direct: true, impactStories: true, assistant: true, poweredBy: true },
    plan: { id: 'community', selectedAt: new Date().toISOString() },
    features: {
      sponsorPlay: false,
      updateCommitments: false,
      shareKit: true,
      campaignDuplication: false,
      reviewApproval: false,
      lowDataMode: false,
      recordExports: false,
      supporterHistory: false,
      partnerVouchers: false,
    },
    voucherSettings: { contributionRewards: false, storeValueVouchers: false, onlineOffers: false },
    featureHistory: [],
    website: { status: 'published', updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Organization
}

function baseCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'cmp_library',
    organizationId: 'org_together',
    currency: 'INR',
    title: 'Grow Our School Library',
    description: 'Help us fill our school library with more books for every child to enjoy. Every rupee buys a book a child can keep.',
    coverImageId: 'library',
    organizerName: 'Riverside School PTA',
    access: 'open',
    goalAmount: 50000,
    donationMode: 'fixed',
    fixedAmounts: [100, 250, 500],
    opensAt: new Date(Date.now() - 86_400_000).toISOString(),
    closesAt: new Date(Date.now() + 86_400_000 * 20).toISOString(),
    autoCloseOnGoal: true,
    participation: { direct: true, game: true },
    gameType: 'garden',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Campaign
}

function baseReferral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: 'ref_anna',
    campaignId: 'cmp_library',
    organizationId: 'org_together',
    code: 'anna-4f2k',
    displayName: 'Anna Fernandes',
    headline: 'Books changed my childhood',
    message: 'I grew up borrowing books from this library and want today’s students to have the same chance.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Referral
}

async function decodeQrPng(dataUrl: string): Promise<string | null> {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const buffer = Buffer.from(base64, 'base64')
  const png = PNG.sync.read(buffer)
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  return result ? result.data : null
}

test('the original campaign kit resolves the campaign URL with no referral code attached', () => {
  const org = baseOrg()
  const campaign = baseCampaign()
  const url = 'https://giving.example/o/together/campaigns/cmp_library'
  const content = buildShareContent({ mode: 'campaign', org, campaign, url })
  assert.equal(content.url, url)
  assert.equal(content.attribution, undefined)
  assert.ok(content.whatsapp.includes(url))
  assert.ok(content.email.body.includes(url))
  assert.ok(!/\/r\//.test(content.url), 'the original campaign link never gains a referral segment')
})

test('a referral kit resolves the referrer’s own URL and carries their introduction', () => {
  const org = baseOrg()
  const campaign = baseCampaign()
  const referral = baseReferral()
  const url = 'https://giving.example/o/together/campaigns/cmp_library/r/anna-4f2k'
  const content = buildShareContent({ mode: 'referral', org, campaign, url, referral })
  assert.equal(content.url, url)
  assert.ok(content.url.includes('/r/anna-4f2k'))
  assert.equal(content.attribution?.name, 'Anna Fernandes')
  assert.equal(content.attribution?.intro, referral.message)
  assert.ok(content.whatsapp.includes(referral.message))
  assert.ok(content.whatsapp.includes(url))
})

test('campaign and referral kits for the same campaign never share a URL', () => {
  const org = baseOrg()
  const campaign = baseCampaign()
  const referral = baseReferral()
  const campaignUrl = 'https://giving.example/o/together/campaigns/cmp_library'
  const referralUrl = `${campaignUrl}/r/${referral.code}`
  const campaignContent = buildShareContent({ mode: 'campaign', org, campaign, url: campaignUrl })
  const referralContent = buildShareContent({ mode: 'referral', org, campaign, url: referralUrl, referral })
  assert.notEqual(campaignContent.url, referralContent.url)
  assert.ok(referralContent.url.startsWith(campaignContent.url))
})

test('closed-group access codes never appear in generated sharing content', () => {
  const org = baseOrg()
  const closedCampaign = baseCampaign({ id: 'cmp_circle', title: 'Class Circle', access: 'closed', accessCode: 'CLASS1' })
  const url = 'https://giving.example/o/together/campaigns/cmp_circle'
  const content = buildShareContent({ mode: 'campaign', org, campaign: closedCampaign, url })
  const serialized = JSON.stringify(content)
  assert.ok(!serialized.includes('CLASS1'), 'the access code must never be embedded in sharing content')
})

test('sharing content never includes donor names, budgets or internal notes', () => {
  const org = baseOrg()
  const campaign = baseCampaign({
    budget: [{ id: 'b1', label: 'Internal vendor contact: Rohan 98765', amount: '5000' }],
    fundingNote: 'Internal note: do not publish spending beyond simulated gifts.',
  })
  const content = buildShareContent({ mode: 'campaign', org, campaign, url: 'https://giving.example/o/together/campaigns/cmp_library' })
  const serialized = JSON.stringify(content)
  assert.ok(!serialized.includes('Rohan 98765'))
  assert.ok(!serialized.includes('Internal note'))
})

test('WhatsApp and email drafts keep line breaks and special characters intact for encoding', () => {
  const org = baseOrg({ name: "Riverside School PTA — élan" })
  const campaign = baseCampaign()
  const content = buildShareContent({ mode: 'campaign', org, campaign, url: 'https://giving.example/o/together/campaigns/cmp_library' })
  assert.ok(content.whatsapp.includes('\n\n'), 'WhatsApp message keeps paragraph breaks')
  assert.ok(content.email.body.includes('\n'), 'Email body keeps line breaks')
  const encodedWa = encodeURIComponent(content.whatsapp)
  assert.ok(decodeURIComponent(encodedWa) === content.whatsapp, 'round-tripping through encodeURIComponent is lossless')
  assert.ok(content.whatsapp.includes('élan'), 'accented characters survive unescaped in the draft')
})

test('download filenames are descriptive and filesystem-safe', () => {
  const name = shareAssetFilename('Grow Our School Library', 'poster', 'png', 'Anna Fernandes')
  assert.equal(name, 'grow-our-school-library-anna-fernandes-poster.png')
  assert.doesNotMatch(name, /[^a-z0-9.-]/)
  const campaignOnly = shareAssetFilename('Grow Our School Library', 'qr', 'svg')
  assert.equal(campaignOnly, 'grow-our-school-library-qr.svg')
})

test('a generated QR code decodes back to exactly the resolved campaign URL', async () => {
  const url = 'https://giving.example/o/together/campaigns/cmp_library'
  const dataUrl = await qrPngDataUrl(url, { size: 320, margin: 4 })
  assert.match(dataUrl, /^data:image\/png;base64,/)
  const decoded = await decodeQrPng(dataUrl)
  assert.equal(decoded, url)
})

test('a generated QR code decodes back to exactly the resolved referral URL, not the campaign URL', async () => {
  const referralUrl = 'https://giving.example/o/together/campaigns/cmp_library/r/anna-4f2k'
  const dataUrl = await qrPngDataUrl(referralUrl, { size: 320, margin: 4 })
  const decoded = await decodeQrPng(dataUrl)
  assert.equal(decoded, referralUrl)
  assert.notEqual(decoded, 'https://giving.example/o/together/campaigns/cmp_library')
})

test('a requested margin below the required quiet zone is raised to the minimum and still decodes', async () => {
  const url = 'https://giving.example/o/together/campaigns/cmp_library'
  const svg = await qrSvgString(url, { size: 200, margin: 0 })
  assert.match(svg, /<svg/)
  const dataUrl = await qrPngDataUrl(url, { size: 240, margin: 1 })
  const decoded = await decodeQrPng(dataUrl)
  assert.equal(decoded, url, 'the enforced 4-module quiet zone keeps the code scannable even when a thinner margin is requested')
})

test('a long campaign URL still produces a QR code that decodes exactly', async () => {
  const url = 'https://giving.example/o/together/campaigns/cmp_library/r/anna-fernandes-a-very-long-personalised-sharing-code-98765'
  const dataUrl = await qrPngDataUrl(url, { size: 320, margin: 4 })
  const decoded = await decodeQrPng(dataUrl)
  assert.equal(decoded, url)
})
