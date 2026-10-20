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

const { canUseVoucherCapability, planEntitles, voucherSelectionError } = await import('../src/lib/features.ts')
const { createOrganization, loadOrganizations, saveOrganization } = await import('../src/lib/orgStorage.ts')
const { loadStore, saveStore } = await import('../src/lib/storage.ts')
const { addContribution } = await import('../src/lib/campaigns.ts')
const addContributionForTest = (campaignId: string, amount: number) =>
  addContribution({ id: crypto.randomUUID(), campaignId, amount, method: 'direct' }).id
const { sanitizeFormForOrg } = await import('../src/lib/featureActions.ts')
const { blankForm, formToCampaign } = await import('../src/lib/wizard.ts')
const v = await import('../src/lib/vouchers.ts')
type Organization = import('../src/lib/types.ts').Organization
type VoucherSettings = import('../src/lib/types.ts').VoucherSettings

beforeEach(() => local.clear())

const now = () => new Date().toISOString()
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

function makeOrg(plan: 'starter' | 'community' | 'organization', settings: Partial<VoucherSettings> | null): Organization {
  const base = createOrganization(plan)
  const org: Organization = {
    ...base,
    features: { ...base.features, partnerVouchers: settings !== null },
    voucherSettings: { contributionRewards: false, storeValueVouchers: false, onlineOffers: false, ...(settings ?? {}) },
    website: { status: 'published', publishedAt: now(), updatedAt: now() },
  }
  return saveOrganization(org)
}

function addCampaign(org: Organization, title: string) {
  const form = blankForm(org)
  form.title = title
  form.description = 'A campaign description long enough for publishing.'
  const campaign = formToCampaign(form, { isDraft: false })
  const store = loadStore()
  store.campaigns.unshift(campaign)
  saveStore(store)
  return campaign
}

function setupOffer(org: Organization, capability: 'contributionRewards' | 'storeValueVouchers' | 'onlineOffers') {
  const merchant = v.addMerchant(org, { name: 'Corner Books', description: '', location: 'Old Town' })
  const offer = v.createOffer(org, {
    merchantId: merchant.id,
    capability,
    title: 'Partner offer',
    terms: 'One per supporter. Not exchangeable for cash.',
    currency: org.defaults.currency,
    validUntil: inDays(30),
    stock: 5,
    minContribution: 100,
    rewardText: '10% off one purchase',
    price: 500,
    storeValue: 500,
    campaignShare: 100,
    discountCode: 'GIVE10',
  })
  v.markTermsReviewed(org, offer.id)
  v.activateOffer(org, offer.id)
  return { merchant, offer }
}

test('vouchers default off for new organizations and the starter plan does not include them', () => {
  const org = createOrganization('community')
  assert.equal(org.features.partnerVouchers, false)
  assert.equal(canUseVoucherCapability(org, 'contributionRewards'), false)
  assert.equal(planEntitles('starter', 'partnerVouchers'), false)
  assert.equal(planEntitles('community', 'partnerVouchers'), true)
})

test('enabling the module requires at least one capability', () => {
  const org = createOrganization('community')
  const features = { ...org.features, partnerVouchers: true }
  assert.match(voucherSelectionError(features, org.voucherSettings) ?? '', /at least one/)
  assert.equal(voucherSelectionError(features, { ...org.voucherSettings, onlineOffers: true }), undefined)
})

test('different organizations keep different capability selections across refresh', () => {
  const a = makeOrg('community', { contributionRewards: true, onlineOffers: true })
  const b = makeOrg('organization', { storeValueVouchers: true })
  const reloaded = loadOrganizations()
  const a2 = reloaded.find((item) => item.id === a.id)!
  const b2 = reloaded.find((item) => item.id === b.id)!
  assert.deepEqual(a2.voucherSettings, { contributionRewards: true, storeValueVouchers: false, onlineOffers: true })
  assert.deepEqual(b2.voucherSettings, { contributionRewards: false, storeValueVouchers: true, onlineOffers: false })
  assert.equal(canUseVoucherCapability(a2, 'storeValueVouchers'), false)
  assert.equal(canUseVoucherCapability(b2, 'storeValueVouchers'), true)
})

test('disabled capabilities and plans are rejected by the actions themselves', () => {
  const off = makeOrg('community', null)
  assert.throws(() => v.addMerchant(off, { name: 'Shop', description: '', location: '' }), /not enabled/)
  const rewardsOnly = makeOrg('community', { contributionRewards: true })
  const merchant = v.addMerchant(rewardsOnly, { name: 'Shop', description: '', location: '' })
  assert.throws(
    () =>
      v.createOffer(rewardsOnly, {
        merchantId: merchant.id,
        capability: 'storeValueVouchers',
        title: 'Credit',
        terms: 'Terms that are long enough.',
        currency: 'INR',
        validUntil: inDays(10),
        stock: null,
        price: 100,
        storeValue: 100,
        campaignShare: 20,
      }),
    /not enabled/,
  )
  const starter = makeOrg('starter', { storeValueVouchers: true })
  assert.equal(canUseVoucherCapability(starter, 'storeValueVouchers'), false)
})

test('campaigns choose offers independently and the marketplace stays hidden until an offer is assigned', () => {
  const org = makeOrg('community', { storeValueVouchers: true })
  const one = addCampaign(org, 'Library books')
  const two = addCampaign(org, 'Garden beds')
  const { offer } = setupOffer(org, 'storeValueVouchers')
  assert.equal(v.publicOffers(org, v.loadVoucherStore(), loadStore()).length, 0)
  v.assignOfferToCampaign(org, offer.id, one.id, true)
  const demo = loadStore()
  const store = v.loadVoucherStore()
  assert.equal(v.campaignOffers(org, store, demo.campaigns.find((item) => item.id === one.id)!).length, 1)
  assert.equal(v.campaignOffers(org, store, demo.campaigns.find((item) => item.id === two.id)!).length, 0)
  assert.equal(v.publicOffers(org, store, demo).length, 1)
})

test('store-value purchases need an explicit eligible campaign and record a pending benefit', () => {
  const org = makeOrg('community', { storeValueVouchers: true })
  const campaign = addCampaign(org, 'Library books')
  const other = addCampaign(org, 'Not assigned')
  const { offer } = setupOffer(org, 'storeValueVouchers')
  v.assignOfferToCampaign(org, offer.id, campaign.id, true)
  const holder = v.ensureSupporterProfile()
  assert.throws(() => v.purchaseStoreValue(org, offer.id, '', holder.id), /Choose which campaign/)
  assert.throws(() => v.purchaseStoreValue(org, offer.id, other.id, holder.id), /not available on that campaign/)
  const voucher = v.purchaseStoreValue(org, offer.id, campaign.id, holder.id)
  assert.equal(voucher.balance, 500)
  assert.equal(voucher.campaignBenefit, 100)
  assert.equal(voucher.benefitStatus, 'pending')
  assert.equal(voucher.campaignId, campaign.id)
})

test('deactivation stops issuance but keeps vouchers, redemption and benefit settlement; re-enabling does not reactivate offers', () => {
  const org = makeOrg('community', { storeValueVouchers: true })
  const campaign = addCampaign(org, 'Library books')
  const { offer } = setupOffer(org, 'storeValueVouchers')
  v.assignOfferToCampaign(org, offer.id, campaign.id, true)
  const holder = v.ensureSupporterProfile()
  const voucher = v.purchaseStoreValue(org, offer.id, campaign.id, holder.id)

  const impact = v.voucherDisableImpact(org, v.loadVoucherStore(), ['storeValueVouchers'])
  assert.equal(impact.activeOffers.length, 1)
  assert.equal(impact.outstandingVouchers, 1)
  assert.equal(impact.pendingBenefits, 1)

  assert.equal(v.pauseOffersForCapabilities(org.id, ['storeValueVouchers']), 1)
  const disabled = saveOrganization({ ...org, features: { ...org.features, partnerVouchers: false } })
  assert.throws(() => v.purchaseStoreValue(disabled, offer.id, campaign.id, holder.id), /not enabled/)
  assert.equal(v.holderVouchers(v.loadVoucherStore(), org.id, holder.id).length, 1)
  assert.equal(v.redeemVoucher(disabled, voucher.id, 200).balance, 300)
  assert.equal(v.settleMerchantBenefit(disabled, voucher.id).benefitStatus, 'settled')

  const enabled = saveOrganization({ ...disabled, features: { ...disabled.features, partnerVouchers: true } })
  const again = v.loadVoucherStore().offers.find((item) => item.id === offer.id)!
  assert.equal(again.status, 'paused')
  assert.equal(again.pausedReason, 'feature-disabled')
  assert.equal(v.offerIsLive(enabled, again, v.loadVoucherStore()), false)
})

test('contribution rewards require a confirmed qualifying contribution and are issued once', () => {
  const org = makeOrg('community', { contributionRewards: true })
  const campaign = addCampaign(org, 'Library books')
  const { offer } = setupOffer(org, 'contributionRewards')
  v.assignOfferToCampaign(org, offer.id, campaign.id, true)
  const holder = v.ensureSupporterProfile()
  const small = addContributionForTest(campaign.id, 50)
  assert.throws(() => v.claimContributionReward(org, offer.id, small, holder.id), /below the reward threshold/)
  const big = addContributionForTest(campaign.id, 250)
  const first = v.claimContributionReward(org, offer.id, big, holder.id)
  const second = v.claimContributionReward(org, offer.id, big, holder.id)
  assert.equal(first.id, second.id)
  assert.equal(v.loadVoucherStore().offers.find((item) => item.id === offer.id)!.issuedCount, 1)
})

test('wallets are scoped to the selected demo supporter profile', () => {
  const org = makeOrg('community', { onlineOffers: true })
  const campaign = addCampaign(org, 'Library books')
  const { offer } = setupOffer(org, 'onlineOffers')
  v.assignOfferToCampaign(org, offer.id, campaign.id, true)
  const asha = v.createSupporterProfile('Asha')
  v.claimOnlineOffer(org, offer.id, campaign.id, asha.id)
  const ravi = v.createSupporterProfile('Ravi')
  assert.equal(v.currentSupporterProfile()?.id, ravi.id)
  assert.equal(v.holderVouchers(v.loadVoucherStore(), org.id, ravi.id).length, 0)
  v.selectSupporterProfile(asha.id)
  assert.equal(v.holderVouchers(v.loadVoucherStore(), org.id, v.currentSupporterProfile()!.id).length, 1)
})

test('organizations cannot see or manage another organization’s merchants, offers or vouchers', () => {
  const a = makeOrg('community', { storeValueVouchers: true })
  const b = makeOrg('community', { storeValueVouchers: true })
  const campaignA = addCampaign(a, 'A campaign')
  const campaignB = addCampaign(b, 'B campaign')
  const { offer } = setupOffer(a, 'storeValueVouchers')
  v.assignOfferToCampaign(a, offer.id, campaignA.id, true)
  const voucher = v.purchaseStoreValue(a, offer.id, campaignA.id, v.ensureSupporterProfile().id)
  const store = v.loadVoucherStore()
  assert.equal(v.orgMerchants(store, b.id).length, 0)
  assert.equal(v.orgOffers(store, b.id).length, 0)
  assert.equal(v.orgVouchers(store, b.id).length, 0)
  assert.throws(() => v.redeemVoucher(b, voucher.id, 10), /does not belong/)
  assert.throws(() => v.assignOfferToCampaign(b, offer.id, campaignB.id, true), /does not belong/)
  assert.throws(() => v.assignOfferToCampaign(a, offer.id, campaignB.id, true), /does not belong/)
})

test('campaign forms drop offers the organization cannot use', () => {
  const org = makeOrg('community', { onlineOffers: true })
  addCampaign(org, 'Library books')
  const { offer } = setupOffer(org, 'onlineOffers')
  const form = { ...blankForm(org), partnerOfferIds: [offer.id, 'off_missing'] }
  assert.deepEqual(sanitizeFormForOrg(form, org).partnerOfferIds, [offer.id])
  const off = saveOrganization({ ...org, features: { ...org.features, partnerVouchers: false } })
  assert.deepEqual(sanitizeFormForOrg(form, off).partnerOfferIds, [])
})

test('organizations saved before the module keep capabilities they already used', () => {
  const org = createOrganization('community')
  local.setItem(
    v.VOUCHER_STORAGE_KEY,
    JSON.stringify({ version: 1, merchants: [], offers: [{ id: 'off_old', organizationId: org.id, capability: 'onlineOffers' }], vouchers: [] }),
  )
  const raw = JSON.parse(local.getItem('together.organizations.v1')!)
  for (const item of raw.organizations) {
    if (item.id === org.id) {
      delete item.features.partnerVouchers
      delete item.voucherSettings
    }
  }
  local.setItem('together.organizations.v1', JSON.stringify(raw))
  const migrated = loadOrganizations().find((item) => item.id === org.id)!
  assert.equal(migrated.features.partnerVouchers, true)
  assert.equal(migrated.voucherSettings.onlineOffers, true)
  assert.equal(migrated.voucherSettings.storeValueVouchers, false)
})
