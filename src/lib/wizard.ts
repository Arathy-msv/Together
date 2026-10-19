import { makeAccessCode } from './campaigns.ts'
import { fromDatetimeLocal, toDatetimeLocal } from './format.ts'
import { isGameType } from './games.ts'
import type { Campaign, CampaignForm } from './types.ts'

export const WIZARD_KEY = 'together.wizard.v1'

export function blankForm(): CampaignForm {
  const opened = new Date(Date.now() - 60 * 60 * 1000)
  const closes = new Date()
  closes.setDate(closes.getDate() + 30)
  closes.setHours(18, 0, 0, 0)
  return {
    title: '',
    description: '',
    coverImageId: 'library',
    coverImageData: '',
    logoData: '',
    organizerName: 'Community Organizer',
    access: 'open',
    accessCode: makeAccessCode(),
    goalAmount: '10000',
    donationMode: 'fixed',
    fixedAmounts: [100, 250, 500],
    opensAt: toDatetimeLocal(opened.toISOString()),
    closesAt: toDatetimeLocal(closes.toISOString()),
    autoCloseOnGoal: true,
    direct: true,
    game: true,
    gameType: 'garden',
  }
}

export function campaignToForm(campaign: Campaign): CampaignForm {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    coverImageId: campaign.coverImageId,
    coverImageData: campaign.coverImageData ?? '',
    logoData: campaign.logoData ?? '',
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
  }
}

export function formToCampaign(form: CampaignForm, options: { isDraft: boolean; existing?: Campaign }): Campaign {
  const goal = Number(form.goalAmount)
  const opensAt = fromDatetimeLocal(form.opensAt)
  const closesAt = fromDatetimeLocal(form.closesAt)
  return {
    id: form.id ?? options.existing?.id ?? crypto.randomUUID(),
    title: form.title.trim(),
    description: form.description.trim(),
    coverImageId: form.coverImageId || 'library',
    coverImageData: form.coverImageId === 'upload' && form.coverImageData ? form.coverImageData : undefined,
    logoData: form.logoData || undefined,
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
    createdAt: options.existing?.createdAt ?? new Date().toISOString(),
    manualClosedAt: options.isDraft ? undefined : options.existing?.manualClosedAt,
    isDraft: options.isDraft,
  }
}

export interface WizardSnapshot {
  form: CampaignForm
  step: number
}

export function readWizard(): WizardSnapshot | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const snapshot = parsed as WizardSnapshot
    if (!snapshot.form || typeof snapshot.form !== 'object') return null
    if (snapshot.step !== 1 && snapshot.step !== 2 && snapshot.step !== 3) return null
    if (!isGameType(snapshot.form.gameType)) snapshot.form.gameType = 'garden'
    if (typeof snapshot.form.coverImageData !== 'string') snapshot.form.coverImageData = ''
    if (typeof snapshot.form.logoData !== 'string') snapshot.form.logoData = ''
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
      JSON.stringify({ ...snapshot, form: { ...snapshot.form, coverImageData: '', logoData: '' } }),
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
      errors.fixedAmounts = 'Suggested amounts must be whole rupees greater than zero.'
    }
  }
  if (form.access === 'closed' && form.accessCode.trim().length < 4) {
    errors.accessCode = 'Private campaigns need a demo access code of at least 4 characters.'
  }
  return errors
}

export function validateSettings(form: CampaignForm): FormErrors {
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
  return errors
}

export function validateAll(form: CampaignForm): FormErrors {
  return { ...validateStory(form), ...validateSettings(form) }
}
