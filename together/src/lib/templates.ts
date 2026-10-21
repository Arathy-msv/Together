import { coverTemplate } from '../data/covers.ts'
import { blankBudgetLine } from './budget.ts'
import { gameMeta } from './games.ts'
import type { CampaignCategory, CampaignForm, ExpenseCategory, GameType } from './types.ts'

/* Category templates are editable suggestions. They never write story text or impact claims;
   they offer prompts, starting milestone and budget headings, a cover and a suitable game. */

export interface CategoryTemplate {
  id: CampaignCategory
  label: string
  blurb: string
  prompts: { who: string; need: string; supports: string; next: string; beneficiary: string }
  covers: string[]
  milestones: string[]
  budgetLabels: string[]
  expenseCategories: ExpenseCategory[]
  games: GameType[]
  /** Not-yet-built games that would suit this category. */
  comingSoonGames?: string[]
  impactFields: string[]
}

export const TEMPLATES: CategoryTemplate[] = [
  {
    id: 'education',
    label: 'Education',
    blurb: 'Books, learning materials and school spaces.',
    prompts: {
      who: 'Which students or classes will benefit?',
      need: 'What is missing today, and how does it affect learning?',
      supports: 'Which materials or spaces will contributions pay for?',
      next: 'How and when will the materials reach students?',
      beneficiary: 'Describe the group (e.g. “Grade 4 students”), not individual children.',
    },
    covers: ['library', 'reading'],
    milestones: ['Confirm needs with the school', 'Purchase materials', 'Deliver and set up', 'Share what students did'],
    budgetLabels: ['Books and materials', 'Delivery', 'Setup'],
    expenseCategories: ['materials', 'transport', 'event'],
    games: ['puzzle', 'memory'],
    comingSoonGames: ['Pencil writing'],
    impactFields: ['Students reached', 'Items delivered'],
  },
  {
    id: 'clothing',
    label: 'Clothing & essential supplies',
    blurb: 'Coats, blankets, hygiene kits and other essentials.',
    prompts: {
      who: 'Who will receive the items? Describe the group, not individuals.',
      need: 'What do they lack right now, and why does it matter this season?',
      supports: 'Which items will be bought, and roughly how many?',
      next: 'How will items be bought and handed out?',
      beneficiary: 'For example “families at three partner shelters”. Avoid names and addresses.',
    },
    covers: ['winter', 'jacket'],
    milestones: ['Identify recipients', 'Purchase clothing', 'Distribute clothing', 'Publish final report'],
    budgetLabels: ['Clothing and supplies', 'Transport', 'Packaging'],
    expenseCategories: ['materials', 'transport', 'administration'],
    games: ['jacket'],
    impactFields: ['Items distributed', 'Locations reached'],
  },
  {
    id: 'environment',
    label: 'Environment',
    blurb: 'Planting, gardens, clean-ups and green spaces.',
    prompts: {
      who: 'Which community or place will benefit?',
      need: 'What is the environmental problem you are addressing?',
      supports: 'Which plants, tools or materials will contributions pay for?',
      next: 'When will planting happen, and who will care for it afterwards?',
      beneficiary: 'For example “residents around Riverside Park”.',
    },
    covers: ['garden'],
    milestones: ['Prepare the site', 'Plant', 'Set up a care and watering rota', 'Report on how plants are doing'],
    budgetLabels: ['Plants and seeds', 'Tools', 'Water and care'],
    expenseCategories: ['materials', 'transport', 'event'],
    games: ['garden'],
    impactFields: ['Plants planted', 'Still growing after three months'],
  },
  {
    id: 'sports',
    label: 'Sports & clubs',
    blurb: 'Equipment, kit, travel and club activities.',
    prompts: {
      who: 'Which team, club or age group will benefit?',
      need: 'What equipment or support is missing?',
      supports: 'What will contributions buy?',
      next: 'When will the equipment arrive and be used?',
      beneficiary: 'For example “the under-12 squad”.',
    },
    covers: ['sports'],
    milestones: ['Order equipment', 'Hand out to teams', 'Share a season report'],
    budgetLabels: ['Equipment', 'Kit', 'Travel'],
    expenseCategories: ['materials', 'transport', 'event'],
    games: ['memory', 'puzzle'],
    impactFields: ['Players equipped', 'Sessions held'],
  },
  {
    id: 'community',
    label: 'Community projects',
    blurb: 'Neighbourhood spaces, events and shared resources.',
    prompts: {
      who: 'Who in the community will use or benefit from this?',
      need: 'What gap does the project fill?',
      supports: 'Which materials, permits or event costs will contributions cover?',
      next: 'What are the next steps once funds arrive?',
      beneficiary: 'For example “neighbours on Mill Lane”.',
    },
    covers: ['garden', 'reading'],
    milestones: ['Plan with neighbours', 'Buy materials', 'Run the project', 'Share results'],
    budgetLabels: ['Materials', 'Event costs', 'Permits'],
    expenseCategories: ['materials', 'event', 'administration'],
    games: ['garden', 'puzzle'],
    impactFields: ['People involved', 'Events held'],
  },
  {
    id: 'other',
    label: 'Other',
    blurb: 'Start from a blank story.',
    prompts: {
      who: 'Who does this campaign help?',
      need: 'What do they need?',
      supports: 'What will contributions support?',
      next: 'What happens next?',
      beneficiary: 'Describe who benefits without personal details.',
    },
    covers: ['library'],
    milestones: [],
    budgetLabels: [],
    expenseCategories: ['materials', 'transport', 'event', 'administration', 'other'],
    games: ['garden', 'memory', 'puzzle', 'jacket'],
    impactFields: ['Outcome'],
  },
]

export function templateFor(category: CampaignCategory | undefined): CategoryTemplate {
  return TEMPLATES.find((template) => template.id === category) ?? TEMPLATES[TEMPLATES.length - 1]
}

export interface TemplateChange {
  field: string
  kind: 'add' | 'replace' | 'keep'
  before: string
  after: string
}

export interface TemplateOptions {
  /** Replace the milestone plan, budget headings and cover even if they already have content. */
  replaceLists: boolean
  /** Switch to the template's suggested game (only when the organization allows it). */
  useGame: GameType | null
}

const listText = (items: string[]) => (items.length ? items.join(', ') : 'None')

/**
 * Applies a template without touching story text. Lists are only filled when empty unless the
 * organizer explicitly asks to replace them after previewing the changes.
 */
export function applyTemplate(form: CampaignForm, template: CategoryTemplate, options: TemplateOptions): { form: CampaignForm; changes: TemplateChange[] } {
  const changes: TemplateChange[] = []
  const next: CampaignForm = { ...form, category: template.id }
  if (form.category !== template.id) changes.push({ field: 'Campaign type', kind: 'replace', before: templateFor(form.category).label, after: template.label })

  const currentMilestones = form.milestonePlan.filter((item) => item.title.trim()).map((item) => item.title)
  if (template.milestones.length > 0) {
    if (currentMilestones.length === 0 || options.replaceLists) {
      next.milestonePlan = template.milestones.map((title) => ({ id: crypto.randomUUID(), title, due: '' }))
      changes.push({ field: 'Milestone plan', kind: currentMilestones.length ? 'replace' : 'add', before: listText(currentMilestones), after: listText(template.milestones) })
    } else {
      changes.push({ field: 'Milestone plan', kind: 'keep', before: listText(currentMilestones), after: listText(currentMilestones) })
    }
  }

  const currentBudget = form.budget.filter((line) => line.label.trim() || line.amount.trim())
  if (template.budgetLabels.length > 0) {
    if (currentBudget.length === 0 || options.replaceLists) {
      next.budget = template.budgetLabels.map((label) => ({ ...blankBudgetLine(), label }))
      changes.push({
        field: 'Budget headings (amounts left blank)',
        kind: currentBudget.length ? 'replace' : 'add',
        before: listText(currentBudget.map((line) => line.label)),
        after: listText(template.budgetLabels),
      })
    } else {
      changes.push({ field: 'Budget', kind: 'keep', before: listText(currentBudget.map((line) => line.label)), after: listText(currentBudget.map((line) => line.label)) })
    }
  }

  const suggestedCover = template.covers[0]
  if (options.replaceLists && suggestedCover && form.coverImageId !== suggestedCover && form.coverImageId !== 'upload') {
    next.coverImageId = suggestedCover
    changes.push({ field: 'Cover image', kind: 'replace', before: coverTemplate(form.coverImageId).label, after: coverTemplate(suggestedCover).label })
  }

  if (options.useGame && (!form.game || form.gameType !== options.useGame)) {
    next.game = true
    next.gameType = options.useGame
    changes.push({ field: 'Game', kind: 'replace', before: form.game ? gameMeta(form.gameType).name : 'No game', after: gameMeta(options.useGame).name })
  }

  for (const [field, value] of [
    ['Title', form.title],
    ['Summary', form.description],
    ['Story sections', [form.storyWho, form.storyNeed, form.storySupports, form.storyNext].filter(Boolean).join(' ')],
  ] as const) {
    if (value.trim()) changes.push({ field, kind: 'keep', before: value.slice(0, 80), after: value.slice(0, 80) })
  }
  return { form: next, changes }
}
