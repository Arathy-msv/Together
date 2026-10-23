import { parseCampaignMessage } from './parse.ts'
import { templateFor } from '../templates.ts'
import type { CampaignForm, GameType, Organization } from '../types.ts'
import { gameSettingsFields } from '../wizard.ts'

/** Short title from the first clause of a purpose sentence. */
export function titleFromPurpose(purpose: string): string {
  const first = purpose.split(/[.!?]/)[0]?.trim() ?? ''
  if (first.length < 8) return ''
  if (first.length <= 80) return first
  return `${first.slice(0, 77).trimEnd()}…`
}

/**
 * Fills a blank campaign form from one purpose sentence.
 * Uses only explicit amount/currency and a suggested category from the text;
 * other fields come from org defaults and the matching category template.
 */
export function fillCampaignFromPurpose(
  form: CampaignForm,
  org: Organization,
  purpose: string,
  allowedGames: GameType[],
): CampaignForm {
  const text = purpose.trim()
  const parsed = parseCampaignMessage(text)
  const category = parsed.category && parsed.category !== 'other' ? parsed.category : form.category === 'other' ? 'community' : form.category
  const template = templateFor(category)
  const gameType =
    (allowedGames.includes('garden') ? 'garden' : undefined) ??
    template.games.find((game) => allowedGames.includes(game))
  const title = titleFromPurpose(text)

  return {
    ...form,
    description: text,
    title: title || form.title,
    goalAmount: parsed.amount ? String(parsed.amount) : form.goalAmount,
    currency: parsed.currency ?? form.currency,
    category,
    coverImageId: template.covers[0] ?? form.coverImageId,
    storySupports: text,
    milestonePlan: template.milestones.map((item) => ({ id: crypto.randomUUID(), title: item, due: '' })),
    ...(gameType
      ? { game: true, gameType, ...gameSettingsFields(gameType) }
      : { game: false, direct: true }),
  }
}
