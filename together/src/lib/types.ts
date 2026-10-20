export type AccessMode = 'open' | 'closed'
export type DonationMode = 'fixed' | 'custom'
export type CampaignStatus = 'draft' | 'pending_review' | 'scheduled' | 'active' | 'completed' | 'closed'
export type ContributionMethod = 'direct' | 'game'
export type FlowerKind = 'sunflower' | 'marigold' | 'lavender'
export type GameType = 'garden' | 'memory' | 'puzzle' | 'jacket'

/** Per-campaign rules for game-calculated contributions. Money values are integer paise. */
export interface GameContributionSettings {
  ratePaise: number
  actionsPerRound: number
  allowCustom: boolean
  capPaise: number | null
}

export interface Participation {
  direct: boolean
  game: boolean
}

export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR'
export type OrgType = 'platform' | 'company' | 'school' | 'club' | 'nonprofit' | 'other'
export type FontChoice = 'figtree' | 'nunito' | 'fraunces' | 'georgia' | 'system'
export type ButtonStyle = 'rounded' | 'soft'

export interface OrgBranding {
  primary: string
  secondary: string
  accent: string
  background: string
  headingFont: FontChoice
  bodyFont: FontChoice
  buttonStyle: ButtonStyle
}

export interface OrgLink {
  label: string
  url: string
}

export interface OrgContent {
  headline: string
  description: string
  /** Public path or compressed data URL. */
  heroImage: string
  ctaLabel: string
  contactEmail: string
  /** Optional public location, e.g. "Pune, India". */
  location: string
  footerText: string
  website: string
  socialLinks: OrgLink[]
  /** Word used for the people who give, e.g. "colleagues" or "families". */
  supporterNoun: string
  impactTitle: string
  impactStory: string
}

export interface OrgDefaults {
  currency: CurrencyCode
  suggestedAmounts: number[]
  visibility: AccessMode
  durationDays: number
  games: GameType[]
}

export interface OrgVisibility {
  games: boolean
  direct: boolean
  impactStories: boolean
  assistant: boolean
  poweredBy: boolean
}

export interface Organization {
  id: string
  slug: string
  name: string
  type: OrgType
  logo: string
  favicon: string
  tagline: string
  about: string
  branding: OrgBranding
  content: OrgContent
  defaults: OrgDefaults
  visibility: OrgVisibility
  /** Selected demo plan. Nothing is billed or enforced in this prototype. */
  plan: { id: PlanId; selectedAt: string }
  /** Organization activation of optional features (separate from detailed feature settings). */
  features: OrgFeatures
  /** Which Give & Get Local capabilities are selected (only used when `features.partnerVouchers`). */
  voucherSettings: VoucherSettings
  /** Feature on/off changes, newest last. Kept so deactivation is auditable. */
  featureHistory: FeatureChange[]
  website: OrganizationWebsite
  /** `flow: 5` is the current setup (details → features → branding → review → confirm). */
  onboarding?: { step: number; updatedAt: string; flow?: number }
  createdAt: string
  updatedAt: string
}

export type PlanId = 'starter' | 'community' | 'organization'

/** Optional website features an organization can activate. See lib/features.ts. */
export type FeatureKey =
  | 'sponsorPlay'
  | 'updateCommitments'
  | 'shareKit'
  | 'campaignDuplication'
  | 'reviewApproval'
  | 'lowDataMode'
  | 'recordExports'
  | 'supporterHistory'
  | 'partnerVouchers'

export type OrgFeatures = Record<FeatureKey, boolean>

export type VoucherCapability = 'contributionRewards' | 'storeValueVouchers' | 'onlineOffers'
export type VoucherSettings = Record<VoucherCapability, boolean>

export interface FeatureChange {
  key: FeatureKey | `voucher:${VoucherCapability}`
  enabled: boolean
  at: string
}

export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

/** setup: onboarding unfinished · draft: set up but never published · published: live in this browser. */
export type WebsiteStatus = 'setup' | 'draft' | 'published'

/**
 * Website presentation settings. The organization's top-level fields hold the *published* values;
 * unpublished edits live in `website.draft` until the organizer publishes or discards them.
 */
export interface WebsiteConfig {
  name: string
  tagline: string
  about: string
  logo: string
  favicon: string
  branding: OrgBranding
  content: OrgContent
  visibility: Pick<OrgVisibility, 'impactStories' | 'poweredBy'>
}

export interface OrganizationWebsite {
  status: WebsiteStatus
  draft?: WebsiteConfig
  publishedAt?: string
  updatedAt: string
}

export interface Campaign {
  id: string
  organizationId: string
  /** Amounts on this campaign are always shown in this currency, even if the organization default changes. */
  currency: CurrencyCode
  title: string
  description: string
  coverImageId: string
  coverImageData?: string
  logoData?: string
  puzzleImageData?: string
  organizerName: string
  access: AccessMode
  accessCode?: string
  goalAmount: number
  donationMode: DonationMode
  fixedAmounts: number[]
  opensAt: string
  closesAt: string
  autoCloseOnGoal: boolean
  participation: Participation
  gameType: GameType
  gameSettings?: GameContributionSettings
  /** When true and the organization has sponsorPlay, this campaign offers sponsor-funded play. */
  sponsorEnabled?: boolean
  /** Organizer-promised date for the next public update (updateCommitments). */
  nextUpdateAt?: string
  /** Review workflow status when the organization has reviewApproval. */
  approvalStatus?: ApprovalStatus
  approvalNote?: string
  /** Partner offers this campaign chose to show. Usable only while the organization allows them. */
  partnerOfferIds?: string[]

  createdAt: string
  manualClosedAt?: string
  isDraft?: boolean
  category?: CampaignCategory
  story?: CampaignStory
  /** Organizer's planned budget. Planned amounts are never treated as spending. */
  budget?: BudgetLine[]
  impactExamples?: ImpactExample[]
  finalReport?: FinalReport
  /** Organizer explanation shown when reported spending exceeds simulated contributions. */
  fundingNote?: string
  /** Seeded example only. There is no UI that lets organizers set this. */
  demoVerification?: { label: string; note: string; date: string }
  /** Organizer-reviewed translations, kept separate from the original text. */
  translations?: Translations<CampaignTextKey>
}

export type CampaignTextKey = 'title' | 'description' | 'whoItHelps' | 'whatTheyNeed' | 'whatItSupports' | 'whatHappensNext' | 'beneficiary'
export type TranslationLanguage = 'ml'
export type Translations<K extends string> = Partial<Record<TranslationLanguage, Partial<Record<K, string>>>>

export type CampaignCategory = 'education' | 'clothing' | 'environment' | 'sports' | 'community' | 'other'

export interface MediaItem {
  id: string
  /** Public path or compressed data URL. */
  src: string
  caption: string
  alt: string
}

export interface MediaVideo {
  src: string
  caption: string
}

export interface CampaignStory {
  whoItHelps: string
  whatTheyNeed: string
  whatItSupports: string
  whatHappensNext: string
  beneficiary: string
  imageStory: MediaItem[]
  video?: MediaVideo
}

export interface BudgetLine {
  id: string
  label: string
  /** Integer minor units (paise, cents). */
  amountMinor: number
}

export interface ImpactExample {
  id: string
  amountMinor: number
  outcome: string
  /** Required: where the organizer's cost figure comes from. */
  costBasis: string
}

export interface FinalReport {
  status: 'draft' | 'published'
  outcomes: string
  outcomeFields: { label: string; value: string }[]
  remainingPlan: string
  evidenceDocumentIds: string[]
  evidenceUpdateIds: string[]
  updatedAt: string
  publishedAt?: string
}

export type PublishState = 'draft' | 'published'

export interface Referral {
  id: string
  campaignId: string
  organizationId: string
  /** Stable, URL-safe and unique. Attribution only — never an editing password. */
  code: string
  displayName: string
  avatarData?: string
  headline: string
  message: string
  /** Optional personal target in the campaign's currency, whole units. */
  personalTarget?: number
  coverImage?: string
  translations?: Translations<'headline' | 'message'>
  createdAt: string
  updatedAt: string
}

export type MilestoneStatus = 'planned' | 'in_progress' | 'reported_complete'

export interface Milestone {
  id: string
  campaignId: string
  title: string
  description: string
  dueDate: string
  plannedBudgetMinor?: number
  status: MilestoneStatus
  completedAt?: string
  /** Organizer note for partial delivery, e.g. "120 of 200 kits delivered". */
  progressNote: string
  order: number
  createdAt: string
  updatedAt: string
}

export type UpdateType = 'launch' | 'progress' | 'purchase' | 'distribution' | 'delay' | 'final'

export interface CampaignUpdate {
  id: string
  campaignId: string
  type: UpdateType
  title: string
  date: string
  body: string
  media: MediaItem[]
  video?: MediaVideo
  milestoneId?: string
  expenseIds: string[]
  /** Organizer confirmed they have permission to publish the attached media. */
  mediaConsent: boolean
  translations?: Translations<'title' | 'body'>
  status: PublishState
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export type ExpenseCategory = 'materials' | 'transport' | 'event' | 'administration' | 'other'

export interface Expense {
  id: string
  campaignId: string
  description: string
  category: ExpenseCategory
  /** Integer minor units in the campaign currency. */
  amountMinor: number
  date: string
  vendor: string
  milestoneId?: string
  /** Organizer-only copy. Never rendered on public pages. */
  privateReceipt?: string
  /** Redacted image shown publicly. */
  publicReceipt?: string
  /** Organizer confirmed the public receipt has personal details removed. */
  receiptRedacted: boolean
  publicNote: string
  status: PublishState
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export type DocumentVisibility = 'public' | 'private'

export interface SupportingDocument {
  id: string
  campaignId: string
  organizationId: string
  visibility: DocumentVisibility
  title: string
  docType: string
  description: string
  /** Public path or compressed image data URL. Private verification placeholders never store files. */
  fileSrc?: string
  /** Fictional sample shipped with the prototype. */
  sample: boolean
  /** Private verification workflow state (demo only). */
  reviewState?: 'submitted_demo'
  createdAt: string
}

export interface Contribution {
  id: string
  campaignId: string
  amount: number
  method: ContributionMethod
  reference: string
  createdAt: string
  status: 'success'
  detail?: string
  /** Named player in a private group who made this contribution. */
  playerId?: string
  playerName?: string
  /** Another player's referral code, when this gift came through them. */
  referralCode?: string
  /** Personalized sharing page credited with this contribution. Totals still count once, in the campaign. */
  referralId?: string
}

export interface DemoStore {
  version: 4
  campaigns: Campaign[]
  contributions: Contribution[]
  referrals: Referral[]
  milestones: Milestone[]
  campaignUpdates: CampaignUpdate[]
  expenses: Expense[]
  supportingDocuments: SupportingDocument[]
}

export interface CampaignForm {
  id?: string
  organizationId: string
  currency: CurrencyCode
  title: string
  description: string
  coverImageId: string
  coverImageData: string
  logoData: string
  puzzleImageData: string
  organizerName: string
  access: AccessMode
  accessCode: string
  goalAmount: string
  donationMode: DonationMode
  fixedAmounts: number[]
  opensAt: string
  closesAt: string
  autoCloseOnGoal: boolean
  direct: boolean
  game: boolean
  gameType: GameType
  gameRate: string
  gameRoundSize: string
  gameAllowCustom: boolean
  gameCap: string
  category: CampaignCategory
  storyWho: string
  storyNeed: string
  storySupports: string
  storyNext: string
  beneficiary: string
  budget: { id: string; label: string; amount: string }[]
  milestonePlan: { id: string; title: string; due: string }[]
  sponsorEnabled: boolean
  nextUpdateAt: string
  partnerOfferIds: string[]
}

export interface PendingDonation {
  token: string
  campaignId: string
  amount: number
  method: ContributionMethod
  detail?: string
  flowers?: Array<FlowerKind | null>
  playerId?: string
  playerName?: string
  referralCode?: string
  referralId?: string
}

export interface CampaignView {
  campaign: Campaign
  raised: number
  supporters: number
  status: CampaignStatus
  percent: number
  canGive: boolean
}
