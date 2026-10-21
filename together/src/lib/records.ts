import type {
  BudgetLine,
  Campaign,
  CampaignCategory,
  CampaignStory,
  CampaignUpdate,
  Contribution,
  Expense,
  ExpenseCategory,
  FinalReport,
  ImpactExample,
  MediaItem,
  MediaVideo,
  Milestone,
  MilestoneStatus,
  Referral,
  SupportingDocument,
  Translations,
  UpdateType,
} from './types.ts'

/* Normalisers for the transparency and referral records. Each record is repaired or dropped on its
   own; relationships (campaignId, milestoneId, expenseIds, referralId) are checked against what
   actually exists so a stale reference never breaks a page. */

const str = (value: unknown, max = 4000, fallback = ''): string => (typeof value === 'string' ? value.slice(0, max) : fallback)
const isoOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
const minor = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
const obj = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export function isMediaSource(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('data:image/') || /^\/[\w\-./]+$/.test(value))
}

export function isVideoSource(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('data:video/') || /^\/[\w\-./]+\.(mp4|webm)$/.test(value))
}

export const CATEGORIES: CampaignCategory[] = ['education', 'clothing', 'environment', 'sports', 'community', 'other']
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['materials', 'transport', 'event', 'administration', 'other']
const UPDATE_TYPES: UpdateType[] = ['launch', 'progress', 'purchase', 'distribution', 'delay', 'final']
const MILESTONE_STATUSES: MilestoneStatus[] = ['planned', 'in_progress', 'reported_complete']

export function normalizeMedia(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map(obj)
    .filter((item): item is Record<string, unknown> => !!item && isMediaSource(item.src))
    .slice(0, 6)
    .map((item, index) => ({
      id: str(item.id, 80) || `media-${index}`,
      src: item.src as string,
      caption: str(item.caption, 200),
      alt: str(item.alt, 200),
    }))
}

function normalizeVideo(value: unknown): MediaVideo | undefined {
  const raw = obj(value)
  if (!raw || !isVideoSource(raw.src)) return undefined
  return { src: raw.src as string, caption: str(raw.caption, 200) }
}

export function normalizeStory(value: unknown): CampaignStory | undefined {
  const raw = obj(value)
  if (!raw) return undefined
  const beneficiary = str(raw.beneficiary, 400)
  return {
    // Older records kept who benefits only in `beneficiary`; that is the same fact, so it fills the main field.
    whoItHelps: str(raw.whoItHelps, 600) || beneficiary,
    whatTheyNeed: str(raw.whatTheyNeed, 600),
    whatItSupports: str(raw.whatItSupports, 600),
    whatHappensNext: str(raw.whatHappensNext, 600),
    beneficiary,
    imageStory: normalizeMedia(raw.imageStory),
    video: normalizeVideo(raw.video),
  }
}

export function normalizeBudget(value: unknown): BudgetLine[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map(obj)
    .filter((line): line is Record<string, unknown> => !!line && typeof line.label === 'string' && minor(line.amountMinor) !== undefined)
    .slice(0, 12)
    .map((line, index) => {
      const quantity = typeof line.quantity === 'number' && Number.isInteger(line.quantity) && line.quantity > 0 ? line.quantity : undefined
      const unitCostMinor = minor(line.unitCostMinor)
      const itemized = quantity !== undefined && unitCostMinor !== undefined && unitCostMinor > 0 && quantity * unitCostMinor === line.amountMinor
      const milestoneId = str(line.milestoneId, 80)
      const note = str(line.note, 200)
      return {
        id: str(line.id, 80) || `budget-${index}`,
        label: str(line.label, 120),
        amountMinor: line.amountMinor as number,
        ...(itemized ? { quantity, unitCostMinor } : {}),
        ...(milestoneId ? { milestoneId } : {}),
        ...(note ? { note } : {}),
      }
    })
}

export function normalizeImpact(value: unknown): ImpactExample[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value
    .map(obj)
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && minor(item.amountMinor) !== undefined && typeof item.outcome === 'string' && typeof item.costBasis === 'string' && item.costBasis.trim().length > 0,
    )
    .slice(0, 6)
    .map((item, index) => ({
      id: str(item.id, 80) || `impact-${index}`,
      amountMinor: item.amountMinor as number,
      outcome: str(item.outcome, 160),
      costBasis: str(item.costBasis, 240),
    }))
}

export function normalizeFinalReport(value: unknown): FinalReport | undefined {
  const raw = obj(value)
  if (!raw) return undefined
  const fields = Array.isArray(raw.outcomeFields)
    ? raw.outcomeFields
        .map(obj)
        .filter((field): field is Record<string, unknown> => !!field && typeof field.label === 'string')
        .map((field) => ({ label: str(field.label, 80), value: str(field.value, 200) }))
    : []
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [])
  return {
    status: raw.status === 'published' ? 'published' : 'draft',
    outcomes: str(raw.outcomes, 3000),
    outcomeFields: fields.slice(0, 8),
    remainingPlan: str(raw.remainingPlan, 1500),
    evidenceDocumentIds: ids(raw.evidenceDocumentIds),
    evidenceUpdateIds: ids(raw.evidenceUpdateIds),
    updatedAt: isoOr(raw.updatedAt, new Date(0).toISOString()),
    publishedAt: raw.status === 'published' ? isoOr(raw.publishedAt, isoOr(raw.updatedAt, new Date(0).toISOString())) : undefined,
  }
}

/** Keeps only string translations for known fields and languages. */
export function normalizeTranslations<K extends string>(value: unknown, keys: readonly K[]): Translations<K> | undefined {
  const raw = obj(value)
  const ml = raw ? obj(raw.ml) : null
  if (!ml) return undefined
  const clean: Partial<Record<K, string>> = {}
  for (const key of keys) {
    const text = ml[key]
    if (typeof text === 'string' && text.trim()) clean[key] = text.slice(0, 5000)
  }
  return Object.keys(clean).length ? { ml: clean } : undefined
}

export const CAMPAIGN_TEXT_KEYS = ['title', 'description', 'whoItHelps', 'whatTheyNeed', 'whatItSupports', 'whatHappensNext', 'beneficiary'] as const

/** Repairs the optional storytelling fields on a campaign. */
export function normalizeCampaignExtras(campaign: Campaign): Campaign {
  const next: Campaign = { ...campaign }
  next.category = CATEGORIES.includes(campaign.category as CampaignCategory) ? campaign.category : undefined
  next.story = normalizeStory(campaign.story)
  next.budget = normalizeBudget(campaign.budget)
  next.budgetApproximate = campaign.budgetApproximate === true ? true : undefined
  next.budgetNote = str(campaign.budgetNote, 400) || undefined
  next.impactExamples = normalizeImpact(campaign.impactExamples)
  next.finalReport = normalizeFinalReport(campaign.finalReport)
  next.fundingNote = typeof campaign.fundingNote === 'string' ? campaign.fundingNote.slice(0, 1000) : undefined
  next.translations = normalizeTranslations(campaign.translations, CAMPAIGN_TEXT_KEYS)
  const verification = obj(campaign.demoVerification)
  next.demoVerification =
    verification && typeof verification.label === 'string' && typeof verification.note === 'string'
      ? { label: 'Demo verification', note: str(verification.note, 300), date: isoOr(verification.date, campaign.createdAt) }
      : undefined
  return next
}

export function normalizeReferral(value: unknown, campaigns: Map<string, Campaign>): Referral | null {
  const raw = obj(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.code !== 'string' || typeof raw.campaignId !== 'string') return null
  const campaign = campaigns.get(raw.campaignId)
  if (!campaign || !/^[a-z0-9-]{3,48}$/.test(raw.code)) return null
  const target = Number(raw.personalTarget)
  const now = new Date(0).toISOString()
  return {
    id: raw.id,
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    code: raw.code,
    displayName: str(raw.displayName, 60) || 'A supporter',
    avatarData: isMediaSource(raw.avatarData) ? (raw.avatarData as string) : undefined,
    headline: str(raw.headline, 120),
    message: str(raw.message, 1200),
    personalTarget: Number.isSafeInteger(target) && target > 0 ? target : undefined,
    coverImage: isMediaSource(raw.coverImage) ? (raw.coverImage as string) : undefined,
    translations: normalizeTranslations(raw.translations, ['headline', 'message'] as const),
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : undefined,
    createdAt: isoOr(raw.createdAt, now),
    updatedAt: isoOr(raw.updatedAt, isoOr(raw.createdAt, now)),
  }
}

export function normalizeMilestone(value: unknown, campaignIds: Set<string>): Milestone | null {
  const raw = obj(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.campaignId !== 'string' || !campaignIds.has(raw.campaignId)) return null
  const status = MILESTONE_STATUSES.includes(raw.status as MilestoneStatus) ? (raw.status as MilestoneStatus) : 'planned'
  const now = new Date(0).toISOString()
  return {
    id: raw.id,
    campaignId: raw.campaignId,
    title: str(raw.title, 120) || 'Untitled milestone',
    description: str(raw.description, 1000),
    dueDate: isoOr(raw.dueDate, now),
    plannedBudgetMinor: minor(raw.plannedBudgetMinor),
    status,
    completedAt: status === 'reported_complete' ? isoOr(raw.completedAt, isoOr(raw.updatedAt, now)) : undefined,
    progressNote: str(raw.progressNote, 300),
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : 0,
    createdAt: isoOr(raw.createdAt, now),
    updatedAt: isoOr(raw.updatedAt, now),
  }
}

export function normalizeExpense(value: unknown, campaignIds: Set<string>, milestoneIds: Set<string>): Expense | null {
  const raw = obj(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.campaignId !== 'string' || !campaignIds.has(raw.campaignId)) return null
  const amount = minor(raw.amountMinor)
  if (amount === undefined) return null
  const now = new Date(0).toISOString()
  const status = raw.status === 'published' ? 'published' : 'draft'
  return {
    id: raw.id,
    campaignId: raw.campaignId,
    description: str(raw.description, 200) || 'Expense',
    category: EXPENSE_CATEGORIES.includes(raw.category as ExpenseCategory) ? (raw.category as ExpenseCategory) : 'other',
    amountMinor: amount,
    date: isoOr(raw.date, now),
    vendor: str(raw.vendor, 120),
    milestoneId: typeof raw.milestoneId === 'string' && milestoneIds.has(raw.milestoneId) ? raw.milestoneId : undefined,
    privateReceipt: isMediaSource(raw.privateReceipt) ? (raw.privateReceipt as string) : undefined,
    publicReceipt: isMediaSource(raw.publicReceipt) ? (raw.publicReceipt as string) : undefined,
    receiptRedacted: raw.receiptRedacted === true,
    publicNote: str(raw.publicNote, 600),
    status,
    createdAt: isoOr(raw.createdAt, now),
    updatedAt: isoOr(raw.updatedAt, now),
    publishedAt: status === 'published' ? isoOr(raw.publishedAt, isoOr(raw.updatedAt, now)) : undefined,
  }
}

export function normalizeUpdate(
  value: unknown,
  campaignIds: Set<string>,
  milestoneIds: Set<string>,
  expenses: Map<string, Expense>,
): CampaignUpdate | null {
  const raw = obj(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.campaignId !== 'string' || !campaignIds.has(raw.campaignId)) return null
  const now = new Date(0).toISOString()
  const status = raw.status === 'published' ? 'published' : 'draft'
  const campaignId = raw.campaignId
  const expenseIds = Array.isArray(raw.expenseIds)
    ? [...new Set(raw.expenseIds.filter((id): id is string => typeof id === 'string' && expenses.get(id)?.campaignId === campaignId))]
    : []
  return {
    id: raw.id,
    campaignId,
    type: UPDATE_TYPES.includes(raw.type as UpdateType) ? (raw.type as UpdateType) : 'progress',
    title: str(raw.title, 140) || 'Campaign update',
    date: isoOr(raw.date, now),
    body: str(raw.body, 5000),
    media: normalizeMedia(raw.media),
    video: normalizeVideo(raw.video),
    milestoneId: typeof raw.milestoneId === 'string' && milestoneIds.has(raw.milestoneId) ? raw.milestoneId : undefined,
    expenseIds,
    mediaConsent: raw.mediaConsent === true,
    translations: normalizeTranslations(raw.translations, ['title', 'body'] as const),
    status,
    createdAt: isoOr(raw.createdAt, now),
    updatedAt: isoOr(raw.updatedAt, now),
    publishedAt: status === 'published' ? isoOr(raw.publishedAt, isoOr(raw.date, now)) : undefined,
  }
}

export function normalizeDocument(value: unknown, campaigns: Map<string, Campaign>): SupportingDocument | null {
  const raw = obj(value)
  if (!raw || typeof raw.id !== 'string' || typeof raw.campaignId !== 'string') return null
  const campaign = campaigns.get(raw.campaignId)
  if (!campaign) return null
  const visibility = raw.visibility === 'public' ? 'public' : 'private'
  return {
    id: raw.id,
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    visibility,
    title: str(raw.title, 140) || 'Supporting document',
    docType: str(raw.docType, 80) || 'Document',
    description: str(raw.description, 600),
    // Private verification placeholders never keep a file, even if one was stored by mistake.
    fileSrc: visibility === 'public' && isMediaSource(raw.fileSrc) ? (raw.fileSrc as string) : undefined,
    sample: raw.sample === true,
    reviewState: visibility === 'private' && raw.reviewState === 'submitted_demo' ? 'submitted_demo' : undefined,
    createdAt: isoOr(raw.createdAt, now()),
  }
}

function now(): string {
  return new Date(0).toISOString()
}

/** Drops a referral link that points at a missing or different-campaign sharing page. */
export function normalizeContributionReferral(contribution: Contribution, referrals: Map<string, Referral>): Contribution {
  if (!contribution.referralId) return contribution
  const referral = referrals.get(contribution.referralId)
  if (referral && referral.campaignId === contribution.campaignId) return contribution
  const { referralId: _dropped, ...rest } = contribution
  void _dropped
  return rest
}
