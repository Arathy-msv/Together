import { formatMoney } from '../format.ts'
import { extractAmount } from './parse.ts'
import { campaignMilestones, formatMinor, publicDocuments, publishedUpdates } from '../transparency.ts'
import type { Campaign, CampaignForm, CurrencyCode, DemoStore, GameType, Organization } from '../types.ts'
import { campaignToForm, formBudget, validateAll, type FormErrors } from '../wizard.ts'

/*
 * Campaign readiness: transparent, deterministic checks. Only real required-field validation is
 * "required"; editorial advice is recommended or optional and never blocks publishing. There is no
 * score, no fraud judgement and no verification.
 */

export type ReadinessLevel = 'required' | 'recommended' | 'optional'

/** Where a result points. Each host page maps these to its own field or tab. */
export type ReadinessField =
  | 'title'
  | 'description'
  | 'cover'
  | 'organizer'
  | 'goal'
  | 'dates'
  | 'amounts'
  | 'participation'
  | 'access'
  | 'puzzle'
  | 'beneficiary'
  | 'whoItHelps'
  | 'whatItSupports'
  | 'whatHappensNext'
  | 'budget'
  | 'milestones'
  | 'impact'
  | 'contact'
  | 'documents'
  | 'updates'

export interface ReadinessItem {
  id: string
  level: ReadinessLevel
  issue: string
  why: string
  field: ReadinessField
  /** Editable starting point the organizer may apply. Built only from information they supplied. */
  suggestion?: string
}

export interface ReadinessInput {
  title: string
  summary: string
  coverSet: boolean
  goalAmount: number | null
  currency: CurrencyCode
  story: { whoItHelps: string; whatTheyNeed: string; whatItSupports: string; whatHappensNext: string; beneficiary: string }
  budget: { label: string; amountMinor: number }[]
  milestoneCount: number
  impactExampleCount: number
  contactEmail: string
  publicDocumentCount: number
  updateCount: number
  requiredErrors: FormErrors
  /** Drafts have no published updates yet; check for an update plan instead. */
  published: boolean
}

const REQUIRED_MAP: Array<{ keys: Array<keyof FormErrors>; field: ReadinessField; issue: string; why: string }> = [
  { keys: ['title'], field: 'title', issue: 'Campaign title', why: 'Supporters need a clear name to recognise and share the campaign.' },
  { keys: ['description'], field: 'description', issue: 'Short summary', why: 'The summary is the first thing supporters read about the purpose.' },
  { keys: ['coverImageId'], field: 'cover', issue: 'Cover image', why: 'Campaign cards and sharing pages need an image.' },
  { keys: ['organizerName'], field: 'organizer', issue: 'Organizer name', why: 'Supporters should know who runs the campaign.' },
  { keys: ['goalAmount'], field: 'goal', issue: 'Fundraising target', why: 'Progress is shown against the target.' },
  { keys: ['opensAt', 'closesAt'], field: 'dates', issue: 'Opening and closing dates', why: 'Contributions are only accepted between these dates.' },
  { keys: ['fixedAmounts'], field: 'amounts', issue: 'Suggested amounts', why: 'Supporters choose from these amounts when giving directly.' },
  { keys: ['form', 'gameType', 'gameRate', 'gameRoundSize', 'gameCap'], field: 'participation', issue: 'How supporters take part', why: 'Supporters need at least one available way to give.' },
  { keys: ['accessCode'], field: 'access', issue: 'Demo access code', why: 'Closed groups need a code for members to join.' },
  { keys: ['puzzleImageData'], field: 'puzzle', issue: 'Puzzle image', why: 'The Community Puzzle needs a picture to piece together.' },
  { keys: ['budget'], field: 'budget', issue: 'Budget lines', why: 'Each budget line needs a label and an amount.' },
]

const UNSUPPORTED_IMPACT = [
  /(₹|\$|£|€|rs\.?)\s?[\d,]+\s+(will\s+|can\s+)?(feeds?|clothes?|buys?|provides?|educates?|plants?|saves?|keeps?)\b/i,
  /\b(per|each|every)\s+(child|family|student|person|kid)\b/i,
  /\b(guarantee[sd]?|100%|every rupee|every dollar)\b/i,
]

export function checkReadiness(input: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = []
  for (const rule of REQUIRED_MAP) {
    const message = rule.keys.map((key) => input.requiredErrors[key]).find(Boolean)
    if (message) items.push({ id: `req-${rule.field}`, level: 'required', issue: `${rule.issue}: ${message}`, why: rule.why, field: rule.field })
  }

  const { story } = input
  const summary = input.summary.trim()
  if (summary && summary.length < 60 && !story.whatTheyNeed.trim()) {
    items.push({
      id: 'purpose-unclear',
      level: 'recommended',
      issue: 'The purpose is quite brief.',
      why: 'A sentence on what is needed and why helps supporters understand the campaign quickly.',
      field: 'description',
    })
  }
  const mentioned = extractAmount(summary)
  if (mentioned.amount && input.goalAmount && mentioned.amount !== input.goalAmount && (!mentioned.currency || mentioned.currency === input.currency)) {
    items.push({
      id: 'amount-mismatch',
      level: 'recommended',
      issue: `The summary mentions ${mentioned.amountText}, but the target is ${formatMoney(input.goalAmount, input.currency)}.`,
      why: 'Different figures in the same campaign can confuse supporters.',
      field: 'description',
    })
  }
  if (!story.beneficiary.trim() && !story.whoItHelps.trim()) {
    items.push({
      id: 'beneficiary',
      level: 'recommended',
      issue: 'No description of who benefits.',
      why: 'Supporters want to know who the campaign helps. Describe the group, not individuals.',
      field: 'beneficiary',
    })
  }
  const budgetTotal = input.budget.reduce((sum, line) => sum + line.amountMinor, 0)
  if (input.budget.length === 0) {
    items.push({
      id: 'budget-missing',
      level: 'recommended',
      issue: 'No budget breakdown.',
      why: 'Adding a budget breakdown could help supporters understand your target.',
      field: 'budget',
    })
  } else if (input.goalAmount && budgetTotal !== input.goalAmount * 100) {
    const goalMinor = input.goalAmount * 100
    const difference = goalMinor - budgetTotal
    items.push({
      id: 'budget-mismatch',
      level: 'recommended',
      issue: `Budget lines add up to ${formatMinor(budgetTotal, input.currency)}, but the target is ${formatMoney(input.goalAmount, input.currency)}.`,
      why: 'When the budget and target differ, supporters may wonder where the rest goes.',
      field: 'budget',
      suggestion:
        difference > 0
          ? `Add a budget line for the remaining ${formatMinor(difference, input.currency)}, or explain what it covers.`
          : `The budget is ${formatMinor(-difference, input.currency)} more than the target. Explain how the extra will be funded, or adjust the budget.`,
    })
  }
  if (!story.whatItSupports.trim()) {
    const labels = input.budget.map((line) => line.label).filter(Boolean)
    items.push({
      id: 'funds-use',
      level: 'recommended',
      issue: 'No explanation of how funds will be used.',
      why: 'Saying what contributions pay for makes the target easier to trust.',
      field: 'whatItSupports',
      suggestion: labels.length ? `Contributions will pay for: ${labels.join(', ')}.` : undefined,
    })
  }
  if (input.milestoneCount === 0) {
    items.push({
      id: 'milestones',
      level: 'recommended',
      issue: 'No delivery milestones.',
      why: 'Milestones show supporters what will happen after fundraising, and when.',
      field: 'milestones',
    })
  }
  const allText = [summary, story.whoItHelps, story.whatTheyNeed, story.whatItSupports, story.whatHappensNext].join(' ')
  if (input.impactExampleCount === 0 && UNSUPPORTED_IMPACT.some((pattern) => pattern.test(allText))) {
    items.push({
      id: 'impact',
      level: 'recommended',
      issue: 'The story includes an impact or cost statement without a stated basis.',
      why: 'Claims like “₹100 clothes one child” are easier to believe with a source, such as a supplier quotation.',
      field: 'impact',
      suggestion: 'Add a cost example with its source, or describe what contributions will pay for instead.',
    })
  }
  if (!input.contactEmail.trim()) {
    items.push({
      id: 'contact',
      level: 'recommended',
      issue: 'No contact information for the organizer.',
      why: 'Supporters may have questions before contributing.',
      field: 'contact',
    })
  }
  if (input.publicDocumentCount === 0) {
    items.push({
      id: 'documents',
      level: 'optional',
      issue: 'No public supporting information yet.',
      why: 'A quotation or partner letter can help supporters understand your plan. It is evidence, not verification.',
      field: 'documents',
    })
  }
  if (input.published ? input.updateCount === 0 : !story.whatHappensNext.trim()) {
    items.push({
      id: 'updates',
      level: 'optional',
      issue: input.published ? 'No published updates yet.' : 'No update plan.',
      why: 'Letting supporters know when you will share progress keeps them informed.',
      field: input.published ? 'updates' : 'whatHappensNext',
      suggestion: input.published ? undefined : 'We will post an update on this page after each milestone, including receipts for purchases.',
    })
  }
  return items
}

export function readinessFromForm(form: CampaignForm, org: Organization, allowedGames: GameType[]): ReadinessInput {
  const goal = Number(form.goalAmount)
  return {
    title: form.title,
    summary: form.description,
    coverSet: Boolean(form.coverImageId),
    goalAmount: Number.isFinite(goal) && goal > 0 ? goal : null,
    currency: form.currency,
    story: { whoItHelps: form.storyWho, whatTheyNeed: form.storyNeed, whatItSupports: form.storySupports, whatHappensNext: form.storyNext, beneficiary: form.beneficiary },
    budget: formBudget(form),
    milestoneCount: form.milestonePlan.filter((item) => item.title.trim()).length,
    impactExampleCount: 0,
    contactEmail: org.content.contactEmail,
    publicDocumentCount: 0,
    updateCount: 0,
    requiredErrors: validateAll(form, allowedGames),
    published: false,
  }
}

export function readinessFromCampaign(campaign: Campaign, store: DemoStore, org: Organization): ReadinessInput {
  const form = campaignToForm(campaign)
  const required = validateAll(form)
  // Dates in the past are fine for a running campaign; only the order matters here.
  delete required.opensAt
  return {
    title: campaign.title,
    summary: campaign.description,
    coverSet: Boolean(campaign.coverImageId),
    goalAmount: campaign.goalAmount,
    currency: campaign.currency,
    story: {
      whoItHelps: campaign.story?.whoItHelps ?? '',
      whatTheyNeed: campaign.story?.whatTheyNeed ?? '',
      whatItSupports: campaign.story?.whatItSupports ?? '',
      whatHappensNext: campaign.story?.whatHappensNext ?? '',
      beneficiary: campaign.story?.beneficiary ?? '',
    },
    budget: campaign.budget ?? [],
    milestoneCount: campaignMilestones(store, campaign.id).length,
    impactExampleCount: campaign.impactExamples?.length ?? 0,
    contactEmail: org.content.contactEmail,
    publicDocumentCount: publicDocuments(store, campaign.id).length,
    updateCount: publishedUpdates(store, campaign.id).length,
    requiredErrors: required,
    published: true,
  }
}
