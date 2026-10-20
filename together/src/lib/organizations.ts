import { emptyVoucherSettings, inferFeatures, normalizeFeatures, normalizeVoucherSettings, planEntitles, recommendedFeatures } from './features.ts'
import { voucherUsage } from './voucherUsage.ts'
import { isCurrencyCode } from './format.ts'
import { GAMES, isGameType } from './games.ts'
import { DEFAULT_BRANDING, isFontChoice, isHexColor, normalizeHex } from './theme.ts'
import type {
  Campaign,
  GameType,
  OrgBranding,
  OrgContent,
  OrgDefaults,
  OrgFeatures,
  OrgLink,
  OrgType,
  OrgVisibility,
  Organization,
  OrganizationWebsite,
  PlanId,
  WebsiteConfig,
} from './types.ts'

export const DEFAULT_ORG_ID = 'org_together'
export const DEFAULT_ORG_SLUG = 'together'

export const ORG_TYPES: { id: OrgType; label: string }[] = [
  { id: 'company', label: 'Company' },
  { id: 'school', label: 'School' },
  { id: 'club', label: 'Club' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'other', label: 'Other' },
  { id: 'platform', label: 'Community platform' },
]

export const IMPLEMENTED_GAMES: GameType[] = GAMES.map((game) => game.id)

/** Games from the original brief that are not built yet. Shown in settings, never selectable. */
export const COMING_SOON_GAMES: { id: string; name: string }[] = [
  { id: 'pencil', name: 'Pencil writing' },
  { id: 'paper', name: 'Paper opening' },
]

/** Predefined images organizations can use instead of uploading their own. */
export const IMAGE_GALLERY: { src: string; label: string }[] = [
  { src: '/covers/hero-library.jpg', label: 'Bright library' },
  { src: '/covers/cover-reading.jpg', label: 'Reading room' },
  { src: '/covers/cover-garden.jpg', label: 'Community garden' },
  { src: '/covers/cover-winter.jpg', label: 'Winter care' },
  { src: '/covers/cover-sports.jpg', label: 'Sports field' },
  { src: '/covers/cover-jacket.jpg', label: 'Warm jacket' },
]

export const DEFAULT_VISIBILITY: OrgVisibility = {
  games: true,
  direct: true,
  impactStories: true,
  assistant: true,
  poweredBy: true,
}

export function defaultContent(name: string): OrgContent {
  return {
    headline: `Fundraising with ${name}`,
    description: 'Give directly or play a short game to support causes close to our community.',
    heroImage: '/covers/hero-library.jpg',
    ctaLabel: 'Explore campaigns',
    contactEmail: '',
    location: '',
    footerText: 'Browser-only demo. No real money is collected.',
    website: '',
    socialLinks: [],
    supporterNoun: 'supporters',
    impactTitle: '',
    impactStory: '',
  }
}

export const DEFAULT_DEFAULTS: OrgDefaults = {
  currency: 'INR',
  suggestedAmounts: [100, 250, 500],
  visibility: 'open',
  durationDays: 30,
  games: [...IMPLEMENTED_GAMES],
}

/* ---------- Normalisation ---------- */

function text(value: unknown, fallback: string, max = 2000): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isImageSource(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('data:image/') || /^\/[\w\-./]+$/.test(value))
}

function color(value: unknown, fallback: string): string {
  return isHexColor(value) ? normalizeHex(value) : fallback
}

function normalizeBranding(value: unknown): OrgBranding {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<OrgBranding>
  return {
    primary: color(raw.primary, DEFAULT_BRANDING.primary),
    secondary: color(raw.secondary, DEFAULT_BRANDING.secondary),
    accent: color(raw.accent, DEFAULT_BRANDING.accent),
    background: color(raw.background, DEFAULT_BRANDING.background),
    headingFont: isFontChoice(raw.headingFont) ? raw.headingFont : DEFAULT_BRANDING.headingFont,
    bodyFont: isFontChoice(raw.bodyFont) ? raw.bodyFont : DEFAULT_BRANDING.bodyFont,
    buttonStyle: raw.buttonStyle === 'soft' ? 'soft' : 'rounded',
  }
}

function normalizeLinks(value: unknown): OrgLink[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((link): link is OrgLink => !!link && typeof link === 'object' && typeof link.label === 'string' && typeof link.url === 'string')
    .slice(0, 4)
    .map((link) => ({ label: link.label.slice(0, 40), url: link.url.slice(0, 300) }))
}

function normalizeContent(value: unknown, name: string): OrgContent {
  const fallback = defaultContent(name)
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<OrgContent>
  return {
    headline: text(raw.headline, fallback.headline, 120),
    description: text(raw.description, fallback.description, 400),
    heroImage: isImageSource(raw.heroImage) ? raw.heroImage : fallback.heroImage,
    ctaLabel: text(raw.ctaLabel, fallback.ctaLabel, 40),
    contactEmail: text(raw.contactEmail, '', 120),
    location: text(raw.location, '', 120),
    footerText: text(raw.footerText, fallback.footerText, 240),
    website: text(raw.website, '', 300),
    socialLinks: normalizeLinks(raw.socialLinks),
    supporterNoun: text(raw.supporterNoun, fallback.supporterNoun, 30),
    impactTitle: text(raw.impactTitle, '', 100),
    impactStory: text(raw.impactStory, '', 600),
  }
}

function normalizeDefaults(value: unknown): OrgDefaults {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<OrgDefaults>
  const amounts = Array.isArray(raw.suggestedAmounts)
    ? raw.suggestedAmounts.filter((amount) => Number.isSafeInteger(amount) && amount > 0).slice(0, 5)
    : []
  const games = Array.isArray(raw.games) ? raw.games.filter(isGameType) : null
  const days = Number(raw.durationDays)
  return {
    currency: isCurrencyCode(raw.currency) ? raw.currency : DEFAULT_DEFAULTS.currency,
    suggestedAmounts: amounts.length > 0 ? [...new Set(amounts)].sort((a, b) => a - b) : [...DEFAULT_DEFAULTS.suggestedAmounts],
    visibility: raw.visibility === 'closed' ? 'closed' : 'open',
    durationDays: Number.isInteger(days) && days >= 1 && days <= 365 ? days : DEFAULT_DEFAULTS.durationDays,
    games: games ? [...new Set(games)] : [...DEFAULT_DEFAULTS.games],
  }
}

function normalizeVisibility(value: unknown): OrgVisibility {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<OrgVisibility>
  return {
    games: bool(raw.games, DEFAULT_VISIBILITY.games),
    direct: bool(raw.direct, DEFAULT_VISIBILITY.direct),
    impactStories: bool(raw.impactStories, DEFAULT_VISIBILITY.impactStories),
    assistant: bool(raw.assistant, DEFAULT_VISIBILITY.assistant),
    poweredBy: bool(raw.poweredBy, DEFAULT_VISIBILITY.poweredBy),
  }
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/**
 * Repairs one stored organization record. Returns null only when the record has no usable
 * identity, so a single broken field never discards the whole organization.
 */
export function normalizeOrganization(value: unknown): Organization | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Organization>
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : 'Untitled organization'
  const slug = typeof raw.slug === 'string' && SLUG_PATTERN.test(raw.slug) ? raw.slug : slugify(name) || raw.id.toLowerCase()
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString()
  return {
    id: raw.id,
    slug,
    name,
    type: ORG_TYPES.some((type) => type.id === raw.type) ? (raw.type as OrgType) : 'nonprofit',
    logo: isImageSource(raw.logo) ? raw.logo : '',
    favicon: isImageSource(raw.favicon) ? raw.favicon : '',
    tagline: text(raw.tagline, '', 120),
    about: text(raw.about, '', 600),
    branding: normalizeBranding(raw.branding),
    content: normalizeContent(raw.content, name),
    defaults: normalizeDefaults(raw.defaults),
    visibility: normalizeVisibility(raw.visibility),
    plan: normalizePlan(raw.plan, updatedAt),
    ...normalizeOrgFeatureConfig(raw, {
      ...raw,
      id: raw.id,
      type: ORG_TYPES.some((type) => type.id === raw.type) ? (raw.type as OrgType) : 'nonprofit',
      plan: normalizePlan(raw.plan, updatedAt),
      website: normalizeWebsite(raw.website, name, updatedAt),
    } as Organization),
    featureHistory: normalizeFeatureHistory(raw.featureHistory),
    website: normalizeWebsite(raw.website, name, updatedAt),
    onboarding:
      raw.onboarding && typeof raw.onboarding === 'object' && Number.isInteger(raw.onboarding.step)
        ? {
            step: Math.min(6, Math.max(1, raw.onboarding.step)),
            updatedAt: typeof raw.onboarding.updatedAt === 'string' ? raw.onboarding.updatedAt : updatedAt,
            flow: typeof raw.onboarding.flow === 'number' ? raw.onboarding.flow : undefined,
          }
        : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : updatedAt,
    updatedAt,
  }
}

const FEATURE_HISTORY_LIMIT = 100

function normalizeFeatureHistory(value: unknown): Organization['featureHistory'] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object' && typeof item.key === 'string' && typeof item.enabled === 'boolean' && typeof item.at === 'string')
    .slice(-FEATURE_HISTORY_LIMIT)
}

/**
 * Feature activation plus voucher capability selection. Vouchers default off; an organization that
 * already has voucher records keeps the capabilities it used, so outstanding access never disappears.
 */
function normalizeOrgFeatureConfig(raw: Partial<Organization>, partial: Organization): Pick<Organization, 'features' | 'voucherSettings'> {
  const features = normalizeOrgFeatures(raw.features, partial)
  const voucherSettings = raw.voucherSettings ? normalizeVoucherSettings(raw.voucherSettings) : emptyVoucherSettings()
  const knewVouchers = Boolean(raw.features && typeof (raw.features as Partial<OrgFeatures>).partnerVouchers === 'boolean')
  if (!knewVouchers) {
    const used = voucherUsage(partial.id)
    if (used.length > 0) {
      features.partnerVouchers = planEntitles(partial.plan.id, 'partnerVouchers')
      for (const capability of used) voucherSettings[capability] = true
    }
  }
  return { features, voucherSettings }
}

function normalizeOrgFeatures(value: unknown, partial: Organization): OrgFeatures {
  if (value && typeof value === 'object') {
    return normalizeFeatures(value, recommendedFeatures(partial.type, partial.plan.id))
  }
  // Organizations saved before the feature layer: infer from plan and existing records.
  return inferFeatures(partial)
}

export const PLAN_IDS: PlanId[] = ['starter', 'community', 'organization']

function normalizePlan(value: unknown, fallbackDate: string): Organization['plan'] {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Organization['plan']>
  return { id: PLAN_IDS.includes(raw.id as PlanId) ? (raw.id as PlanId) : 'community', selectedAt: typeof raw.selectedAt === 'string' ? raw.selectedAt : fallbackDate }
}

/** Repairs a website draft. Invalid parts fall back to defaults instead of discarding the draft. */
export function normalizeWebsiteConfig(value: unknown, fallbackName: string): WebsiteConfig | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Partial<WebsiteConfig>
  const name = typeof raw.name === 'string' ? raw.name.slice(0, 80) : fallbackName
  const visibility = normalizeVisibility(raw.visibility)
  return {
    name,
    tagline: text(raw.tagline, '', 120),
    about: text(raw.about, '', 600),
    logo: isImageSource(raw.logo) ? raw.logo : '',
    favicon: isImageSource(raw.favicon) ? raw.favicon : '',
    branding: normalizeBranding(raw.branding),
    content: normalizeContent(raw.content, name || fallbackName),
    visibility: { impactStories: visibility.impactStories, poweredBy: visibility.poweredBy },
  }
}

function normalizeWebsite(value: unknown, name: string, fallbackDate: string): OrganizationWebsite {
  // Organizations saved before website publishing existed were already public.
  if (!value || typeof value !== 'object') return { status: 'published', publishedAt: fallbackDate, updatedAt: fallbackDate }
  const raw = value as Partial<OrganizationWebsite>
  const status = raw.status === 'setup' || raw.status === 'draft' ? raw.status : 'published'
  return {
    status,
    draft: normalizeWebsiteConfig(raw.draft, name),
    publishedAt: status === 'published' ? (typeof raw.publishedAt === 'string' ? raw.publishedAt : fallbackDate) : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallbackDate,
  }
}

/* ---------- Validation ---------- */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

export type OrgErrors = Partial<Record<string, string>>

/** Platform route names that can never be organization addresses. */
export const RESERVED_SLUGS = [
  'o', 'workspace', 'start', 'plans', 'features', 'examples', 'how-it-works', 'about', 'pricing', 'admin', 'api', 'app', 'login', 'signup', 'help',
  'support', 'settings', 'new', 'create', 'dashboard', 'explore', 'campaigns', 'static', 'assets', 'www',
]

/** Website address rules: format, reserved platform names, and uniqueness ignoring case. */
export function validateSlug(slug: string, orgId: string, all: Organization[]): string | undefined {
  const value = slug.trim()
  if (!value) return 'Choose a website address, like “greenwood-school”.'
  if (all.some((other) => other.id !== orgId && other.slug.toLowerCase() === value.toLowerCase())) return 'Another organization already uses this address.'
  if (value.length < 2 || value.length > 40) return 'Use between 2 and 40 characters.'
  if (!SLUG_PATTERN.test(value)) return 'Use lowercase letters, numbers and single hyphens only (no spaces).'
  if (RESERVED_SLUGS.includes(value)) return 'This address is reserved by the Together platform. Try another.'
  return undefined
}

export function validateOrganization(org: Organization, all: Organization[]): OrgErrors {
  const errors: OrgErrors = {}
  const name = org.name.trim()
  if (!name) errors.name = 'Add the organization’s name.'
  else if (name.length > 80) errors.name = 'Keep the name to 80 characters or fewer.'

  const slugError = validateSlug(org.slug, org.id, all)
  if (slugError) errors.slug = slugError

  if (org.tagline.length > 120) errors.tagline = 'Keep the tagline to 120 characters or fewer.'

  for (const key of ['primary', 'secondary', 'accent', 'background'] as const) {
    if (!isHexColor(org.branding[key])) errors[`branding.${key}`] = 'Use a hex colour like #123D36.'
  }

  if (org.content.headline.trim().length > 120) errors['content.headline'] = 'Keep the headline to 120 characters or fewer.'
  if (org.content.ctaLabel.trim().length > 40) errors['content.ctaLabel'] = 'Keep the button label short (40 characters).'
  const email = org.content.contactEmail.trim()
  if (email && !EMAIL_PATTERN.test(email)) errors['content.contactEmail'] = 'Enter an email address like hello@example.org.'
  const website = org.content.website.trim()
  if (website && !isSafeUrl(website)) errors['content.website'] = 'Enter a full link starting with https://'
  org.content.socialLinks.forEach((link, index) => {
    if (!link.label.trim()) errors[`content.socialLinks.${index}`] = 'Give this link a label.'
    else if (!isSafeUrl(link.url.trim())) errors[`content.socialLinks.${index}`] = 'Enter a full link starting with https://'
  })

  const amounts = org.defaults.suggestedAmounts
  if (amounts.length === 0) errors['defaults.suggestedAmounts'] = 'Add at least one suggested amount.'
  else if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount <= 0)) {
    errors['defaults.suggestedAmounts'] = 'Suggested amounts must be whole numbers greater than zero.'
  }
  const days = org.defaults.durationDays
  if (!Number.isInteger(days) || days < 1 || days > 365) errors['defaults.durationDays'] = 'Choose between 1 and 365 days.'
  if (org.visibility.games && org.defaults.games.length === 0) {
    errors['defaults.games'] = 'Turn on at least one game, or hide games for this organization.'
  }
  if (!org.visibility.games && !org.visibility.direct) {
    errors['visibility.direct'] = 'Keep direct contributions or games on so supporters have a way to give.'
  }
  return errors
}

/* ---------- Behaviour helpers ---------- */

/** Games a campaign creator may pick for a new campaign. */
export function selectableGames(org: Organization): GameType[] {
  if (!org.visibility.games) return []
  return IMPLEMENTED_GAMES.filter((game) => org.defaults.games.includes(game))
}

/**
 * The ways a supporter can give once organization visibility is applied. Turning a game off in the
 * available list does not affect existing campaigns; hiding games or direct giving does, but a
 * campaign is never left without any way to give.
 */
export function effectiveParticipation(campaign: Campaign, org: Organization | null): Campaign['participation'] {
  if (!org) return campaign.participation
  const next = {
    direct: campaign.participation.direct && org.visibility.direct,
    game: campaign.participation.game && org.visibility.games,
  }
  return next.direct || next.game ? next : campaign.participation
}

export function orgInitials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return 'O'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function orgTypeLabel(type: OrgType): string {
  return ORG_TYPES.find((item) => item.id === type)?.label ?? 'Organization'
}

export function orgBase(slug: string): string {
  return `/o/${slug}`
}

const ORGANIZER_SECTIONS = ['dashboard', 'create', 'assistant', 'settings'] as const

/** Organizer pages show the demo controls bar; supporter pages never do. */
export function organizerSection(pathname: string, base: string): (typeof ORGANIZER_SECTIONS)[number] | null {
  const rest = pathname.slice(base.length).replace(/^\/+/, '').split('/')[0]
  return (ORGANIZER_SECTIONS as readonly string[]).includes(rest) ? (rest as (typeof ORGANIZER_SECTIONS)[number]) : null
}
