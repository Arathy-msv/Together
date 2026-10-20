import { formatMoney } from './format.ts'
import { goalReached, raisedOf } from './campaigns.ts'
import { campaignNeedsApproval } from './features.ts'
import { recordAudit } from './identity.ts'
import { findOrganization } from './orgStorage.ts'
import { assertCan } from './permissions.ts'
import { loadStore, saveStore } from './storage.ts'
import type {
  Campaign,
  CampaignUpdate,
  Contribution,
  CurrencyCode,
  DemoStore,
  Expense,
  ExpenseCategory,
  Milestone,
  MilestoneStatus,
  SupportingDocument,
  UpdateType,
} from './types.ts'

/* Delivery transparency. Fundraising progress (money contributed) and delivery progress (what the
   organizer reports doing) are kept separate on purpose: reaching a goal never marks delivery done. */

export const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  reported_complete: 'Reported complete',
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  materials: 'Materials or goods',
  transport: 'Transport',
  event: 'Event costs',
  administration: 'Administration',
  other: 'Other',
}

export const UPDATE_TYPE_LABEL: Record<UpdateType, string> = {
  launch: 'Campaign launched',
  progress: 'Fundraising progress',
  purchase: 'Purchase completed',
  distribution: 'Distribution update',
  delay: 'Delay or change of plan',
  final: 'Final impact report',
}

/** Formats integer minor units (paise, cents) without floating-point rounding surprises. */
export function formatMinor(minor: number, currency: CurrencyCode): string {
  const safe = Number.isSafeInteger(minor) ? minor : Math.round(minor)
  const negative = safe < 0
  const absolute = Math.abs(safe)
  const text = formatMoney(absolute / 100, currency, absolute % 100 === 0 ? 0 : 2)
  return negative ? `−${text}` : text
}

const byDateDesc = (a: string, b: string) => Date.parse(b) - Date.parse(a)

export function campaignMilestones(store: Pick<DemoStore, 'milestones'>, campaignId: string): Milestone[] {
  return store.milestones
    .filter((item) => item.campaignId === campaignId)
    .sort((a, b) => a.order - b.order || Date.parse(a.dueDate) - Date.parse(b.dueDate))
}

export function isMilestoneDelayed(milestone: Milestone, now = Date.now()): boolean {
  return milestone.status !== 'reported_complete' && Date.parse(milestone.dueDate) < now
}

export function deliverySummary(milestones: Milestone[], now = Date.now()) {
  return {
    total: milestones.length,
    complete: milestones.filter((item) => item.status === 'reported_complete').length,
    inProgress: milestones.filter((item) => item.status === 'in_progress').length,
    delayed: milestones.filter((item) => isMilestoneDelayed(item, now)).length,
  }
}

/**
 * Everything published that hangs off one milestone: its expenses, how many have a public receipt,
 * and the updates that mention the milestone or one of those expenses.
 */
export function milestoneRecords(store: Pick<DemoStore, 'expenses' | 'campaignUpdates'>, milestone: Pick<Milestone, 'id' | 'campaignId'>) {
  const expenses = publishedExpenses(store, milestone.campaignId).filter((item) => item.milestoneId === milestone.id)
  const expenseIds = new Set(expenses.map((item) => item.id))
  const updates = publishedUpdates(store, milestone.campaignId).filter(
    (item) => item.milestoneId === milestone.id || item.expenseIds.some((id) => expenseIds.has(id)),
  )
  return {
    expenses,
    spentMinor: expenses.reduce((sum, item) => sum + item.amountMinor, 0),
    withEvidence: expenses.filter((item) => Boolean(item.publicReceipt)).length,
    updates,
  }
}

/** Published updates only, newest first. Drafts never appear publicly. */
export function publishedUpdates(store: Pick<DemoStore, 'campaignUpdates'>, campaignId: string): CampaignUpdate[] {
  return store.campaignUpdates.filter((item) => item.campaignId === campaignId && item.status === 'published').sort((a, b) => byDateDesc(a.date, b.date))
}

export function latestUpdateDate(store: Pick<DemoStore, 'campaignUpdates'>, campaignId: string): string | null {
  return publishedUpdates(store, campaignId)[0]?.date ?? null
}

/** Published updates dated after a moment (e.g. a contribution or a follow). */
export function updatesSince(store: Pick<DemoStore, 'campaignUpdates'>, campaignId: string, since: string): CampaignUpdate[] {
  const after = Date.parse(since)
  if (Number.isNaN(after)) return []
  return publishedUpdates(store, campaignId).filter((item) => Date.parse(item.publishedAt ?? item.date) > after)
}

export function publishedExpenses(store: Pick<DemoStore, 'expenses'>, campaignId: string): Expense[] {
  const seen = new Set<string>()
  return store.expenses
    .filter((item) => item.campaignId === campaignId && item.status === 'published')
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .sort((a, b) => byDateDesc(a.date, b.date))
}

/** Public evidence only. Private verification placeholders are never returned here. */
export function publicDocuments(store: Pick<DemoStore, 'supportingDocuments'>, campaignId: string): SupportingDocument[] {
  return store.supportingDocuments.filter((item) => item.campaignId === campaignId && item.visibility === 'public')
}

export interface FundSummary {
  contributedMinor: number
  spentMinor: number
  /** Demo calculation: contributions − published reported expenses. May be negative. */
  balanceMinor: number
  plannedMinor: number
  publishedCount: number
  draftCount: number
}

/**
 * Integer minor units throughout. Counts only confirmed simulated contributions and published
 * expenses (each once, even when several updates reference it). Planned budgets are reported
 * separately and never treated as spending.
 */
export function fundSummary(
  campaign: Campaign,
  store: Pick<DemoStore, 'contributions' | 'expenses' | 'milestones'>,
): FundSummary {
  const contributedMinor = store.contributions
    .filter((item: Contribution) => item.campaignId === campaign.id && item.status === 'success')
    .reduce((sum, item) => sum + Math.round(item.amount * 100), 0)
  const published = publishedExpenses(store, campaign.id)
  const spentMinor = published.reduce((sum, item) => sum + item.amountMinor, 0)
  const budgetMinor = (campaign.budget ?? []).reduce((sum, line) => sum + line.amountMinor, 0)
  const milestoneMinor = store.milestones
    .filter((item) => item.campaignId === campaign.id)
    .reduce((sum, item) => sum + (item.plannedBudgetMinor ?? 0), 0)
  return {
    contributedMinor,
    spentMinor,
    balanceMinor: contributedMinor - spentMinor,
    plannedMinor: budgetMinor > 0 ? budgetMinor : milestoneMinor,
    publishedCount: published.length,
    draftCount: store.expenses.filter((item) => item.campaignId === campaign.id && item.status === 'draft').length,
  }
}

/** Gentle organizer prompts. Wording describes next steps, never wrongdoing. */
export function workspacePrompts(campaign: Campaign, store: DemoStore, now = Date.now()): string[] {
  const prompts: string[] = []
  if (publishedUpdates(store, campaign.id).length === 0) prompts.push('Your campaign has no published updates yet.')
  for (const milestone of campaignMilestones(store, campaign.id)) {
    if (isMilestoneDelayed(milestone, now)) prompts.push(`“${milestone.title}” is past its expected date. Consider sharing an update or a new date.`)
  }
  for (const expense of publishedExpenses(store, campaign.id)) {
    if (!expense.publicReceipt) prompts.push(`Add evidence to support this reported expense: “${expense.description}”.`)
  }
  if (goalReached(raisedOf(campaign.id, store.contributions), campaign.goalAmount)) {
    prompts.push('Funding goal reached. Share what happens next.')
  }
  const summary = fundSummary(campaign, store)
  if (summary.balanceMinor < 0 && !campaign.fundingNote?.trim()) {
    prompts.push('Reported spending is higher than simulated contributions. Explain how the difference was funded.')
  }
  return prompts
}

/* ---------- Organizer edits (each one write) ---------- */

type Collection = 'milestones' | 'campaignUpdates' | 'expenses' | 'supportingDocuments'

/** Milestones, updates, expenses and documents: Organization Admins, or organizers assigned to the campaign. */
function assertContent(store: DemoStore, campaignId: string): void {
  const campaign = store.campaigns.find((item) => item.id === campaignId)
  if (!campaign) throw new Error('Campaign not found.')
  assertCan('campaign.manageContent', { campaign }, 'You can only manage campaigns assigned to you.')
}

function upsert<K extends Collection>(collection: K, record: DemoStore[K][number]): void {
  const store = loadStore()
  const existing = (store[collection] as Array<{ id: string; campaignId: string }>).find((item) => item.id === record.id)
  if (existing && existing.campaignId !== record.campaignId) throw new Error('A record can’t be moved to another campaign.')
  assertContent(store, record.campaignId)
  const list = store[collection] as Array<{ id: string }>
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = record
  else list.push(record)
  saveStore(store)
}

function remove(collection: Collection, id: string): void {
  const store = loadStore()
  const existing = (store[collection] as Array<{ id: string; campaignId: string }>).find((item) => item.id === id)
  if (!existing) return
  assertContent(store, existing.campaignId)
  ;(store[collection] as Array<{ id: string }>) = (store[collection] as Array<{ id: string }>).filter((item) => item.id !== id)
  if (collection === 'expenses') {
    store.campaignUpdates = store.campaignUpdates.map((item) => ({ ...item, expenseIds: item.expenseIds.filter((expenseId) => expenseId !== id) }))
  }
  if (collection === 'milestones') {
    store.campaignUpdates = store.campaignUpdates.map((item) => (item.milestoneId === id ? { ...item, milestoneId: undefined } : item))
    store.expenses = store.expenses.map((item) => (item.milestoneId === id ? { ...item, milestoneId: undefined } : item))
  }
  saveStore(store)
}

export const saveMilestone = (record: Milestone) => upsert('milestones', record)
export const deleteMilestone = (id: string) => remove('milestones', id)
export const saveUpdate = (record: CampaignUpdate) => upsert('campaignUpdates', record)
export const deleteUpdate = (id: string) => remove('campaignUpdates', id)
export const saveExpense = (record: Expense) => upsert('expenses', record)
export const deleteExpense = (id: string) => remove('expenses', id)
export const saveDocument = (record: SupportingDocument) => upsert('supportingDocuments', record)
export const deleteDocument = (id: string) => remove('supportingDocuments', id)

type EditableField = 'description' | 'category' | 'story' | 'budget' | 'impactExamples' | 'finalReport' | 'fundingNote' | 'translations'

/** Campaign facts that need review again when the organization requires approval. */
const MATERIAL_FIELDS: EditableField[] = ['description', 'category', 'story', 'budget', 'impactExamples']

/**
 * Updates organizer-editable campaign fields. The demo verification flag can never be changed here.
 * When review is required and the campaign is published, material changes become a pending
 * revision: supporters keep seeing the last published version until an admin approves it.
 */
export function saveCampaignFields(campaignId: string, patch: Partial<Pick<Campaign, EditableField>>): { pendingReview: boolean } {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaignId)
  if (index < 0) return { pendingReview: false }
  const campaign = store.campaigns[index]
  const organization = findOrganization(campaign.organizationId)
  const actor = assertCan('campaign.manageContent', { campaign, organization }, 'You can only edit campaigns assigned to you.')
  if ('finalReport' in patch) assertCan('org.viewReports', { campaign, organization }, 'Only an Organization Admin can edit the final report.')

  const material = MATERIAL_FIELDS.filter((key) => key in patch)
  if (material.length > 0 && !campaign.isDraft && organization && campaignNeedsApproval(organization)) {
    const now = new Date().toISOString()
    const live: Partial<Campaign> = {}
    const proposed: Partial<Campaign> = {}
    for (const key of Object.keys(patch) as EditableField[]) {
      if (MATERIAL_FIELDS.includes(key)) (proposed as Record<string, unknown>)[key] = patch[key]
      else (live as Record<string, unknown>)[key] = patch[key]
    }
    // Changing an approved-but-unpublished revision replaces it, so it needs review again.
    const pending = campaign.pendingRevision && campaign.pendingRevision.status !== 'rejected' ? campaign.pendingRevision : undefined
    const { pendingRevision: _p, revisionHistory: _h, ...current } = campaign
    void _p
    void _h
    const id = `rev_${crypto.randomUUID().slice(0, 12)}`
    const history = [...(campaign.revisionHistory ?? [])]
    if (pending) history.push({ revisionId: pending.id, action: 'superseded' as const, actorId: actor.id, at: now })
    history.push({ revisionId: id, action: 'submitted' as const, actorId: actor.id, at: now })
    store.campaigns[index] = {
      ...campaign,
      ...live,
      demoVerification: campaign.demoVerification,
      pendingRevision: { id, authorId: actor.id, submittedAt: now, status: 'pending', snapshot: { ...(pending?.snapshot ?? current), ...proposed } },
      revisionHistory: history,
    }
    saveStore(store)
    recordAudit('campaign.revision.submitted', { organizationId: campaign.organizationId, targetId: campaignId, detail: id })
    return { pendingReview: true }
  }

  store.campaigns[index] = { ...campaign, ...patch, demoVerification: campaign.demoVerification }
  saveStore(store)
  return { pendingReview: false }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}
