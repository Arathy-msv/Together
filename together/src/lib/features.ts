import type { Campaign, DemoStore, FeatureKey, Organization, OrgFeatures, OrgType, PlanId, VoucherCapability, VoucherSettings } from './types.ts'

export type { FeatureKey, OrgFeatures, VoucherCapability, VoucherSettings }

/**
 * Optional organization features. Platform availability, plan entitlement and organization
 * activation are checked separately — a feature is usable only when all three allow it.
 * These checks demonstrate product behaviour; they are not production security.
 */

export const FEATURE_KEYS = [
  'sponsorPlay',
  'updateCommitments',
  'shareKit',
  'campaignDuplication',
  'reviewApproval',
  'lowDataMode',
  'recordExports',
  'supporterHistory',
  'partnerVouchers',
] as const satisfies readonly FeatureKey[]

export interface FeatureCard {
  key: FeatureKey
  name: string
  explanation: string
  benefit: string
}

/** Always-on essentials — never sold or toggled as optional upgrades. */
export const ALWAYS_INCLUDED = [
  'Keyboard access and visible focus',
  'Readable colour contrast',
  'Labels on every field',
  'Reduced-motion support',
  'Accessible contribution alternatives (give directly)',
  'Copy a campaign link',
  'Individual contribution receipts',
] as const

export const FEATURE_CARDS: FeatureCard[] = [
  {
    key: 'sponsorPlay',
    name: 'Sponsor-funded play',
    explanation: 'Let supporters unlock contributions from a participating sponsor.',
    benefit: 'A local business can fund game actions so more people can take part.',
  },
  {
    key: 'updateCommitments',
    name: 'Campaign update commitments',
    explanation: 'Tell supporters when to expect your next progress update.',
    benefit: 'Supporters know when the next update is due.',
  },
  {
    key: 'shareKit',
    name: 'Campaign sharing kit',
    explanation: 'Create QR codes, posters, and ready-to-copy sharing messages.',
    benefit: 'Print a poster or paste a message without starting from a blank page.',
  },
  {
    key: 'campaignDuplication',
    name: 'Reuse past campaigns',
    explanation: 'Start a new fundraiser using an existing campaign as a template.',
    benefit: 'Repeat a successful drive without retyping everything.',
  },
  {
    key: 'reviewApproval',
    name: 'Campaign review and approval',
    explanation: 'Have another organization member review campaigns before publication.',
    benefit: 'A second pair of eyes checks wording before supporters see it.',
  },
  {
    key: 'lowDataMode',
    name: 'Low-data experience',
    explanation: 'Offer lighter pages and fewer animations for slower connections.',
    benefit: 'Supporters on mobile data get a lighter page they can opt into.',
  },
  {
    key: 'recordExports',
    name: 'Campaign record exports',
    explanation: 'Download campaign, contribution, expense, and milestone records.',
    benefit: 'Take a spreadsheet of this browser’s demo records for your own files.',
  },
  {
    key: 'supporterHistory',
    name: 'Supporter impact history',
    explanation: 'Let supporters revisit their contributions and campaign updates on this device.',
    benefit: 'Someone who gave before can find their receipts again in this browser.',
  },
  {
    key: 'partnerVouchers',
    name: 'Give & Get Local',
    explanation: 'Offer partner-store rewards and vouchers that help support your campaigns.',
    benefit: 'A local bookshop offers 10% off to supporters, or sells store credit with part going to your campaign.',
  },
]

export const VOUCHER_CAPABILITIES: { key: VoucherCapability; name: string; explanation: string }[] = [
  { key: 'contributionRewards', name: 'Contribution rewards', explanation: 'Supporters receive an eligible partner offer after contributing.' },
  { key: 'storeValueVouchers', name: 'Store-value vouchers', explanation: 'Supporters purchase store credit, with a stated portion supporting a campaign.' },
  { key: 'onlineOffers', name: 'Online partner offers', explanation: 'Supporters access partner-issued website discounts or approved shopping links.' },
]

export const VOUCHER_SETUP_NOTE = 'You can add partner stores and offers after setting up your website.'

export function emptyVoucherSettings(): VoucherSettings {
  return { contributionRewards: false, storeValueVouchers: false, onlineOffers: false }
}

export function normalizeVoucherSettings(value: unknown): VoucherSettings {
  const raw = value && typeof value === 'object' ? (value as Partial<VoucherSettings>) : {}
  const next = emptyVoucherSettings()
  for (const capability of VOUCHER_CAPABILITIES) if (raw[capability.key] === true) next[capability.key] = true
  return next
}

export function selectedCapabilities(settings: VoucherSettings): VoucherCapability[] {
  return VOUCHER_CAPABILITIES.filter((capability) => settings[capability.key]).map((capability) => capability.key)
}

/** Setup and Settings both require at least one capability once Give & Get Local is on. */
export function voucherSelectionError(features: OrgFeatures, settings: VoucherSettings): string | undefined {
  if (!features.partnerVouchers) return undefined
  return selectedCapabilities(settings).length === 0 ? 'Choose at least one Give & Get Local capability, or turn Give & Get Local off.' : undefined
}

export function capabilityName(key: VoucherCapability): string {
  return VOUCHER_CAPABILITIES.find((capability) => capability.key === key)!.name
}

/**
 * A voucher capability is usable only when the module is usable (platform, plan, activation)
 * and this capability is selected. Campaign-level opt-in is checked separately.
 */
export function canUseVoucherCapability(organization: Organization, capability: VoucherCapability): boolean {
  return canUseFeature(organization, 'partnerVouchers') && Boolean(organization.voucherSettings?.[capability])
}

/** Every listed feature is implemented in this prototype. A Platform Admin can make one unavailable. */
export const PLATFORM_AVAILABLE: Record<FeatureKey, true> = {
  sponsorPlay: true,
  updateCommitments: true,
  shareKit: true,
  campaignDuplication: true,
  reviewApproval: true,
  lowDataMode: true,
  recordExports: true,
  supporterHistory: true,
  partnerVouchers: true,
}

/** Demo plan entitlements — labelled on the plan cards; not real billing. */
export const PLAN_ENTITLEMENTS: Record<PlanId, FeatureKey[]> = {
  starter: ['shareKit', 'updateCommitments', 'campaignDuplication', 'lowDataMode'],
  community: ['shareKit', 'updateCommitments', 'campaignDuplication', 'lowDataMode', 'recordExports', 'supporterHistory', 'partnerVouchers'],
  organization: [
    'shareKit',
    'updateCommitments',
    'campaignDuplication',
    'lowDataMode',
    'recordExports',
    'supporterHistory',
    'sponsorPlay',
    'reviewApproval',
    'partnerVouchers',
  ],
}

export const PLATFORM_SETTINGS_KEY = 'together.platform.v1'

/** Features a Platform Admin has made unavailable on this demo platform. Organization data is kept. */
export function unavailableFeatures(): FeatureKey[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLATFORM_SETTINGS_KEY) ?? 'null') as { unavailable?: unknown } | null
    return Array.isArray(parsed?.unavailable) ? (parsed!.unavailable as FeatureKey[]).filter((key) => (FEATURE_KEYS as readonly string[]).includes(key)) : []
  } catch {
    return []
  }
}

/** Level A: implemented on the platform and not switched off by a Platform Admin. */
export function isPlatformAvailable(key: FeatureKey): boolean {
  return Boolean(PLATFORM_AVAILABLE[key]) && !unavailableFeatures().includes(key)
}

export function emptyFeatures(value = false): OrgFeatures {
  return {
    sponsorPlay: value,
    updateCommitments: value,
    shareKit: value,
    campaignDuplication: value,
    reviewApproval: value,
    lowDataMode: value,
    recordExports: value,
    supporterHistory: value,
    partnerVouchers: value,
  }
}

export function planEntitles(planId: PlanId, key: FeatureKey): boolean {
  return PLAN_ENTITLEMENTS[planId]?.includes(key) ?? false
}

export function featureCard(key: FeatureKey): FeatureCard {
  return FEATURE_CARDS.find((card) => card.key === key)!
}

/**
 * Recommended activation for a new organization. Editable — never applied silently without
 * explanation on the selection screen.
 */
export function recommendedFeatures(type: OrgType, planId: PlanId): OrgFeatures {
  const features = emptyFeatures(false)
  features.shareKit = planEntitles(planId, 'shareKit')
  features.updateCommitments = planEntitles(planId, 'updateCommitments')
  features.campaignDuplication = planEntitles(planId, 'campaignDuplication')
  features.lowDataMode = planEntitles(planId, 'lowDataMode')
  features.recordExports = planEntitles(planId, 'recordExports')
  features.supporterHistory = planEntitles(planId, 'supporterHistory')
  features.sponsorPlay = false
  features.reviewApproval = false
  features.partnerVouchers = false
  void type
  return features
}

/** One-line reasons shown beside “Use recommended settings”. */
export function recommendationReasons(type: OrgType, planId: PlanId): string[] {
  const plan = planId === 'starter' ? 'Starter' : planId === 'organization' ? 'Organization' : 'Community'
  const group = type === 'other' || type === 'platform' ? 'groups' : `${type}s`
  const reasons = [
    `Sharing kit, update commitments, reuse past campaigns and low-data are on — useful for most ${group}.`,
    `Sponsor-funded play, review and approval, and Give & Get Local stay off until you choose them.`,
  ]
  if (planEntitles(planId, 'recordExports')) {
    reasons.push(`Record exports are on because they are included in the ${plan} demo plan.`)
  } else {
    reasons.push(`Record exports are not included in the ${plan} demo plan.`)
  }
  if (planEntitles(planId, 'supporterHistory')) {
    reasons.push(`Supporter impact history is on so people on this device can revisit their receipts.`)
  }
  if (type === 'company') {
    reasons.push(`Companies often add review and approval later — it is available on your plan but left off for a simpler start.`)
  }
  return reasons
}

export function normalizeFeatures(value: unknown, fallback: OrgFeatures): OrgFeatures {
  const raw = value && typeof value === 'object' ? (value as Partial<OrgFeatures>) : {}
  const next = { ...fallback }
  for (const key of FEATURE_KEYS) {
    if (typeof raw[key] === 'boolean') next[key] = raw[key]!
  }
  return next
}

/**
 * True only when the platform ships the feature, the demo plan includes it, and the organization
 * has activated it. Pass a loaded organization — never rely on hiding a button alone.
 */
export function canUseFeature(organization: Organization, key: FeatureKey): boolean {
  if (!isPlatformAvailable(key)) return false
  if (!planEntitles(organization.plan.id, key)) return false
  return Boolean(organization.features?.[key])
}

/** Features the organization has turned on that its plan still includes. */
export function enabledFeatures(org: Organization): FeatureKey[] {
  return FEATURE_KEYS.filter((key) => canUseFeature(org, key))
}

/** Features included in the plan but not activated. */
export function availableButOff(org: Organization): FeatureKey[] {
  return FEATURE_KEYS.filter((key) => isPlatformAvailable(key) && planEntitles(org.plan.id, key) && !org.features?.[key])
}

/**
 * Infer activation for organizations saved before this layer existed. Preserves working behaviour:
 * features that already have records stay on; otherwise recommended defaults for the plan apply.
 */
export function inferFeatures(org: Organization, store?: DemoStore): OrgFeatures {
  const base = recommendedFeatures(org.type, org.plan.id)
  if (store) {
    const campaigns = store.campaigns.filter((campaign) => campaign.organizationId === org.id)
    if (campaigns.some((campaign) => campaign.sponsorEnabled) && planEntitles(org.plan.id, 'sponsorPlay')) base.sponsorPlay = true
    if (campaigns.some((campaign) => campaign.nextUpdateAt) && planEntitles(org.plan.id, 'updateCommitments')) base.updateCommitments = true
    if (
      campaigns.some((campaign) => campaign.approvalStatus && campaign.approvalStatus !== 'draft') &&
      planEntitles(org.plan.id, 'reviewApproval')
    ) {
      base.reviewApproval = true
    }
    if (store.referrals.some((referral) => referral.organizationId === org.id) && planEntitles(org.plan.id, 'shareKit')) {
      base.shareKit = true
    }
  }
  // Existing published orgs keep the practical toolkit on so nothing disappears after migration.
  if (org.website.status === 'published') {
    for (const key of ['shareKit', 'updateCommitments', 'campaignDuplication', 'lowDataMode', 'recordExports', 'supporterHistory'] as FeatureKey[]) {
      if (planEntitles(org.plan.id, key)) base[key] = true
    }
  }
  return base
}

export interface DisableImpact {
  blocked: boolean
  summary: string[]
}

/** Concrete impact of turning a feature off. Blocks when an active workflow would break. */
export function disableImpact(org: Organization, key: FeatureKey, store: DemoStore): DisableImpact {
  const campaigns = store.campaigns.filter((campaign) => campaign.organizationId === org.id && !campaign.isDraft)
  const summary: string[] = []
  let blocked = false

  switch (key) {
    case 'sponsorPlay': {
      const active = campaigns.filter((campaign) => campaign.sponsorEnabled && !campaign.manualClosedAt)
      if (active.length > 0) {
        blocked = true
        summary.push(
          `${active.length} active campaign${active.length === 1 ? '' : 's'} still use sponsor-funded play (${active
            .map((campaign) => campaign.title)
            .slice(0, 3)
            .join(', ')}${active.length > 3 ? '…' : ''}). Turn sponsorship off on those campaigns first.`,
        )
      } else {
        summary.push('New campaigns will not offer sponsor-funded play. Existing contribution records stay readable.')
      }
      break
    }
    case 'reviewApproval': {
      const pending = campaigns.filter((campaign) => campaign.approvalStatus === 'pending_review')
      if (pending.length > 0) {
        blocked = true
        summary.push(
          `${pending.length} campaign${pending.length === 1 ? '' : 's'} waiting for review (${pending
            .map((campaign) => campaign.title)
            .slice(0, 3)
            .join(', ')}). Approve, reject or withdraw ${pending.length === 1 ? 'it' : 'them'} first.`,
        )
      } else {
        summary.push('New campaigns will publish without a review step. Past review notes stay on the campaign record.')
      }
      break
    }
    case 'updateCommitments':
      summary.push('New update schedules cannot be set. Published updates and any past commitment dates stay visible.')
      break
    case 'shareKit':
      summary.push('QR codes, posters and ready-made messages will hide. Copying a campaign link still works.')
      break
    case 'campaignDuplication':
      summary.push('“Reuse this campaign” will hide. Existing campaigns are unchanged.')
      break
    case 'lowDataMode':
      summary.push('The optional low-data switch will hide. Keyboard access, contrast and reduced motion stay on for everyone.')
      break
    case 'recordExports':
      summary.push('Bulk export tools will hide. Individual receipts and published public reports stay available.')
      break
    case 'supporterHistory':
      summary.push('The history page will hide. Confirmation screens and individual receipts stay available.')
      break
    case 'partnerVouchers':
      summary.push('New partner offers and voucher purchases stop. Issued vouchers, balances, receipts and redemptions stay available.')
      break
  }
  return { blocked, summary }
}

/** Campaign uses sponsorship only when the organization can use the feature and the campaign opted in. */
export function campaignUsesSponsor(org: Organization, campaign: Pick<Campaign, 'sponsorEnabled'>): boolean {
  return canUseFeature(org, 'sponsorPlay') && Boolean(campaign.sponsorEnabled)
}

export function campaignNeedsApproval(org: Organization): boolean {
  return canUseFeature(org, 'reviewApproval')
}

export function enabledFeatureLabels(org: Organization): string[] {
  return enabledFeatures(org).map((key) => featureCard(key).name)
}

/** Clamp activation to what the plan still includes (e.g. after a demo plan change). */
export function clampFeaturesToPlan(features: OrgFeatures, planId: PlanId): OrgFeatures {
  const next = { ...features }
  for (const key of FEATURE_KEYS) {
    if (!planEntitles(planId, key)) next[key] = false
  }
  return next
}
