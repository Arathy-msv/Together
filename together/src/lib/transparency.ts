import { formatMoney } from './format.ts'
import { goalReached, raisedOf } from './campaigns.ts'
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

function upsert<K extends Collection>(collection: K, record: DemoStore[K][number]): void {
  const store = loadStore()
  const list = store[collection] as Array<{ id: string }>
  const index = list.findIndex((item) => item.id === record.id)
  if (index >= 0) list[index] = record
  else list.push(record)
  saveStore(store)
}

function remove(collection: Collection, id: string): void {
  const store = loadStore()
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

/** Updates organizer-editable campaign fields. The demo verification flag can never be changed here. */
export function saveCampaignFields(
  campaignId: string,
  patch: Partial<Pick<Campaign, 'description' | 'category' | 'story' | 'budget' | 'impactExamples' | 'finalReport' | 'fundingNote'>>,
): void {
  const store = loadStore()
  const index = store.campaigns.findIndex((item) => item.id === campaignId)
  if (index < 0) return
  store.campaigns[index] = { ...store.campaigns[index], ...patch, demoVerification: store.campaigns[index].demoVerification }
  saveStore(store)
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`
}
