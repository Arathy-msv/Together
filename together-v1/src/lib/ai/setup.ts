import { coverTemplate } from '../../data/covers.ts'
import { gameMeta } from '../games.ts'
import { templateFor } from '../templates.ts'
import { EXPENSE_CATEGORY_LABEL } from '../transparency.ts'
import type { CampaignCategory, ExpenseCategory, GameType } from '../types.ts'
import { result, type AiResult } from './types.ts'

/* Campaign design suggestions · Simulated. Category-based rules only; nothing is applied until the
   organizer accepts an individual recommendation. */

export type SetupRecommendation =
  | { id: 'template'; label: string; category: CampaignCategory; reason: string }
  | { id: 'game'; label: string; gameType: GameType | null; reason: string }
  | { id: 'milestones'; label: string; milestones: string[]; reason: string }
  | { id: 'expenses'; label: string; categories: ExpenseCategory[]; reason: string }
  | { id: 'cover'; label: string; coverId: string; reason: string }

export function recommendCampaignSetup(category: CampaignCategory, allowedGames: GameType[]): AiResult<SetupRecommendation[]> {
  const template = templateFor(category)
  const game = template.games.find((item) => allowedGames.includes(item)) ?? null
  const unavailable = template.games.filter((item) => !allowedGames.includes(item))
  const cover = template.covers[0] ?? 'library'
  const items: SetupRecommendation[] = [
    { id: 'template', label: `${template.label} story template`, category, reason: `Prompts that fit ${template.blurb.toLowerCase()}` },
    game
      ? { id: 'game', label: gameMeta(game).name, gameType: game, reason: `${gameMeta(game).blurb} It is available for your organization.` }
      : {
          id: 'game',
          label: 'No game',
          gameType: null,
          reason: `${unavailable.length ? `${unavailable.map((item) => gameMeta(item).name).join(', ')} would fit but ${unavailable.length === 1 ? 'is' : 'are'} turned off. ` : ''}${
            template.comingSoonGames?.length ? `${template.comingSoonGames.join(', ')} is coming soon. ` : ''
          }Direct giving works well.`,
        },
    { id: 'milestones', label: `${template.milestones.length} milestone examples`, milestones: template.milestones, reason: 'Common steps for this kind of campaign. Edit dates and titles after accepting.' },
    {
      id: 'expenses',
      label: template.expenseCategories.map((item) => EXPENSE_CATEGORY_LABEL[item]).join(', '),
      categories: template.expenseCategories,
      reason: 'Typical expense categories to report against later.',
    },
    { id: 'cover', label: coverTemplate(cover).label, coverId: cover, reason: 'A cover image from the local gallery that matches the topic.' },
  ]
  return result(items.filter((item) => item.id !== 'milestones' || template.milestones.length > 0))
}
