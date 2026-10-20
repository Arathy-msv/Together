import { formatDate, formatMoney } from '../format.ts'
import { gameMeta } from '../games.ts'
import { templateFor } from '../templates.ts'
import {
  campaignMilestones,
  EXPENSE_CATEGORY_LABEL,
  formatMinor,
  fundSummary,
  MILESTONE_LABEL,
  publicDocuments,
  publishedExpenses,
  publishedUpdates,
} from '../transparency.ts'
import type { Campaign, CampaignForm, DemoStore, Expense, GameType, Milestone, Organization, SupportingDocument } from '../types.ts'
import { formBudget } from '../wizard.ts'
import { extractAmount } from './parse.ts'
import { checkReadiness, readinessFromForm } from './readiness.ts'
import { placeholder, result, type AiResult, type SourceRef } from './types.ts'

/* Deterministic writers. They arrange facts the organizer supplied and values the app calculated;
   they never add beneficiaries, costs, dates, outcomes or claims of completion. */

const sentence = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const capped = trimmed[0].toUpperCase() + trimmed.slice(1)
  return /[.!?…]$/.test(capped) ? capped : `${capped}.`
}

/* ---------- Campaign draft ---------- */

export interface CampaignDraftSuggestion {
  title: string
  summary: string
  story: { whoItHelps: string; whatTheyNeed: string; whatItSupports: string; whatHappensNext: string }
  milestones: string[]
  game: { gameType: GameType | null; reason: string }
}

export function suggestCampaignDraft(form: CampaignForm, org: Organization, allowedGames: GameType[]): AiResult<CampaignDraftSuggestion> {
  const template = templateFor(form.category)
  const goal = Number(form.goalAmount)
  const amount = Number.isFinite(goal) && goal > 0 ? formatMoney(goal, form.currency) : placeholder('target amount')
  const purpose = form.description.trim()
  const budget = formBudget(form)
  const missing: string[] = []
  if (!purpose) missing.push('What the campaign is raising funds for')
  if (!form.storyWho.trim() && !form.beneficiary.trim()) missing.push('Who the campaign helps')
  if (budget.length === 0) missing.push('A budget breakdown (organizer-supplied amounts)')
  if (!form.storyNext.trim()) missing.push('What happens after fundraising')

  const mentioned = extractAmount(purpose)
  if (mentioned.amount && Number.isFinite(goal) && mentioned.amount !== goal) {
    missing.push(`Your purpose mentions ${mentioned.amountText} but the target is ${amount}. Update one so they match.`)
  }
  // Never restate an amount next to the organizer's own figure; their sentence is kept as written.
  const summaryParts = mentioned.amount ? [sentence(purpose)] : [`${org.name} is raising ${amount}.`, purpose ? sentence(purpose) : placeholder('Describe what the funds are for')]
  const supports = form.storySupports.trim() || (budget.length ? `Contributions will pay for: ${budget.map((line) => line.label).join(', ')}.` : placeholder('What contributions will pay for'))
  const gameType = template.games.find((game) => allowedGames.includes(game)) ?? null
  const content: CampaignDraftSuggestion = {
    title: form.title.trim() || placeholder('Short, specific campaign title'),
    summary: summaryParts.join(' '),
    story: {
      whoItHelps: form.storyWho.trim() || placeholder('Who this helps — describe the group, not individuals'),
      whatTheyNeed: form.storyNeed.trim() || placeholder('What they need today'),
      whatItSupports: supports,
      whatHappensNext: form.storyNext.trim() || placeholder('What happens after fundraising'),
    },
    milestones: template.milestones,
    game: gameType
      ? { gameType, reason: `${gameMeta(gameType).name} suits ${template.label.toLowerCase()} campaigns and is turned on for ${org.name}.` }
      : { gameType: null, reason: `None of the games suggested for ${template.label.toLowerCase()} are turned on for ${org.name}. Direct giving works well.` },
  }
  const readiness = checkReadiness(readinessFromForm(form, org, allowedGames))
  for (const item of readiness.filter((entry) => entry.level === 'required')) missing.push(item.issue)
  return result(content, { missing: [...new Set(missing)], sources: [{ kind: 'organization', id: org.id, label: org.name }] })
}

/* ---------- Progress update ---------- */

export interface UpdateInput {
  campaign: Campaign
  whatHappened: string
  milestone?: Milestone
  date: string
  expenses: Expense[]
  challenges: string
  next: string
  evidence: SupportingDocument[]
}

export interface UpdateDraft {
  title: string
  summary: string
  body: string
  spending: string
  nextSteps: string
}

/** How a milestone's organizer-reported status may be described. Plans are never described as done. */
export function milestonePhrase(milestone: Milestone): string {
  const due = formatDate(milestone.dueDate)
  switch (milestone.status) {
    case 'reported_complete':
      return `The organizer reports “${milestone.title}” as complete${milestone.completedAt ? ` (${formatDate(milestone.completedAt)})` : ''}.`
    case 'in_progress':
      return `“${milestone.title}” is in progress${milestone.progressNote ? `: ${milestone.progressNote}` : ''}. It is expected by ${due}.`
    default:
      return `“${milestone.title}” is planned and has not started yet. It is expected by ${due}.`
  }
}

export function draftCampaignUpdate(input: UpdateInput): AiResult<UpdateDraft> {
  const { campaign, milestone } = input
  const missing: string[] = []
  const happened = input.whatHappened.trim()
  if (!happened) missing.push('What happened (required)')
  if (!input.next.trim()) missing.push('What happens next')
  const statusWord = milestone ? MILESTONE_LABEL[milestone.status].toLowerCase() : null
  const title = milestone ? `${milestone.title}: ${statusWord}` : happened ? sentence(happened).split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, '').slice(0, 80) : placeholder('Update title')
  const published = input.expenses.filter((expense) => expense.status === 'published')
  const total = published.reduce((sum, expense) => sum + expense.amountMinor, 0)
  const spending = published.length
    ? `Organizer-reported spending linked to this update: ${published
        .map((expense) => `${expense.description} (${formatMinor(expense.amountMinor, campaign.currency)}, ${formatDate(expense.date)})`)
        .join('; ')}. Total ${formatMinor(total, campaign.currency)}.`
    : 'No spending is linked to this update.'
  const body = [
    happened ? sentence(happened) : placeholder('Describe what happened — required'),
    milestone ? milestonePhrase(milestone) : '',
    input.challenges.trim() ? `Challenges or delays: ${sentence(input.challenges)}` : '',
    input.evidence.length ? `Supporting documents: ${input.evidence.map((doc) => doc.title).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  const sources: SourceRef[] = [
    ...(milestone ? [{ kind: 'milestone' as const, id: milestone.id, label: milestone.title }] : []),
    ...published.map((expense) => ({ kind: 'expense' as const, id: expense.id, label: expense.description })),
    ...input.evidence.map((doc) => ({ kind: 'document' as const, id: doc.id, label: doc.title })),
  ]
  return result(
    {
      title,
      summary: happened ? sentence(happened).split(/(?<=[.!?])\s/)[0] : placeholder('One-sentence summary'),
      body,
      spending,
      nextSteps: input.next.trim() ? sentence(input.next) : placeholder('What happens next'),
    },
    { missing, sources },
  )
}

/** Joins the editable sections into one update body. */
export function composeUpdateBody(draft: UpdateDraft): string {
  return [
    draft.summary && !draft.body.startsWith(draft.summary) ? draft.summary : '',
    draft.body,
    draft.spending,
    draft.nextSteps ? `What happens next: ${draft.nextSteps}` : '',
  ]
    .filter((part) => part.trim())
    .join('\n\n')
}

/* ---------- Final impact report ---------- */

export interface ReportSection {
  heading: string
  text: string
}

export interface ImpactReportDraft {
  sections: ReportSection[]
  outcomesText: string
  evidenceDocumentIds: string[]
  evidenceUpdateIds: string[]
}

export function draftImpactReport(campaign: Campaign, store: DemoStore, organizerOutcomes: string, organizerPlan: string): AiResult<ImpactReportDraft> {
  const summary = fundSummary(campaign, store)
  const expenses = publishedExpenses(store, campaign.id)
  const milestones = campaignMilestones(store, campaign.id)
  const updates = publishedUpdates(store, campaign.id)
  const docs = publicDocuments(store, campaign.id)
  const missing: string[] = []
  const byCategory = new Map<string, number>()
  for (const expense of expenses) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amountMinor)
  const unfinished = milestones.filter((item) => item.status !== 'reported_complete')
  const noEvidence = expenses.filter((item) => !item.publicReceipt)
  if (!organizerOutcomes.trim()) missing.push('Outcomes reported by the organizer')
  if (summary.balanceMinor !== 0 && !organizerPlan.trim()) missing.push('Plan for the remaining funds')
  if (noEvidence.length) missing.push(`Evidence for ${noEvidence.length} published expense${noEvidence.length === 1 ? '' : 's'}`)

  const sections: ReportSection[] = [
    { heading: 'Campaign purpose', text: campaign.description },
    {
      heading: 'Fundraising summary',
      text: `Confirmed simulated contributions: ${formatMinor(summary.contributedMinor, campaign.currency)} against a target of ${formatMoney(campaign.goalAmount, campaign.currency)}.`,
    },
    {
      heading: 'Reported use of funds',
      text: expenses.length
        ? `Published organizer-reported expenses total ${formatMinor(summary.spentMinor, campaign.currency)}: ${[...byCategory]
            .map(([category, minor]) => `${EXPENSE_CATEGORY_LABEL[category as keyof typeof EXPENSE_CATEGORY_LABEL]} ${formatMinor(minor, campaign.currency)}`)
            .join(', ')}.${noEvidence.length ? ` No supporting evidence is uploaded for: ${noEvidence.map((item) => item.description).join(', ')}.` : ''}`
        : 'No organizer-reported expenses have been published.',
    },
    { heading: 'Outcomes reported', text: organizerOutcomes.trim() ? sentence(organizerOutcomes) : placeholder('Organizer to describe outcomes') },
    {
      heading: 'Remaining activities',
      text: unfinished.length
        ? unfinished.map((item) => `${item.title} — ${MILESTONE_LABEL[item.status].toLowerCase()}, expected by ${formatDate(item.dueDate)}`).join('; ') + '.'
        : milestones.length
          ? 'All milestones are reported complete by the organizer.'
          : 'No milestones were recorded.',
    },
    {
      heading: 'Remaining funds and stated plan',
      text: `Demo calculation: ${formatMinor(summary.balanceMinor, campaign.currency)} (contributions minus published expenses). ${
        organizerPlan.trim() ? sentence(organizerPlan) : placeholder('Organizer to state the plan for remaining funds')
      }`,
    },
    {
      heading: 'Evidence',
      text: docs.length || updates.length ? [...docs.map((doc) => doc.title), ...updates.map((update) => `Update: ${update.title}`)].join('; ') + '.' : 'No public evidence yet.',
    },
  ]
  return result(
    {
      sections,
      outcomesText: sections.map((section) => `${section.heading}\n${section.text}`).join('\n\n'),
      evidenceDocumentIds: docs.map((doc) => doc.id),
      evidenceUpdateIds: updates.map((update) => update.id),
    },
    {
      missing,
      sources: [
        { kind: 'campaign', id: campaign.id, label: 'Confirmed contributions' },
        ...expenses.map((expense) => ({ kind: 'expense' as const, id: expense.id, label: expense.description })),
        ...unfinished.map((item) => ({ kind: 'milestone' as const, id: item.id, label: item.title })),
        ...updates.map((update) => ({ kind: 'update' as const, id: update.id, label: update.title })),
        ...docs.map((doc) => ({ kind: 'document' as const, id: doc.id, label: doc.title })),
      ],
    },
  )
}

/* ---------- Referral message ---------- */

export type ReferralTone = 'warm' | 'professional' | 'brief'

export interface ReferralMessageInput {
  campaignTitle: string
  organizerName: string
  why: string
  connection: string
  tone: ReferralTone
}

export function suggestReferralMessage(input: ReferralMessageInput): AiResult<string[]> {
  const why = input.why.trim()
  if (!why) return result([], { missing: ['Why you support this campaign, in your own words'] })
  const reason = sentence(why)
  const connection = input.connection.trim() ? sentence(input.connection) : ''
  const facts = `${input.campaignTitle}, organised by ${input.organizerName}`
  const options: Record<ReferralTone, string[]> = {
    warm: [
      [connection, reason, `I’m sharing ${facts}. If you’d like to help, you can give directly or play along on this page.`].filter(Boolean).join(' '),
      [reason, connection, `Every contribution here goes to ${facts}.`].filter(Boolean).join(' '),
      [`I care about ${input.campaignTitle}.`, reason, connection].filter(Boolean).join(' '),
    ],
    professional: [
      [`I’m supporting ${facts}.`, reason, connection, 'Contributions go directly to the original campaign.'].filter(Boolean).join(' '),
      [connection, reason, `Please consider supporting ${facts}.`].filter(Boolean).join(' '),
      [`${input.campaignTitle} is run by ${input.organizerName}.`, reason].join(' '),
    ],
    brief: [`${reason} Please consider supporting ${input.campaignTitle}.`, `Supporting ${input.campaignTitle}: ${reason}`, reason],
  }
  const unique = [...new Set(options[input.tone].map((text) => text.replace(/\s+/g, ' ').trim()))].slice(0, 3)
  return result(unique, { sources: [{ kind: 'campaign', id: input.campaignTitle, label: input.campaignTitle }] })
}

/** Keeps the first sentence(s) up to ~200 characters. Never adds new content. */
export function shortenMessage(text: string, max = 200): string {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)
  let out = ''
  for (const part of sentences) {
    if ((out + ' ' + part).trim().length > max) break
    out = (out + ' ' + part).trim()
  }
  return out || text.slice(0, max).trim()
}
