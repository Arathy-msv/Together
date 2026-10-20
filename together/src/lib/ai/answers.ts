import { goalReached, raisedOf, statusOf } from '../campaigns.ts'
import { formatDate, formatMoney } from '../format.ts'
import { campaignGameSettings, gameIntroSentence } from '../gameContribution.ts'
import { gameMeta } from '../games.ts'
import { campaignMilestones, formatMinor, fundSummary, MILESTONE_LABEL, publicDocuments, publishedExpenses, publishedUpdates } from '../transparency.ts'
import type { Campaign, CampaignUpdate, DemoStore, Expense, Milestone, SupportingDocument } from '../types.ts'
import { result, type AiResult } from './types.ts'

/*
 * Donor question answering. Answers are built only from a public snapshot of ONE campaign —
 * published updates and expenses, the public timeline and public evidence. Drafts, private
 * documents, organizer-only receipts and other campaigns are never part of the snapshot.
 */

export const NOT_PUBLISHED = 'This information has not been published yet.'

export interface PublicSnapshot {
  campaign: Pick<Campaign, 'id' | 'title' | 'description' | 'organizerName' | 'goalAmount' | 'currency' | 'participation' | 'gameType' | 'gameSettings' | 'story' | 'budget'>
  raised: number
  status: string
  goalReached: boolean
  updates: Pick<CampaignUpdate, 'id' | 'title' | 'date'>[]
  milestones: Pick<Milestone, 'id' | 'title' | 'status' | 'dueDate' | 'completedAt' | 'progressNote'>[]
  expenses: Pick<Expense, 'id' | 'description' | 'amountMinor'>[]
  spentMinor: number
  documents: Pick<SupportingDocument, 'id' | 'title'>[]
}

export function buildPublicSnapshot(campaign: Campaign, store: DemoStore): PublicSnapshot {
  const raised = raisedOf(campaign.id, store.contributions)
  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      organizerName: campaign.organizerName,
      goalAmount: campaign.goalAmount,
      currency: campaign.currency,
      participation: campaign.participation,
      gameType: campaign.gameType,
      gameSettings: campaign.gameSettings,
      story: campaign.story,
      budget: campaign.budget,
    },
    raised,
    status: statusOf(campaign, store.contributions),
    goalReached: goalReached(raised, campaign.goalAmount),
    updates: publishedUpdates(store, campaign.id).map(({ id, title, date }) => ({ id, title, date })),
    milestones: campaignMilestones(store, campaign.id).map(({ id, title, status, dueDate, completedAt, progressNote }) => ({ id, title, status, dueDate, completedAt, progressNote })),
    expenses: publishedExpenses(store, campaign.id).map(({ id, description, amountMinor }) => ({ id, description, amountMinor })),
    spentMinor: fundSummary(campaign, store).spentMinor,
    documents: publicDocuments(store, campaign.id).map(({ id, title }) => ({ id, title })),
  }
}

export type QuestionIntent = 'supports' | 'progress' | 'spending' | 'goal' | 'distribution' | 'game' | 'beneficiary' | 'documents'

export const SUGGESTED_QUESTIONS: Array<{ intent: QuestionIntent; text: string }> = [
  { intent: 'supports', text: 'What will contributions support?' },
  { intent: 'progress', text: 'What has happened so far?' },
  { intent: 'spending', text: 'How much spending has been reported?' },
  { intent: 'goal', text: 'Has the campaign reached its goal?' },
  { intent: 'distribution', text: 'Has distribution been completed?' },
  { intent: 'game', text: 'How does the game contribution work?' },
]

/** Maps a question to one of the fixed intents. Unknown questions are not guessed at. */
const INTENT_PATTERNS: Array<[QuestionIntent, RegExp]> = [
  ['distribution', /\b(distribut\w*|deliver\w*|hand(ed)? out|received)\b/i],
  ['spending', /\b(spen[dt]\w*|expenses?|receipts?|cost\w*|money (gone|used))\b/i],
  ['goal', /\b(goal|target|reached|how much (has been )?raised|funded)\b/i],
  ['game', /\b(game|play\w*)\b/i],
  ['progress', /\b(happened|progress|so far|updates?|news|latest)\b/i],
  ['supports', /\b(support|pay for|used for|funds? (go|for)|what (will|does) .* (buy|fund))\b/i],
  ['beneficiary', /\b(who (does it|will it|is) help\w*|beneficiar\w*|who benefits)\b/i],
  ['documents', /\b(documents?|evidence|proof|quotation)\b/i],
]

export function detectIntent(question: string): QuestionIntent | null {
  return INTENT_PATTERNS.find(([, pattern]) => pattern.test(question))?.[0] ?? null
}

export interface PublicAnswer {
  intent: QuestionIntent | null
  text: string
  /** Campaign tab that holds the public source. */
  tab?: 'story' | 'updates' | 'fund' | 'trust'
  latestDate?: string
  known: boolean
  organizerReported: boolean
}

export function answerPublicQuestion(question: string, snapshot: PublicSnapshot): AiResult<PublicAnswer> {
  const intent = detectIntent(question)
  const { campaign } = snapshot
  const latest = snapshot.updates[0]
  const unknown = (tab: PublicAnswer['tab']): AiResult<PublicAnswer> => result({ intent, text: NOT_PUBLISHED, tab, known: false, organizerReported: false })
  switch (intent) {
    case null:
      return result(
        {
          intent: null,
          text: 'This demo can only answer a few common questions from the campaign’s published information. Try one of the suggested questions below.',
          known: false,
          organizerReported: false,
        },
        {},
      )
    case 'supports': {
      const supports = campaign.story?.whatItSupports?.trim()
      const budget = campaign.budget ?? []
      if (!supports && budget.length === 0) return unknown('story')
      const text = [supports ? `The organizer says: “${supports}”` : '', budget.length ? `Planned budget: ${budget.map((line) => `${line.label} ${formatMinor(line.amountMinor, campaign.currency)}`).join('; ')}. Planned amounts are not spending.` : '']
        .filter(Boolean)
        .join(' ')
      return result({ intent, text, tab: 'story', known: true, organizerReported: true }, { sources: [{ kind: 'campaign', id: campaign.id, label: 'Story' }] })
    }
    case 'beneficiary': {
      const who = campaign.story?.beneficiary?.trim() || campaign.story?.whoItHelps?.trim()
      if (!who) return unknown('trust')
      return result({ intent, text: `The organizer describes the beneficiaries as: “${who}”`, tab: 'trust', known: true, organizerReported: true }, { sources: [{ kind: 'campaign', id: campaign.id, label: 'Trust & documents' }] })
    }
    case 'progress': {
      if (!latest) return unknown('updates')
      const complete = snapshot.milestones.filter((item) => item.status === 'reported_complete').length
      const text = `${snapshot.updates.length} update${snapshot.updates.length === 1 ? ' has' : 's have'} been published. The latest is “${latest.title}” (${formatDate(latest.date)}).${
        snapshot.milestones.length ? ` ${complete} of ${snapshot.milestones.length} milestones are reported complete by the organizer.` : ''
      }`
      return result({ intent, text, tab: 'updates', latestDate: latest.date, known: true, organizerReported: true }, { sources: snapshot.updates.slice(0, 3).map((update) => ({ kind: 'update', id: update.id, label: update.title })) })
    }
    case 'spending': {
      if (snapshot.expenses.length === 0) return unknown('fund')
      const text = `The organizer has published ${snapshot.expenses.length} expense${snapshot.expenses.length === 1 ? '' : 's'} totalling ${formatMinor(snapshot.spentMinor, campaign.currency)}. This is organizer-reported spending, not an audited statement.`
      return result({ intent, text, tab: 'fund', known: true, organizerReported: true }, { sources: snapshot.expenses.map((expense) => ({ kind: 'expense', id: expense.id, label: expense.description })) })
    }
    case 'goal': {
      const text = snapshot.goalReached
        ? `Yes. Confirmed simulated contributions of ${formatMoney(snapshot.raised, campaign.currency)} have reached the ${formatMoney(campaign.goalAmount, campaign.currency)} goal. Reaching the goal does not mean delivery is complete.`
        : `Not yet. Confirmed simulated contributions are ${formatMoney(snapshot.raised, campaign.currency)} of the ${formatMoney(campaign.goalAmount, campaign.currency)} goal.`
      return result({ intent, text, tab: 'story', known: true, organizerReported: false }, { sources: [{ kind: 'campaign', id: campaign.id, label: 'Campaign progress' }] })
    }
    case 'distribution': {
      const milestone = snapshot.milestones.find((item) => /distribut|deliver|hand out|set up/i.test(item.title))
      if (!milestone) return unknown('updates')
      const text = `The milestone “${milestone.title}” is ${MILESTONE_LABEL[milestone.status].toLowerCase()} (organizer-reported)${
        milestone.status === 'reported_complete' && milestone.completedAt ? `, reported on ${formatDate(milestone.completedAt)}` : `, expected by ${formatDate(milestone.dueDate)}`
      }.${milestone.progressNote ? ` Progress note: ${milestone.progressNote}` : ''}`
      return result({ intent, text, tab: 'updates', latestDate: latest?.date, known: true, organizerReported: true }, { sources: [{ kind: 'milestone', id: milestone.id, label: milestone.title }] })
    }
    case 'game': {
      if (!campaign.participation.game) return result({ intent, text: 'This campaign accepts direct contributions only; it has no game.', tab: 'story', known: true, organizerReported: false })
      const rate = campaignGameSettings({ gameType: campaign.gameType, gameSettings: campaign.gameSettings }).ratePaise
      return result(
        { intent, text: `${gameMeta(campaign.gameType).name}: ${gameIntroSentence(campaign.gameType, rate)}`, tab: 'story', known: true, organizerReported: false },
        { sources: [{ kind: 'campaign', id: campaign.id, label: 'Game rules' }] },
      )
    }
    case 'documents': {
      if (snapshot.documents.length === 0) return unknown('trust')
      return result(
        { intent, text: `Public supporting documents: ${snapshot.documents.map((doc) => doc.title).join(', ')}. Documents are provided by the organizer and are not independently verified.`, tab: 'trust', known: true, organizerReported: true },
        { sources: snapshot.documents.map((doc) => ({ kind: 'document', id: doc.id, label: doc.title })) },
      )
    }
  }
}
