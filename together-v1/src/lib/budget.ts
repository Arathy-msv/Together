import { parseRupeesToPaise } from './gameContribution.ts'
import { minorToInput } from './inputs.ts'
import type { BudgetLine, CampaignStory } from './types.ts'

/** Editable budget line. Amounts are strings in major units until parsed into minor units. */
export interface BudgetLineDraft {
  id: string
  label: string
  /** Direct total. Ignored when both quantity and unit cost are filled in. */
  amount: string
  quantity?: string
  unitCost?: string
  milestoneId?: string
  note?: string
}

export const MAX_BUDGET_LINES = 12
export const MAX_QUANTITY = 100_000

export function blankBudgetLine(): BudgetLineDraft {
  return { id: crypto.randomUUID(), label: '', amount: '', quantity: '', unitCost: '', milestoneId: '', note: '' }
}

function parseQuantity(value: string | undefined): number | null {
  const text = (value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const quantity = Number(text)
  return quantity > 0 && quantity <= MAX_QUANTITY ? quantity : null
}

/** Quantity × unit cost when both are given, otherwise the directly entered total. Minor units, or null. */
export function draftLineTotal(line: BudgetLineDraft): number | null {
  const quantity = parseQuantity(line.quantity)
  const unit = (line.unitCost ?? '').trim() ? parseRupeesToPaise(line.unitCost ?? '') : null
  if (quantity != null && unit != null) {
    const total = quantity * unit
    return Number.isSafeInteger(total) ? total : null
  }
  return parseRupeesToPaise(line.amount)
}

function isBlank(line: BudgetLineDraft): boolean {
  return ![line.label, line.amount, line.quantity, line.unitCost, line.note].some((value) => (value ?? '').trim())
}

/** One message for the first problem, or null. Blank rows are ignored. */
export function budgetLineError(lines: BudgetLineDraft[]): string | null {
  for (const line of lines) {
    if (isBlank(line)) continue
    if (!line.label.trim()) return 'Each budget item needs a description, or remove the row.'
    const hasQuantity = Boolean((line.quantity ?? '').trim())
    const hasUnit = Boolean((line.unitCost ?? '').trim())
    if (hasQuantity && parseQuantity(line.quantity) == null) return `“${line.label.trim()}”: quantity must be a whole number from 1 to ${MAX_QUANTITY.toLocaleString('en')}.`
    if (hasUnit && parseRupeesToPaise(line.unitCost ?? '') == null) return `“${line.label.trim()}”: enter a unit cost like 120, or leave it empty.`
    if (hasQuantity !== hasUnit && !line.amount.trim()) return `“${line.label.trim()}”: add both quantity and unit cost, or enter a total.`
    if (draftLineTotal(line) == null) return `“${line.label.trim()}”: enter a total greater than zero.`
  }
  return null
}

/** Saved budget lines in minor units. Rows without a description or a valid total are dropped. */
export function draftsToBudget(lines: BudgetLineDraft[]): BudgetLine[] {
  return lines
    .filter((line) => line.label.trim())
    .map((line): BudgetLine | null => {
      const amountMinor = draftLineTotal(line)
      if (amountMinor == null || amountMinor <= 0) return null
      const quantity = parseQuantity(line.quantity)
      const unitCostMinor = (line.unitCost ?? '').trim() ? parseRupeesToPaise(line.unitCost ?? '') : null
      const itemized = quantity != null && unitCostMinor != null
      const note = (line.note ?? '').trim().slice(0, 200)
      return {
        id: line.id,
        label: line.label.trim().slice(0, 120),
        amountMinor,
        ...(itemized ? { quantity, unitCostMinor } : {}),
        ...(line.milestoneId ? { milestoneId: line.milestoneId } : {}),
        ...(note ? { note } : {}),
      }
    })
    .filter((line): line is BudgetLine => line !== null)
    .slice(0, MAX_BUDGET_LINES)
}

export function budgetToDrafts(lines: BudgetLine[] | undefined): BudgetLineDraft[] {
  return (lines ?? []).map((line) => ({
    id: line.id,
    label: line.label,
    amount: minorToInput(line.amountMinor),
    quantity: line.quantity ? String(line.quantity) : '',
    unitCost: line.unitCostMinor ? minorToInput(line.unitCostMinor) : '',
    milestoneId: line.milestoneId ?? '',
    note: line.note ?? '',
  }))
}

export interface BudgetSummary {
  targetMinor: number
  plannedMinor: number
  /** Part of the target not yet assigned to a budget item. */
  unallocatedMinor: number
  /** Planned items above the target. The target is never changed to match. */
  overTargetMinor: number
}

export function budgetSummary(lines: Array<Pick<BudgetLine, 'amountMinor'>>, targetMinor: number): BudgetSummary {
  const plannedMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0)
  const target = Math.max(0, Math.round(targetMinor))
  return {
    targetMinor: target,
    plannedMinor,
    unallocatedMinor: Math.max(0, target - plannedMinor),
    overTargetMinor: Math.max(0, plannedMinor - target),
  }
}

/**
 * The one beneficiary value shown everywhere. `whoItHelps` is what both the assistant and the form
 * edit; older records that only filled the separate `beneficiary` field fall back to it.
 */
export function beneficiaryText(story: Pick<CampaignStory, 'whoItHelps' | 'beneficiary'> | undefined): string {
  return story?.whoItHelps?.trim() || story?.beneficiary?.trim() || ''
}

/** Extra organizer note about beneficiaries, shown only when it adds something to `beneficiaryText`. */
export function beneficiaryNote(story: Pick<CampaignStory, 'whoItHelps' | 'beneficiary'> | undefined): string {
  const note = story?.beneficiary?.trim() ?? ''
  if (!note) return ''
  return note.toLowerCase() === beneficiaryText(story).toLowerCase() ? '' : note
}

/** "Organizer · Organization", without repeating the organization when it is also the organizer. */
export function organizerLine(organizerName: string, orgName: string): string {
  const organizer = organizerName.trim()
  const org = orgName.trim()
  if (!org || organizer.toLowerCase() === org.toLowerCase()) return organizer || org
  if (!organizer) return org
  return `${organizer} · ${org}`
}
