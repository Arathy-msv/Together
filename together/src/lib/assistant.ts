import { formatDateTime, formatMoney } from './format.ts'
import { gameMeta } from './games.ts'
import { coverTemplate } from '../data/covers.ts'
import type { CampaignForm, GameType, OrgType, Organization } from './types.ts'
import { validateSettings, validateStory, type FormErrors } from './wizard.ts'

export type AssistantStepId = 'purpose' | 'title' | 'goal' | 'dates' | 'access' | 'participation' | 'game' | 'amounts' | 'cover'

export const ASSISTANT_STEPS: AssistantStepId[] = ['purpose', 'title', 'goal', 'dates', 'access', 'participation', 'game', 'amounts', 'cover']

/** Which form fields each question is responsible for, so errors from the shared validators map to one step. */
const STEP_FIELDS: Record<AssistantStepId, Array<keyof FormErrors>> = {
  purpose: ['description'],
  title: ['title'],
  goal: ['goalAmount'],
  dates: ['opensAt', 'closesAt'],
  access: ['accessCode'],
  participation: ['form'],
  game: ['gameType', 'puzzleImageData', 'gameRate', 'gameRoundSize', 'gameCap'],
  amounts: ['fixedAmounts'],
  cover: ['coverImageId'],
}

/** Steps that apply to this answer set: no game question without a game, no amount question without direct giving. */
export function activeSteps(form: CampaignForm): AssistantStepId[] {
  return ASSISTANT_STEPS.filter((step) => {
    if (step === 'game') return form.game
    if (step === 'amounts') return form.direct
    return true
  })
}

export function nextStep(current: AssistantStepId, form: CampaignForm): AssistantStepId | 'review' {
  const steps = activeSteps(form)
  const index = steps.indexOf(current)
  if (index < 0) return steps[0] ?? 'review'
  return steps[index + 1] ?? 'review'
}

export function previousStep(current: AssistantStepId | 'review', form: CampaignForm): AssistantStepId | null {
  const steps = activeSteps(form)
  if (current === 'review') return steps[steps.length - 1] ?? null
  const index = steps.indexOf(current)
  return index > 0 ? steps[index - 1] : null
}

/** Validates one answer with the same rules as the campaign form. */
export function validateStep(step: AssistantStepId, form: CampaignForm, allowedGames: GameType[]): FormErrors {
  const all: FormErrors = { ...validateStory(form), ...validateSettings(form, allowedGames) }
  const errors: FormErrors = {}
  for (const field of STEP_FIELDS[step]) {
    if (all[field]) errors[field] = all[field]
  }
  return errors
}

/** First step whose answer is still invalid, used before the final review and on create. */
export function firstInvalidStep(form: CampaignForm, allowedGames: GameType[]): AssistantStepId | null {
  for (const step of activeSteps(form)) {
    if (Object.keys(validateStep(step, form, allowedGames)).length > 0) return step
  }
  return null
}

export function stepQuestion(step: AssistantStepId, org: Pick<Organization, 'name'>): string {
  switch (step) {
    case 'purpose':
      return `Let’s create a campaign for ${org.name}. What are you raising funds for?`
    case 'title':
      return 'Lovely. What should the campaign be called?'
    case 'goal':
      return 'What is the fundraising target?'
    case 'dates':
      return 'When should it open and close?'
    case 'access':
      return 'Is it open to everyone, or a closed group?'
    case 'participation':
      return 'Should supporters donate directly, play a game, or both?'
    case 'game':
      return 'Which game should supporters play?'
    case 'amounts':
      return 'What contribution amounts should be offered?'
    case 'cover':
      return 'Last one — which cover image should we use?'
  }
}

export function stepHint(step: AssistantStepId, org: Pick<Organization, 'content' | 'defaults'>): string {
  switch (step) {
    case 'purpose':
      return `A sentence or two for ${org.content.supporterNoun || 'supporters'}: who it helps and what the money buys.`
    case 'title':
      return 'Short and specific works best — up to 80 characters.'
    case 'goal':
      return `Whole amounts in ${org.defaults.currency}, the default currency for new campaigns.`
    case 'dates':
      return `Your organization’s default is ${org.defaults.durationDays} days.`
    case 'access':
      return 'Closed groups join with a demo code and keep a leaderboard. This is not secure access control.'
    case 'participation':
      return 'Game actions add to a suggestion. Playing never collects money; supporters confirm the final amount.'
    case 'game':
      return 'Only games your organization has turned on are listed.'
    case 'amounts':
      return 'Applies to direct donations. Game contributions use each game’s rate.'
    case 'cover':
      return 'Pick a template or upload your own image.'
  }
}

export function answerSummary(step: AssistantStepId, form: CampaignForm): string {
  switch (step) {
    case 'purpose':
      return form.description.trim()
    case 'title':
      return form.title.trim()
    case 'goal':
      return formatMoney(Number(form.goalAmount) || 0, form.currency)
    case 'dates':
      return `${safeStamp(form.opensAt)} → ${safeStamp(form.closesAt)}`
    case 'access':
      return form.access === 'open' ? 'Open to everyone' : `Closed group · code ${form.accessCode}`
    case 'participation':
      return form.direct && form.game ? 'Both — donate or play' : form.game ? 'Play a game' : 'Donate directly'
    case 'game':
      return gameMeta(form.gameType).name + (form.gameType === 'puzzle' && form.puzzleImageData ? ' · image uploaded' : '')
    case 'amounts':
      return form.donationMode === 'custom'
        ? 'Supporters choose their own amount'
        : form.fixedAmounts.map((amount) => formatMoney(amount, form.currency)).join(', ')
    case 'cover':
      return form.coverImageId === 'upload' ? 'Your uploaded image' : coverTemplate(form.coverImageId).label
  }
}

function safeStamp(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return formatDateTime(date.toISOString())
}

export interface PurposeIdea {
  label: string
  description: string
  title: string
  coverImageId: string
}

const IDEAS: Record<OrgType, PurposeIdea[]> = {
  company: [
    { label: 'Volunteer day', title: 'Volunteer Day: River Clean-up', coverImageId: 'garden', description: 'Colleagues are spending a day cleaning the river path. Funds cover gloves, bags, saplings and transport for every volunteer.' },
    { label: 'Winter coats', title: 'Winter Coat Drive', coverImageId: 'jacket', description: 'Warm coats for families at our partner shelters. Every confirmed colleague gift is matched by the company.' },
    { label: 'Laptops for learners', title: 'Laptops for Learners', coverImageId: 'reading', description: 'Refurbished laptops and a year of internet for students at our partner schools so they can study from home.' },
  ],
  school: [
    { label: 'Library books', title: 'Grow Our School Library', coverImageId: 'library', description: 'New books and a cosy reading corner so every child can find a story they love and build confidence in reading.' },
    { label: 'Sports kits', title: 'Sports Day Kits', coverImageId: 'sports', description: 'Bibs, balls and first-aid kits so every house team is ready for Sports Day and weekly practice.' },
    { label: 'School garden', title: 'Our School Garden', coverImageId: 'garden', description: 'Raised beds, child-sized tools and seeds so every class can grow food and learn outdoors.' },
  ],
  club: [
    { label: 'New equipment', title: 'New Kit for the Season', coverImageId: 'sports', description: 'New balls, nets and training cones so every member can practise safely this season.' },
    { label: 'Clubhouse repairs', title: 'Fix Up Our Clubhouse', coverImageId: 'reading', description: 'Fresh paint, new benches and safer lighting for the clubhouse members share every week.' },
    { label: 'Youth scholarships', title: 'Youth Membership Scholarships', coverImageId: 'sports', description: 'Free memberships for young players whose families cannot cover the fees this year.' },
  ],
  nonprofit: [
    { label: 'Winter blankets', title: 'Winter Blankets for Shelters', coverImageId: 'winter', description: 'Thick blankets and warm jackets for families staying in our night shelters through the coldest months.' },
    { label: 'Community meals', title: 'Warm Meals Every Night', coverImageId: 'garden', description: 'Ingredients and kitchen supplies so our community kitchen can serve a warm meal to every family who visits.' },
    { label: 'Reading corners', title: 'Reading Corners in Shelters', coverImageId: 'reading', description: 'Books, lamps and beanbags so children in our shelters have a quiet place to read and do homework.' },
  ],
  platform: [
    { label: 'School library', title: 'Grow Our School Library', coverImageId: 'library', description: 'New books and a cosy reading corner so every child can find a story they love and build confidence in reading.' },
    { label: 'Community garden', title: 'Community Garden', coverImageId: 'garden', description: 'Beds, tools, seeds and a shady bench for a neighbourhood garden anyone can use.' },
    { label: 'Winter care', title: 'Winter Care Kits', coverImageId: 'winter', description: 'Coats, blankets and socks for children heading into the colder months.' },
  ],
}

export function purposeIdeas(type: OrgType): PurposeIdea[] {
  return IDEAS[type] ?? IDEAS.platform
}

/** Goal suggestions scaled from the organization's suggested amounts. */
export function goalIdeas(org: Pick<Organization, 'defaults'>): number[] {
  const base = org.defaults.suggestedAmounts[0] ?? 100
  return [base * 50, base * 100, base * 250]
}

/* ---------- Saved assistant drafts (one per organization) ---------- */

export const ASSISTANT_DRAFTS_KEY = 'together.assistantDrafts.v1'

export interface AssistantDraft {
  form: CampaignForm
  step: AssistantStepId | 'review'
  savedAt: string
}

function readAll(): Record<string, AssistantDraft> {
  try {
    const raw = localStorage.getItem(ASSISTANT_DRAFTS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, AssistantDraft>) : {}
  } catch {
    return {}
  }
}

export function readAssistantDraft(organizationId: string): AssistantDraft | null {
  const draft = readAll()[organizationId]
  if (!draft || !draft.form || typeof draft.form !== 'object') return null
  if (draft.form.organizationId !== organizationId) return null
  if (draft.step !== 'review' && !ASSISTANT_STEPS.includes(draft.step)) return null
  return draft
}

/** Returns false if the browser could not store the draft even without images. */
export function writeAssistantDraft(organizationId: string, draft: AssistantDraft): boolean {
  const all = readAll()
  all[organizationId] = draft
  try {
    localStorage.setItem(ASSISTANT_DRAFTS_KEY, JSON.stringify(all))
    return true
  } catch {
    all[organizationId] = { ...draft, form: { ...draft.form, coverImageData: '', puzzleImageData: '', logoData: '' } }
    try {
      localStorage.setItem(ASSISTANT_DRAFTS_KEY, JSON.stringify(all))
      return true
    } catch {
      return false
    }
  }
}

export function clearAssistantDraft(organizationId: string): void {
  const all = readAll()
  delete all[organizationId]
  try {
    localStorage.setItem(ASSISTANT_DRAFTS_KEY, JSON.stringify(all))
  } catch {
    // Nothing else to clear.
  }
}
