import type { BudgetLineDraft } from './budget.ts'

export type AccessMode = 'open' | 'closed'
export type DonationMode = 'fixed' | 'custom'
/** Stored lifecycle state. Display labels come from lib/lifecycle.ts (publication, fundraising, delivery). */
export type CampaignStatus = 'draft' | 'pending_review' | 'approved' | 'scheduled' | 'active' | 'completed' | 'closed'
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
  actorId?: string
}

export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

/** Campaign fields as submitted for review (everything except review bookkeeping). */
export type CampaignSnapshot = Omit<Campaign, 'pendingRevision' | 'revisionHistory'>

export interface CampaignRevision {
  id: string
  /** Demo identity that authored this revision, or 'legacy' for earlier demo data. */
  authorId: string
  submittedAt: string
  /** `approved` waits for an explicit Publish action; approval never publishes by itself. */
  status: 'pending' | 'rejected' | 'approved'
  reviewNote?: string
  reviewedBy?: string
  reviewedAt?: string
  snapshot: CampaignSnapshot
}

export interface RevisionEvent {
  revisionId: string
  action: 'submitted' | 'superseded' | 'approved' | 'rejected' | 'published'
  actorId: string
  at: string
  note?: string
}

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
  /** Demo identity that created the campaign. */
  createdBy?: string
  /**
   * A change waiting for an Organization Admin’s review. The campaign’s top-level fields stay the
   * last published version, so supporters keep seeing it during review.
   */
  pendingRevision?: CampaignRevision
  /** The revision an admin approved most recently. Approval applies only to that revision. */
  approvedRevisionId?: string
  revisionHistory?: RevisionEvent[]

  createdAt: string
  manualClosedAt?: string
  isDraft?: boolean
  category?: CampaignCategory
  story?: CampaignStory
  /** Organizer's planned budget. Planned amounts are never treated as spending. */
  budget?: BudgetLine[]
  /** The organizer marked the budget as an estimate; `budgetNote` explains the basis. */
  budgetApproximate?: boolean
  budgetNote?: string
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
  /** Integer minor units (paise, cents). Equals quantity × unitCostMinor when both are set. */
  amountMinor: number
  quantity?: number
  unitCostMinor?: number
  milestoneId?: string
  /** Short organizer explanation of the item. */
  note?: string
}

export interface ImpactExample {
  id: string
  amountMinor: number
  outcome: string
  /** Required: where the organizer's cost figure comes from. */
  costBasis: string
}

/** How the organizer reports the campaign ended. Publishing a report never changes milestone statuses. */
export type ClosureOutcome = 'delivered' | 'partial' | 'cancelled' | 'activities_remaining'

export const CLOSURE_LABEL: Record<ClosureOutcome, string> = {
  delivered: 'Delivered as planned',
  partial: 'Campaign closed — partial delivery reported',
  cancelled: 'Cancelled',
  activities_remaining: 'Closed with activities remaining',
}

export interface FinalReport {
  status: 'draft' | 'published'
  /** Set when the organizer publishes a closure. Older reports may omit it. */
  closure?: ClosureOutcome
  outcomes: string
  outcomeFields: { label: string; value: string }[]
  remainingPlan: string
  /** Why planned outcomes were not fully met. */
  unmetExplanation?: string
  /** What changed from the original plan. */
  changedPlan?: string
  /** Obligations still open, such as a supplier or a refund the organizer intends to make. A refund plan is a statement, not a processed refund. */
  outstandingObligations?: string
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
  /** Local supporter profile that may edit this page. Missing on earlier demo data. */
  ownerId?: string
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
  /** Short public caption. */
  caption?: string
  expenseId?: string
  milestoneId?: string
  updateId?: string
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
  /** Local supporter profile that owns this receipt. Missing on earlier demo data. */
  supporterId?: string
  /** Sponsor confirmations count in the campaign total and are not a supporter’s personal gift. */
  source?: 'personal' | 'sponsor'
}

/** A fictional sponsor budget for play. Amounts are integer minor units. */
export interface SponsorUnlock {
  id: string
  label: string
  rewardMinor: number
}

export interface SponsorCommitment {
  id: string
  organizationId: string
  campaignId: string
  sponsorName: string
  pledgedMinor: number
  perParticipantCapMinor: number
  /** Finite list. Each supporter can unlock each item once. */
  unlocks: SponsorUnlock[]
  startsAt: string
  endsAt: string
  createdAt: string
}

export type SponsorAllocationStatus = 'pending' | 'confirmed'

export interface SponsorAllocation {
  id: string
  commitmentId: string
  campaignId: string
  organizationId: string
  /** Local demo identity. Replay by the same person cannot unlock the same item again. */
  participantId: string
  unlockId: string
  amountMinor: number
  status: SponsorAllocationStatus
  createdAt: string
  confirmedAt?: string
}

export interface DemoStore {
  version: 6
  campaigns: Campaign[]
  contributions: Contribution[]
  referrals: Referral[]
  milestones: Milestone[]
  campaignUpdates: CampaignUpdate[]
  expenses: Expense[]
  supportingDocuments: SupportingDocument[]
  sponsorCommitments: SponsorCommitment[]
  sponsorAllocations: SponsorAllocation[]
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
  budget: BudgetLineDraft[]
  budgetApproximate: boolean
  budgetNote: string
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
