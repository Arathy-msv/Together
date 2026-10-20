export type AccessMode = 'open' | 'closed'
export type DonationMode = 'fixed' | 'custom'
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'closed'
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
export type OrgType = 'platform' | 'company' | 'school' | 'club' | 'nonprofit'
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
  createdAt: string
  manualClosedAt?: string
  isDraft?: boolean
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
}

export interface DemoStore {
  version: 2
  campaigns: Campaign[]
  contributions: Contribution[]
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
}

export interface CampaignView {
  campaign: Campaign
  raised: number
  supporters: number
  status: CampaignStatus
  percent: number
  canGive: boolean
}
