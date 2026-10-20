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

export interface Campaign {
  id: string
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
}

export interface DemoStore {
  version: 1
  campaigns: Campaign[]
  contributions: Contribution[]
}

export interface CampaignForm {
  id?: string
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
}

export interface CampaignView {
  campaign: Campaign
  raised: number
  supporters: number
  status: CampaignStatus
  percent: number
  canGive: boolean
}
