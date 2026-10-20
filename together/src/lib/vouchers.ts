import { canUseVoucherCapability, capabilityName, VOUCHER_CAPABILITIES } from './features.ts'
import { formatMoney, isCurrencyCode } from './format.ts'
import { loadStore, notifyChange, saveStore, StorageFullError } from './storage.ts'
import { statusOf } from './campaigns.ts'
import type { Campaign, CurrencyCode, DemoStore, Organization, VoucherCapability } from './types.ts'

/*
 * Give & Get Local: fictional partner stores, offers and issued vouchers. Everything is simulated and
 * saved in this browser only. Every management query is scoped by organizationId; supporter wallets
 * are scoped to the selected local demo supporter profile. These checks demonstrate behaviour; they
 * are not production security.
 */

export { VOUCHER_STORAGE_KEY, voucherUsage } from './voucherUsage.ts'
import { VOUCHER_STORAGE_KEY } from './voucherUsage.ts'
export const SUPPORTER_PROFILES_KEY = 'together.supporterProfiles.v1'

export interface Merchant {
  id: string
  name: string
  description: string
  location: string
  /** Organizations this fictional store has an explicit relationship with. */
  organizationIds: string[]
  createdAt: string
}

export type OfferStatus = 'draft' | 'active' | 'paused'

export interface PartnerOffer {
  id: string
  organizationId: string
  merchantId: string
  capability: VoucherCapability
  title: string
  terms: string
  currency: CurrencyCode
  /** Contribution rewards: smallest confirmed contribution that qualifies. */
  minContribution?: number
  /** Contribution rewards and online offers: what the supporter gets, e.g. “10% off one order”. */
  rewardText?: string
  /** Store-value vouchers: what the supporter pays. */
  price?: number
  /** Store-value vouchers: credit the store honours. */
  storeValue?: number
  /** Store-value vouchers: stated part of the price that supports the campaign. */
  campaignShare?: number
  /** Online offers: partner-issued code. */
  discountCode?: string
  /** Online offers: approved shopping link. */
  shopUrl?: string
  validUntil: string
  /** Remaining vouchers, or null for no limit. */
  stock: number | null
  issuedCount: number
  status: OfferStatus
  termsReviewedAt?: string
  /** Why an offer is paused. Feature pauses are never undone automatically. */
  pausedReason?: 'manual' | 'feature-disabled'
  createdAt: string
  updatedAt: string
}

export interface VoucherRedemption {
  id: string
  at: string
  amount?: number
  note: string
}

export interface IssuedVoucher {
  id: string
  code: string
  organizationId: string
  offerId: string
  merchantId: string
  campaignId: string
  holderId: string
  capability: VoucherCapability
  title: string
  terms: string
  currency: CurrencyCode
  validUntil: string
  rewardText?: string
  discountCode?: string
  shopUrl?: string
  balance?: number
  pricePaid?: number
  campaignBenefit?: number
  benefitStatus?: 'pending' | 'settled'
  contributionId?: string
  status: 'active' | 'redeemed'
  redemptions: VoucherRedemption[]
  issuedAt: string
}

export interface VoucherStore {
  version: 1
  merchants: Merchant[]
  offers: PartnerOffer[]
  vouchers: IssuedVoucher[]
}

export interface SupporterProfile {
  id: string
  name: string
  createdAt: string
}

const CAPABILITY_KEYS = VOUCHER_CAPABILITIES.map((capability) => capability.key)

function emptyStore(): VoucherStore {
  return { version: 1, merchants: [], offers: [], vouchers: [] }
}

function asArray<T>(value: unknown, keep: (item: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').filter(keep) as T[]
}

/** Reads the voucher store record by record so one broken entry never hides the others. */
export function loadVoucherStore(): VoucherStore {
  try {
    const raw = localStorage.getItem(VOUCHER_STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<VoucherStore>
    return {
      version: 1,
      merchants: asArray<Merchant>(parsed.merchants, (item) => typeof item.id === 'string' && Array.isArray(item.organizationIds)),
      offers: asArray<PartnerOffer>(
        parsed.offers,
        (item) => typeof item.id === 'string' && typeof item.organizationId === 'string' && CAPABILITY_KEYS.includes(item.capability as VoucherCapability),
      ).map((offer) => ({ ...offer, currency: isCurrencyCode(offer.currency) ? offer.currency : 'INR' })),
      vouchers: asArray<IssuedVoucher>(
        parsed.vouchers,
        (item) => typeof item.id === 'string' && typeof item.organizationId === 'string' && typeof item.holderId === 'string',
      ).map((voucher) => ({ ...voucher, redemptions: Array.isArray(voucher.redemptions) ? voucher.redemptions : [] })),
    }
  } catch {
    return emptyStore()
  }
}

export function saveVoucherStore(store: VoucherStore): void {
  try {
    localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(store))
  } catch {
    throw new StorageFullError()
  }
  notifyChange()
}

/* ---------- Local demo supporter profiles ---------- */

interface ProfileRecord {
  currentId: string | null
  profiles: SupporterProfile[]
}

function readProfiles(): ProfileRecord {
  try {
    const parsed = JSON.parse(localStorage.getItem(SUPPORTER_PROFILES_KEY) ?? 'null') as Partial<ProfileRecord> | null
    const profiles = Array.isArray(parsed?.profiles) ? parsed!.profiles.filter((item) => typeof item?.id === 'string' && typeof item?.name === 'string') : []
    const currentId = typeof parsed?.currentId === 'string' && profiles.some((item) => item.id === parsed.currentId) ? parsed.currentId : null
    return { currentId, profiles }
  } catch {
    return { currentId: null, profiles: [] }
  }
}

function writeProfiles(record: ProfileRecord): void {
  try {
    localStorage.setItem(SUPPORTER_PROFILES_KEY, JSON.stringify(record))
  } catch {
    throw new StorageFullError()
  }
  notifyChange()
}

export function listSupporterProfiles(): SupporterProfile[] {
  return readProfiles().profiles
}

export function currentSupporterProfile(): SupporterProfile | null {
  const record = readProfiles()
  return record.profiles.find((item) => item.id === record.currentId) ?? null
}

/** The selected profile, creating a first one if this device has none yet. */
export function ensureSupporterProfile(): SupporterProfile {
  const existing = currentSupporterProfile()
  if (existing) return existing
  return createSupporterProfile('Demo supporter')
}

export function createSupporterProfile(rawName: string): SupporterProfile {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 40) || 'Demo supporter'
  const record = readProfiles()
  const profile: SupporterProfile = { id: `sup_${crypto.randomUUID().slice(0, 12)}`, name, createdAt: new Date().toISOString() }
  writeProfiles({ currentId: profile.id, profiles: [...record.profiles, profile] })
  return profile
}

export function selectSupporterProfile(id: string): void {
  const record = readProfiles()
  if (!record.profiles.some((item) => item.id === id)) return
  writeProfiles({ ...record, currentId: id })
}

/* ---------- Scoped queries ---------- */

export function orgMerchants(store: VoucherStore, organizationId: string): Merchant[] {
  return store.merchants.filter((merchant) => merchant.organizationIds.includes(organizationId))
}

export function orgOffers(store: VoucherStore, organizationId: string): PartnerOffer[] {
  return store.offers.filter((offer) => offer.organizationId === organizationId)
}

export function orgVouchers(store: VoucherStore, organizationId: string): IssuedVoucher[] {
  return store.vouchers.filter((voucher) => voucher.organizationId === organizationId)
}

export function holderVouchers(store: VoucherStore, organizationId: string, holderId: string | undefined): IssuedVoucher[] {
  if (!holderId) return []
  return store.vouchers.filter((voucher) => voucher.organizationId === organizationId && voucher.holderId === holderId)
}

export function merchantFor(store: VoucherStore, organizationId: string, merchantId: string): Merchant | undefined {
  return orgMerchants(store, organizationId).find((merchant) => merchant.id === merchantId)
}

export function isExpired(item: { validUntil: string }, now = Date.now()): boolean {
  const end = Date.parse(item.validUntil)
  return Number.isNaN(end) || end < now
}

/** Live means a supporter could use this offer right now. */
export function offerIsLive(org: Organization, offer: PartnerOffer, store: VoucherStore, now = Date.now()): boolean {
  return (
    offer.organizationId === org.id &&
    offer.status === 'active' &&
    canUseVoucherCapability(org, offer.capability) &&
    Boolean(merchantFor(store, org.id, offer.merchantId)) &&
    !isExpired(offer, now) &&
    (offer.stock === null || offer.stock > 0)
  )
}

/** Offers a campaign creator may attach: live, owned by this organization, matching currency. */
export function eligibleOffersForCampaign(org: Organization, store: VoucherStore, campaign: Pick<Campaign, 'currency' | 'organizationId'>): PartnerOffer[] {
  if (campaign.organizationId !== org.id) return []
  return orgOffers(store, org.id).filter((offer) => offerIsLive(org, offer, store) && offer.currency === campaign.currency)
}

/** Offers shown on a campaign page: chosen by that campaign and still live. */
export function campaignOffers(org: Organization, store: VoucherStore, campaign: Campaign): PartnerOffer[] {
  const chosen = new Set(campaign.partnerOfferIds ?? [])
  return eligibleOffersForCampaign(org, store, campaign).filter((offer) => chosen.has(offer.id))
}

function campaignIsLive(campaign: Campaign, demo: DemoStore): boolean {
  if (campaign.isDraft) return false
  const status = statusOf(campaign, demo.contributions)
  return status === 'active' || status === 'scheduled'
}

/** Live campaigns of this organization that show the offer. */
export function campaignsForOffer(org: Organization, offer: PartnerOffer, demo: DemoStore, store: VoucherStore): Campaign[] {
  return demo.campaigns.filter(
    (campaign) => campaign.organizationId === org.id && campaignIsLive(campaign, demo) && campaignOffers(org, store, campaign).some((item) => item.id === offer.id),
  )
}

/** Offers for the public “Partner offers” page. Empty unless the module is usable and offers are assigned. */
export function publicOffers(org: Organization, store: VoucherStore, demo: DemoStore): PartnerOffer[] {
  return orgOffers(store, org.id).filter((offer) => offerIsLive(org, offer, store) && campaignsForOffer(org, offer, demo, store).length > 0)
}

/** One-line summary of what a supporter gets. */
export function offerValueLine(offer: PartnerOffer): string {
  if (offer.capability === 'contributionRewards') return `${offer.rewardText} · for contributions of ${formatMoney(offer.minContribution ?? 0, offer.currency)} or more`
  if (offer.capability === 'storeValueVouchers')
    return `Pay ${formatMoney(offer.price ?? 0, offer.currency)} · get ${formatMoney(offer.storeValue ?? 0, offer.currency)} store credit · ${formatMoney(offer.campaignShare ?? 0, offer.currency)} supports the campaign`
  return offer.rewardText ?? 'Online partner offer'
}

/* ---------- Management actions (organization admin demo role) ---------- */

function assertModule(org: Organization): void {
  if (!VOUCHER_CAPABILITIES.some((capability) => canUseVoucherCapability(org, capability.key))) {
    throw new Error('Give & Get Local is not enabled for this organization. Turn it on in Settings → Website features.')
  }
}

function assertCapability(org: Organization, capability: VoucherCapability): void {
  if (!canUseVoucherCapability(org, capability)) {
    throw new Error(`${capabilityName(capability)} is not enabled for this organization.`)
  }
}

function ownOffer(store: VoucherStore, org: Organization, offerId: string): PartnerOffer {
  const offer = store.offers.find((item) => item.id === offerId && item.organizationId === org.id)
  if (!offer) throw new Error('That offer does not belong to this organization.')
  return offer
}

function ownVoucher(store: VoucherStore, org: Organization, voucherId: string): IssuedVoucher {
  const voucher = store.vouchers.find((item) => item.id === voucherId && item.organizationId === org.id)
  if (!voucher) throw new Error('That voucher does not belong to this organization.')
  return voucher
}

export interface MerchantInput {
  name: string
  description: string
  location: string
}

export function addMerchant(org: Organization, input: MerchantInput): Merchant {
  assertModule(org)
  const name = input.name.trim().slice(0, 80)
  if (name.length < 2) throw new Error('Give the partner store a name.')
  const store = loadVoucherStore()
  const merchant: Merchant = {
    id: `mer_${crypto.randomUUID().slice(0, 12)}`,
    name,
    description: input.description.trim().slice(0, 240),
    location: input.location.trim().slice(0, 120),
    organizationIds: [org.id],
    createdAt: new Date().toISOString(),
  }
  store.merchants.push(merchant)
  saveVoucherStore(store)
  return merchant
}

export interface OfferInput {
  merchantId: string
  capability: VoucherCapability
  title: string
  terms: string
  currency: CurrencyCode
  validUntil: string
  stock: number | null
  minContribution?: number
  rewardText?: string
  price?: number
  storeValue?: number
  campaignShare?: number
  discountCode?: string
  shopUrl?: string
}

const positive = (value: number | undefined): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0

export function validateOffer(input: OfferInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.title.trim().length < 3) errors.title = 'Give the offer a short title.'
  if (input.terms.trim().length < 10) errors.terms = 'Write the terms supporters must know, at least one sentence.'
  if (Number.isNaN(Date.parse(input.validUntil)) || Date.parse(input.validUntil) < Date.now()) errors.validUntil = 'Choose a future end date.'
  if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 1)) errors.stock = 'Use a whole number of vouchers, or leave empty for no limit.'
  if (input.capability === 'contributionRewards') {
    if (!positive(input.minContribution)) errors.minContribution = 'Set the smallest contribution that qualifies.'
    if (!input.rewardText?.trim()) errors.rewardText = 'Describe the reward, e.g. “10% off one purchase”.'
  }
  if (input.capability === 'storeValueVouchers') {
    if (!positive(input.price)) errors.price = 'Set what the supporter pays.'
    if (!positive(input.storeValue)) errors.storeValue = 'Set the store credit value.'
    if (!positive(input.campaignShare)) errors.campaignShare = 'State how much supports the campaign.'
    else if (positive(input.price) && input.campaignShare > input.price) errors.campaignShare = 'The campaign share cannot be more than the price.'
  }
  if (input.capability === 'onlineOffers') {
    if (!input.rewardText?.trim()) errors.rewardText = 'Describe the discount.'
    if (!input.discountCode?.trim() && !input.shopUrl?.trim()) errors.discountCode = 'Add a partner code or an approved shopping link.'
    if (input.shopUrl?.trim() && !/^https:\/\/[^\s]+\.[^\s]+$/.test(input.shopUrl.trim())) errors.shopUrl = 'Use a full https:// link.'
  }
  return errors
}

export function createOffer(org: Organization, input: OfferInput): PartnerOffer {
  assertCapability(org, input.capability)
  const store = loadVoucherStore()
  if (!merchantFor(store, org.id, input.merchantId)) throw new Error('Choose one of your partner stores.')
  const errors = validateOffer(input)
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0])
  const now = new Date().toISOString()
  const offer: PartnerOffer = {
    id: `off_${crypto.randomUUID().slice(0, 12)}`,
    organizationId: org.id,
    merchantId: input.merchantId,
    capability: input.capability,
    title: input.title.trim().slice(0, 80),
    terms: input.terms.trim().slice(0, 600),
    currency: input.currency,
    validUntil: new Date(input.validUntil).toISOString(),
    stock: input.stock,
    issuedCount: 0,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...(input.capability === 'contributionRewards' ? { minContribution: input.minContribution, rewardText: input.rewardText?.trim().slice(0, 120) } : {}),
    ...(input.capability === 'storeValueVouchers' ? { price: input.price, storeValue: input.storeValue, campaignShare: input.campaignShare } : {}),
    ...(input.capability === 'onlineOffers'
      ? { rewardText: input.rewardText?.trim().slice(0, 120), discountCode: input.discountCode?.trim().toUpperCase().slice(0, 30) || undefined, shopUrl: input.shopUrl?.trim() || undefined }
      : {}),
  }
  store.offers.push(offer)
  saveVoucherStore(store)
  return offer
}

function updateOffer(org: Organization, offerId: string, change: (offer: PartnerOffer) => void): PartnerOffer {
  const store = loadVoucherStore()
  const offer = ownOffer(store, org, offerId)
  change(offer)
  offer.updatedAt = new Date().toISOString()
  saveVoucherStore(store)
  return offer
}

export function markTermsReviewed(org: Organization, offerId: string): PartnerOffer {
  return updateOffer(org, offerId, (offer) => {
    offer.termsReviewedAt = new Date().toISOString()
  })
}

export function activateOffer(org: Organization, offerId: string): PartnerOffer {
  return updateOffer(org, offerId, (offer) => {
    assertCapability(org, offer.capability)
    if (!offer.termsReviewedAt) throw new Error('Review the offer terms before activating it.')
    if (isExpired(offer)) throw new Error('This offer has ended. Create a new offer with a future end date.')
    offer.status = 'active'
    offer.pausedReason = undefined
  })
}

export function pauseOffer(org: Organization, offerId: string): PartnerOffer {
  return updateOffer(org, offerId, (offer) => {
    offer.status = 'paused'
    offer.pausedReason = 'manual'
  })
}

/** Adds or removes an offer on a campaign. Removing is always allowed; adding requires eligibility. */
export function assignOfferToCampaign(org: Organization, offerId: string, campaignId: string, assigned: boolean): void {
  const store = loadVoucherStore()
  const offer = ownOffer(store, org, offerId)
  const demo = loadStore()
  const campaign = demo.campaigns.find((item) => item.id === campaignId)
  if (!campaign || campaign.organizationId !== org.id) throw new Error('That campaign does not belong to this organization.')
  const current = new Set(campaign.partnerOfferIds ?? [])
  if (assigned) {
    assertCapability(org, offer.capability)
    if (offer.currency !== campaign.currency) throw new Error(`This offer uses ${offer.currency}; the campaign uses ${campaign.currency}.`)
    current.add(offer.id)
  } else {
    current.delete(offer.id)
  }
  campaign.partnerOfferIds = [...current]
  saveStore(demo)
}

/** Redemption stays available after deactivation so issued vouchers are never silently cancelled. */
export function redeemVoucher(org: Organization, voucherId: string, amount?: number): IssuedVoucher {
  const store = loadVoucherStore()
  const voucher = ownVoucher(store, org, voucherId)
  if (voucher.status === 'redeemed') throw new Error('This voucher has already been fully used.')
  if (isExpired(voucher)) throw new Error('This voucher has expired under its terms.')
  const now = new Date().toISOString()
  if (voucher.capability === 'storeValueVouchers') {
    const balance = voucher.balance ?? 0
    if (!positive(amount) || amount > balance) throw new Error(`Enter a whole amount up to the remaining balance of ${balance}.`)
    voucher.balance = balance - amount
    voucher.redemptions.push({ id: crypto.randomUUID(), at: now, amount, note: 'Store credit used at partner store (demo)' })
    if (voucher.balance === 0) voucher.status = 'redeemed'
  } else {
    voucher.redemptions.push({ id: crypto.randomUUID(), at: now, note: 'Offer used at partner store (demo)' })
    voucher.status = 'redeemed'
  }
  saveVoucherStore(store)
  return voucher
}

/** Marks a store-value campaign share as passed on by the merchant. Allowed after deactivation. */
export function settleMerchantBenefit(org: Organization, voucherId: string): IssuedVoucher {
  const store = loadVoucherStore()
  const voucher = ownVoucher(store, org, voucherId)
  if (voucher.benefitStatus !== 'pending') throw new Error('There is no pending benefit on this voucher.')
  voucher.benefitStatus = 'settled'
  saveVoucherStore(store)
  return voucher
}

/* ---------- Issuance (supporter actions) ---------- */

function voucherCode(): string {
  const part = () => crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()
  return `GGL-${part()}-${part()}`
}

function liveCampaignOffer(org: Organization, store: VoucherStore, demo: DemoStore, offerId: string, campaignId: string, capability: VoucherCapability) {
  assertCapability(org, capability)
  const campaign = demo.campaigns.find((item) => item.id === campaignId)
  if (!campaign || campaign.organizationId !== org.id) throw new Error('Choose a campaign from this organization.')
  const offer = campaignOffers(org, store, campaign).find((item) => item.id === offerId)
  if (!offer || offer.capability !== capability) throw new Error('This offer is not available on that campaign.')
  return { campaign, offer: store.offers.find((item) => item.id === offer.id)! }
}

function issue(store: VoucherStore, offer: PartnerOffer, campaign: Campaign, holderId: string, extra: Partial<IssuedVoucher>): IssuedVoucher {
  const voucher: IssuedVoucher = {
    id: `vch_${crypto.randomUUID().slice(0, 12)}`,
    code: voucherCode(),
    organizationId: offer.organizationId,
    offerId: offer.id,
    merchantId: offer.merchantId,
    campaignId: campaign.id,
    holderId,
    capability: offer.capability,
    title: offer.title,
    terms: offer.terms,
    currency: offer.currency,
    validUntil: offer.validUntil,
    rewardText: offer.rewardText,
    status: 'active',
    redemptions: [],
    issuedAt: new Date().toISOString(),
    ...extra,
  }
  offer.issuedCount += 1
  if (offer.stock !== null) offer.stock -= 1
  store.vouchers.push(voucher)
  return voucher
}

/** Contribution reward for a confirmed contribution that meets the offer threshold. One per contribution and offer. */
export function claimContributionReward(org: Organization, offerId: string, contributionId: string, holderId: string): IssuedVoucher {
  const store = loadVoucherStore()
  const demo = loadStore()
  const contribution = demo.contributions.find((item) => item.id === contributionId && item.status === 'success')
  if (!contribution) throw new Error('This reward needs a confirmed contribution.')
  const existing = store.vouchers.find((item) => item.offerId === offerId && item.contributionId === contributionId)
  if (existing) return existing
  const { campaign, offer } = liveCampaignOffer(org, store, demo, offerId, contribution.campaignId, 'contributionRewards')
  if (contribution.amount < (offer.minContribution ?? 0)) throw new Error('This contribution is below the reward threshold.')
  const voucher = issue(store, offer, campaign, holderId, { contributionId })
  saveVoucherStore(store)
  return voucher
}

/** Simulated store-credit purchase. The beneficiary campaign is always explicit. */
export function purchaseStoreValue(org: Organization, offerId: string, campaignId: string, holderId: string): IssuedVoucher {
  if (!campaignId) throw new Error('Choose which campaign this purchase supports.')
  const store = loadVoucherStore()
  const demo = loadStore()
  const { campaign, offer } = liveCampaignOffer(org, store, demo, offerId, campaignId, 'storeValueVouchers')
  if (!campaignIsLive(campaign, demo) || statusOf(campaign, demo.contributions) !== 'active') throw new Error('That campaign is not accepting support right now.')
  const voucher = issue(store, offer, campaign, holderId, {
    balance: offer.storeValue,
    pricePaid: offer.price,
    campaignBenefit: offer.campaignShare,
    benefitStatus: 'pending',
  })
  saveVoucherStore(store)
  return voucher
}

/** Reveals an online partner offer and keeps it in the holder’s wallet. One per holder and offer. */
export function claimOnlineOffer(org: Organization, offerId: string, campaignId: string, holderId: string): IssuedVoucher {
  const store = loadVoucherStore()
  const existing = store.vouchers.find((item) => item.offerId === offerId && item.holderId === holderId && item.organizationId === org.id)
  if (existing) return existing
  const demo = loadStore()
  const { campaign, offer } = liveCampaignOffer(org, store, demo, offerId, campaignId, 'onlineOffers')
  const voucher = issue(store, offer, campaign, holderId, { discountCode: offer.discountCode, shopUrl: offer.shopUrl })
  saveVoucherStore(store)
  return voucher
}

/* ---------- Deactivation ---------- */

export interface VoucherImpact {
  activeOffers: PartnerOffer[]
  outstandingVouchers: number
  pendingBenefits: number
  pendingBenefitTotal: number
  remains: string[]
}

/** What turning off these capabilities affects. Never blocks: issued vouchers stay usable. */
export function voucherDisableImpact(org: Organization, store: VoucherStore, capabilities: VoucherCapability[]): VoucherImpact {
  const off = new Set(capabilities)
  const offers = orgOffers(store, org.id).filter((offer) => off.has(offer.capability) && offer.status === 'active')
  const vouchers = orgVouchers(store, org.id).filter((voucher) => off.has(voucher.capability))
  const outstanding = vouchers.filter((voucher) => voucher.status === 'active' && !isExpired(voucher))
  const pending = vouchers.filter((voucher) => voucher.benefitStatus === 'pending')
  return {
    activeOffers: offers,
    outstandingVouchers: outstanding.length,
    pendingBenefits: pending.length,
    pendingBenefitTotal: pending.reduce((sum, voucher) => sum + (voucher.campaignBenefit ?? 0), 0),
    remains: [
      'Supporters keep every issued voucher, its balance, terms and receipt in My vouchers.',
      'You can still redeem issued vouchers and settle pending merchant benefits under Partner offers.',
      'Campaign financial reports are unchanged.',
    ],
  }
}

/**
 * Pauses active offers for capabilities being turned off, marking them as paused by the feature
 * change. Re-enabling never reactivates them; the organizer activates each offer again.
 */
export function pauseOffersForCapabilities(organizationId: string, capabilities: VoucherCapability[]): number {
  if (capabilities.length === 0) return 0
  const off = new Set(capabilities)
  const store = loadVoucherStore()
  let paused = 0
  for (const offer of store.offers) {
    if (offer.organizationId === organizationId && off.has(offer.capability) && offer.status === 'active') {
      offer.status = 'paused'
      offer.pausedReason = 'feature-disabled'
      offer.updatedAt = new Date().toISOString()
      paused += 1
    }
  }
  if (paused > 0) saveVoucherStore(store)
  return paused
}
