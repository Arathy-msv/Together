import { makeAccessCode } from './campaigns.ts'
import { fromDatetimeLocal, isCurrencyCode, toDatetimeLocal } from './format.ts'
import {
  campaignGameSettings,
  defaultGameSettings,
  gameConfig,
  paiseToInput,
  parseRupeesToPaise,
  MAX_CONTRIBUTION_PAISE,
} from './gameContribution.ts'
import { isGameType } from './games.ts'
import { DEFAULT_DEFAULTS, DEFAULT_ORG_ID, DEFAULT_VISIBILITY, IMPLEMENTED_GAMES } from './organizations.ts'
import type { Campaign, CampaignForm, GameContributionSettings, GameType, Organization } from './types.ts'

/** The organization fields that shape a new campaign. */
export type OrgFormContext = Pick<Organization, 'id' | 'name' | 'defaults' | 'visibility'>

const FALLBACK_CONTEXT: OrgFormContext = {
  id: DEFAULT_ORG_ID,
  name: 'Community Organizer',
  defaults: DEFAULT_DEFAULTS,
  visibility: DEFAULT_VISIBILITY,
}

function contextGames(org: OrgFormContext): GameType[] {
  if (!org.visibility.games) return []
  return IMPLEMENTED_GAMES.filter((game) => org.defaults.games.includes(game))
}

/** Form fields for one game's contribution rules, using that game's defaults. */
export function gameSettingsFields(game: GameType, settings: GameContributionSettings = defaultGameSettings(game)) {
  return {
    gameRate: paiseToInput(settings.ratePaise),
    gameRoundSize: String(settings.actionsPerRound),
    gameAllowCustom: settings.allowCustom,
    gameCap: settings.capPaise == null ? '' : paiseToInput(settings.capPaise),
  }
}

export function formGameSettings(form: CampaignForm): GameContributionSettings {
  const game = isGameType(form.gameType) ? form.gameType : 'garden'
  const fallback = defaultGameSettings(game)
  const { min, max } = gameConfig(game).roundSize
  const rounds = Number(form.gameRoundSize)
  const ratePaise = parseRupeesToPaise(form.gameRate) ?? fallback.ratePaise
  const capPaise = form.gameCap.trim() ? parseRupeesToPaise(form.gameCap) : null
  return {
    ratePaise,
    actionsPerRound: Number.isInteger(rounds) ? Math.min(max, Math.max(min, rounds)) : fallback.actionsPerRound,
    allowCustom: form.gameAllowCustom,
    capPaise: capPaise != null && capPaise >= ratePaise ? capPaise : null,
  }
}

export const WIZARD_KEY = 'together.wizard.v1'

export function blankForm(org: OrgFormContext = FALLBACK_CONTEXT): CampaignForm {
  const opened = new Date(Date.now() - 60 * 60 * 1000)
  const closes = new Date()
  closes.setDate(closes.getDate() + org.defaults.durationDays)
  closes.setHours(18, 0, 0, 0)
  const games = contextGames(org)
  const gameType = games[0] ?? 'garden'
  const game = games.length > 0
  return {
    organizationId: org.id,
    currency: org.defaults.currency,
    title: '',
    description: '',
    coverImageId: 'library',
    coverImageData: '',
    logoData: '',
    puzzleImageData: '',
    organizerName: org.name,
    access: org.defaults.visibility,
    accessCode: makeAccessCode(),
    goalAmount: String(org.defaults.suggestedAmounts[0] ? org.defaults.suggestedAmounts[0] * 100 : 10000),
    donationMode: 'fixed',
    fixedAmounts: [...org.defaults.suggestedAmounts],
    opensAt: toDatetimeLocal(opened.toISOString()),
    closesAt: toDatetimeLocal(closes.toISOString()),
    autoCloseOnGoal: true,
    direct: org.visibility.direct || !game,
    game,
    gameType,
    ...gameSettingsFields(gameType),
  }
}

export function campaignToForm(campaign: Campaign): CampaignForm {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    currency: campaign.currency,
    title: campaign.title,
    description: campaign.description,
    coverImageId: campaign.coverImageId,
    coverImageData: campaign.coverImageData ?? '',
    logoData: campaign.logoData ?? '',
    puzzleImageData: campaign.puzzleImageData ?? '',
    organizerName: campaign.organizerName,
    access: campaign.access,
    accessCode: campaign.accessCode ?? makeAccessCode(),
    goalAmount: String(campaign.goalAmount || ''),
    donationMode: campaign.donationMode,
    fixedAmounts: campaign.fixedAmounts.length > 0 ? campaign.fixedAmounts : [100, 250, 500],
    opensAt: toDatetimeLocal(campaign.opensAt),
    closesAt: toDatetimeLocal(campaign.closesAt),
    autoCloseOnGoal: campaign.autoCloseOnGoal,
    direct: campaign.participation.direct,
    game: campaign.participation.game,
    gameType: isGameType(campaign.gameType) ? campaign.gameType : 'garden',
    ...gameSettingsFields(campaign.gameType, campaignGameSettings(campaign)),
  }
}

export function formToCampaign(form: CampaignForm, options: { isDraft: boolean; existing?: Campaign }): Campaign {
  const goal = Number(form.goalAmount)
  const opensAt = fromDatetimeLocal(form.opensAt)
  const closesAt = fromDatetimeLocal(form.closesAt)
  return {
    id: form.id ?? options.existing?.id ?? crypto.randomUUID(),
    organizationId: options.existing?.organizationId ?? (form.organizationId || DEFAULT_ORG_ID),
    currency: options.existing?.currency ?? form.currency,
    title: form.title.trim(),
    description: form.description.trim(),
    coverImageId: form.coverImageId || 'library',
    coverImageData: form.coverImageId === 'upload' && form.coverImageData ? form.coverImageData : undefined,
    logoData: form.logoData || undefined,
    puzzleImageData: form.puzzleImageData || undefined,
    organizerName: form.organizerName.trim() || 'Community Organizer',
    access: form.access,
    accessCode: form.access === 'closed' ? form.accessCode.trim().toUpperCase() : undefined,
    goalAmount: Number.isFinite(goal) ? Math.round(goal) : 0,
    donationMode: form.donationMode,
    fixedAmounts: form.donationMode === 'fixed' ? [...form.fixedAmounts].sort((a, b) => a - b) : [],
    opensAt: opensAt || new Date().toISOString(),
    closesAt: closesAt || new Date(Date.now() + 30 * 86_400_000).toISOString(),
    autoCloseOnGoal: form.autoCloseOnGoal,
    participation: { direct: form.direct, game: form.game },
    gameType: isGameType(form.gameType) ? form.gameType : 'garden',
    gameSettings: form.game ? formGameSettings(form) : options.existing?.gameSettings,
    createdAt: options.existing?.createdAt ?? new Date().toISOString(),
    manualClosedAt: options.isDraft ? undefined : options.existing?.manualClosedAt,
    isDraft: options.isDraft,
  }
}

export interface WizardSnapshot {
  form: CampaignForm
  step: number
}

/** Restores the in-progress form, but only for the organization it was started in. */
export function readWizard(organizationId: string): WizardSnapshot | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const snapshot = parsed as WizardSnapshot
    if (!snapshot.form || typeof snapshot.form !== 'object') return null
    if (snapshot.step !== 1 && snapshot.step !== 2 && snapshot.step !== 3) return null
    if (snapshot.form.organizationId !== organizationId) return null
    if (!isCurrencyCode(snapshot.form.currency)) snapshot.form.currency = 'INR'
    if (!isGameType(snapshot.form.gameType)) snapshot.form.gameType = 'garden'
    if (typeof snapshot.form.coverImageData !== 'string') snapshot.form.coverImageData = ''
    if (typeof snapshot.form.logoData !== 'string') snapshot.form.logoData = ''
    if (typeof snapshot.form.puzzleImageData !== 'string') snapshot.form.puzzleImageData = ''
    if (typeof snapshot.form.gameRate !== 'string' || typeof snapshot.form.gameRoundSize !== 'string') {
      Object.assign(snapshot.form, gameSettingsFields(snapshot.form.gameType))
    }
    if (typeof snapshot.form.gameAllowCustom !== 'boolean') snapshot.form.gameAllowCustom = true
    if (typeof snapshot.form.gameCap !== 'string') snapshot.form.gameCap = ''
    return snapshot
  } catch {
    return null
  }
}

export function writeWizard(snapshot: WizardSnapshot): void {
  try {
    sessionStorage.setItem(WIZARD_KEY, JSON.stringify(snapshot))
  } catch {
    sessionStorage.setItem(
      WIZARD_KEY,
      JSON.stringify({
        ...snapshot,
        form: { ...snapshot.form, coverImageData: '', logoData: '', puzzleImageData: '' },
      }),
    )
  }
}

export function clearWizard(): void {
  sessionStorage.removeItem(WIZARD_KEY)
}

export type FormErrors = Partial<Record<keyof CampaignForm | 'form', string>>

export function validateStory(form: CampaignForm): FormErrors {
  const errors: FormErrors = {}
  const title = form.title.trim()
  if (title.length < 3) errors.title = 'Give the campaign a title of at least 3 characters.'
  else if (title.length > 80) errors.title = 'Keep the title to 80 characters or fewer.'
  const description = form.description.trim()
  if (description.length < 20) errors.description = 'Tell a little more of the story (at least 20 characters).'
  else if (description.length > 1000) errors.description = 'Keep the story to 1,000 characters or fewer.'
  if (!form.coverImageId) errors.coverImageId = 'Choose a cover image.'
  else if (form.coverImageId === 'upload' && !form.coverImageData) errors.coverImageId = 'Upload a cover image, or pick a template.'
  if (form.organizerName.trim().length < 2) errors.organizerName = 'Add an organiser name.'
  const goal = Number(form.goalAmount)
  if (!/^\d+$/.test(form.goalAmount.trim()) || !Number.isFinite(goal) || goal <= 0) {
    errors.goalAmount = 'Enter a fundraising goal greater than zero.'
  } else if (goal > 100_000_000) {
    errors.goalAmount = 'Choose a smaller demonstration goal.'
  }
  if (form.donationMode === 'fixed') {
    if (form.fixedAmounts.length === 0) errors.fixedAmounts = 'Add at least one suggested amount.'
    else if (form.fixedAmounts.some((amount) => !Number.isInteger(amount) || amount <= 0)) {
      errors.fixedAmounts = 'Suggested amounts must be whole numbers greater than zero.'
    }
  }
  if (form.access === 'closed' && form.accessCode.trim().length < 4) {
    errors.accessCode = 'Private campaigns need a demo access code of at least 4 characters.'
  }
  return errors
}

/**
 * `allowedGames` is the organization's selectable list; pass it for new campaigns so a game the
 * organization turned off cannot be chosen.
 */
export function validateSettings(form: CampaignForm, allowedGames?: GameType[]): FormErrors {
  const errors: FormErrors = {}
  if (!form.opensAt) errors.opensAt = 'Choose an opening date and time.'
  if (!form.closesAt) errors.closesAt = 'Choose a closing date and time.'
  if (form.opensAt && form.closesAt) {
    const open = new Date(form.opensAt).getTime()
    const close = new Date(form.closesAt).getTime()
    if (Number.isNaN(open) || Number.isNaN(close)) errors.closesAt = 'Use a valid date and time.'
    else if (close <= open) errors.closesAt = 'Closing time needs to be after opening time.'
  }
  if (!form.direct && !form.game) {
    errors.form = 'Choose direct giving, a game, or both.'
  }
  if (form.game && allowedGames && !allowedGames.includes(form.gameType)) {
    errors.gameType = allowedGames.length > 0
      ? 'This game is not available for this organization. Choose one of the available games.'
      : 'Games are turned off for this organization. Choose direct giving.'
  }
  if (form.game) {
    const rate = parseRupeesToPaise(form.gameRate)
    const { min, max } = gameConfig(form.gameType).roundSize
    const rounds = Number(form.gameRoundSize)
    if (rate == null || rate > MAX_CONTRIBUTION_PAISE) errors.gameRate = 'Enter a rate greater than zero, like 50.'
    if (!Number.isInteger(rounds) || rounds < min || rounds > max) {
      errors.gameRoundSize = min === max ? `This game uses ${min} per round.` : `Choose between ${min} and ${max}.`
    }
    if (form.gameCap.trim()) {
      const cap = parseRupeesToPaise(form.gameCap)
      if (cap == null) errors.gameCap = 'Enter a cap like 500, or leave it empty.'
      else if (rate != null && cap < rate) errors.gameCap = 'The cap needs to be at least one action’s rate.'
    }
    if (form.gameType === 'puzzle' && !form.puzzleImageData.startsWith('data:image/')) {
      errors.puzzleImageData = 'Upload an image for the Community Puzzle. Supporters piece that picture together.'
    }
  }
  return errors
}

export function validateAll(form: CampaignForm, allowedGames?: GameType[]): FormErrors {
  return { ...validateStory(form), ...validateSettings(form, allowedGames) }
}
