import type { ButtonStyle, FontChoice, OrgBranding } from './types.ts'

export const FONT_CHOICES: { id: FontChoice; label: string; stack: string }[] = [
  { id: 'figtree', label: 'Figtree — clean sans', stack: '"Figtree", "Segoe UI", system-ui, sans-serif' },
  { id: 'nunito', label: 'Nunito — friendly rounded', stack: '"Nunito", "Segoe UI", system-ui, sans-serif' },
  { id: 'fraunces', label: 'Fraunces — warm serif', stack: '"Fraunces", Georgia, serif' },
  { id: 'georgia', label: 'Georgia — classic serif', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'system', label: 'System — device default', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
]

export const BUTTON_STYLES: { id: ButtonStyle; label: string }[] = [
  { id: 'rounded', label: 'Rounded' },
  { id: 'soft', label: 'Softly squared' },
]

export function fontStack(id: FontChoice): string {
  return (FONT_CHOICES.find((font) => font.id === id) ?? FONT_CHOICES[0]).stack
}

export function isFontChoice(value: unknown): value is FontChoice {
  return FONT_CHOICES.some((font) => font.id === value)
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim())
}

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  let value = hex.trim().slice(1)
  if (value.length === 3) value = value.split('').map((char) => char + char).join('')
  const number = Number.parseInt(value, 16)
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0')).join('')}`
}

/** Normalises #abc to #aabbcc and lower-cases the value. */
export function normalizeHex(hex: string): string {
  return toHex(toRgb(hex))
}

export function mix(a: string, b: string, weightOfB: number): string {
  const left = toRgb(a)
  const right = toRgb(b)
  return toHex([0, 1, 2].map((index) => left[index] + (right[index] - left[index]) * weightOfB) as Rgb)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  const [light, dark] = first > second ? [first, second] : [second, first]
  return (light + 0.05) / (dark + 0.05)
}

const LIGHT_TEXT = '#ffffff'
const DARK_TEXT = '#14211d'

/** White or near-black, whichever reads better on the given colour. */
export function readableOn(background: string): string {
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT
}

/** Darkens (or lightens, on dark backgrounds) a colour until it reaches the target contrast. */
function ensureContrast(color: string, background: string, target: number): string {
  const towards = relativeLuminance(background) > 0.4 ? '#000000' : '#ffffff'
  let candidate = color
  for (let step = 0; step < 20 && contrastRatio(candidate, background) < target; step += 1) {
    candidate = mix(candidate, towards, 0.12)
  }
  return candidate
}

export const DEFAULT_BRANDING: OrgBranding = {
  primary: '#123d36',
  secondary: '#dce8df',
  accent: '#c99a2e',
  background: '#faf8f2',
  headingFont: 'figtree',
  bodyFont: 'figtree',
  buttonStyle: 'soft',
}

export interface ContrastCheck {
  id: string
  label: string
  ratio: number
  ok: boolean
  message: string
}

/** Contrast checks shown in settings. The site still auto-picks readable text; these explain what changed. */
export function contrastChecks(branding: OrgBranding): ContrastCheck[] {
  const safe = safeBranding(branding)
  const checks: ContrastCheck[] = []
  const onPrimary = readableOn(safe.primary)
  const primaryText = contrastRatio(safe.primary, onPrimary)
  checks.push({
    id: 'primary-button',
    label: 'Button text on primary colour',
    ratio: primaryText,
    ok: primaryText >= 4.5,
    message:
      primaryText >= 4.5
        ? `Buttons use ${onPrimary === LIGHT_TEXT ? 'white' : 'dark'} text automatically.`
        : 'Button labels will be hard to read. Choose a darker or lighter primary colour.',
  })
  const primaryOnBg = contrastRatio(safe.primary, safe.background)
  checks.push({
    id: 'primary-bg',
    label: 'Primary colour on page background',
    ratio: primaryOnBg,
    ok: primaryOnBg >= 3,
    message:
      primaryOnBg >= 3
        ? 'Links, outlines and headings stand out from the page.'
        : 'Links and outlines will blend into the page. We darken link text automatically, but buttons may look faint.',
  })
  const bgLum = relativeLuminance(safe.background)
  checks.push({
    id: 'background',
    label: 'Page background',
    ratio: contrastRatio(safe.background, readableOn(safe.background)),
    ok: bgLum >= 0.55,
    message:
      bgLum >= 0.55
        ? 'Body text uses a dark ink colour.'
        : 'Dark page backgrounds are not fully supported in this demo. Cards stay light, so choose a lighter background.',
  })
  const accentText = contrastRatio(safe.accent, readableOn(safe.accent))
  checks.push({
    id: 'accent',
    label: 'Text on accent colour',
    ratio: accentText,
    ok: accentText >= 4.5,
    message: accentText >= 4.5 ? 'Badges on the accent colour stay readable.' : 'Accent badges will be hard to read.',
  })
  return checks
}

function safeBranding(branding: OrgBranding): OrgBranding {
  return {
    ...DEFAULT_BRANDING,
    ...branding,
    primary: isHexColor(branding.primary) ? normalizeHex(branding.primary) : DEFAULT_BRANDING.primary,
    secondary: isHexColor(branding.secondary) ? normalizeHex(branding.secondary) : DEFAULT_BRANDING.secondary,
    accent: isHexColor(branding.accent) ? normalizeHex(branding.accent) : DEFAULT_BRANDING.accent,
    background: isHexColor(branding.background) ? normalizeHex(branding.background) : DEFAULT_BRANDING.background,
    headingFont: isFontChoice(branding.headingFont) ? branding.headingFont : DEFAULT_BRANDING.headingFont,
    bodyFont: isFontChoice(branding.bodyFont) ? branding.bodyFont : DEFAULT_BRANDING.bodyFont,
    buttonStyle: branding.buttonStyle === 'soft' ? 'soft' : 'rounded',
  }
}

/** CSS custom properties for one organization. Invalid values fall back to the Together theme. */
export function themeVars(branding: OrgBranding): Record<string, string> {
  const safe = safeBranding(branding)
  const lightPage = relativeLuminance(safe.background) >= 0.55
  const background = lightPage ? safe.background : mix(safe.background, '#ffffff', 0.9)
  const ink = ensureContrast(mix(safe.primary, '#101814', 0.55), background, 10)
  const inkSoft = ensureContrast(mix(ink, background, 0.22), background, 7)
  const muted = ensureContrast(mix(ink, background, 0.4), background, 4.6)
  const link = ensureContrast(safe.primary, background, 4.6)
  return {
    '--org-primary': safe.primary,
    '--org-on-primary': readableOn(safe.primary),
    '--org-primary-strong': mix(safe.primary, readableOn(safe.primary) === LIGHT_TEXT ? '#000000' : '#ffffff', 0.18),
    '--org-primary-soft': mix(safe.primary, '#ffffff', 0.9),
    '--org-primary-tint': mix(safe.primary, '#ffffff', 0.78),
    '--org-secondary': safe.secondary,
    '--org-on-secondary': readableOn(safe.secondary),
    '--org-secondary-soft': mix(safe.secondary, '#ffffff', 0.55),
    '--org-accent': safe.accent,
    '--org-on-accent': readableOn(safe.accent),
    '--org-accent-soft': mix(safe.accent, '#ffffff', 0.82),
    '--org-accent-ink': ensureContrast(safe.accent, '#ffffff', 4.6),
    '--org-bg': background,
    '--org-bg-deep': mix(background, ink, 0.05),
    '--org-surface': mix(background, '#ffffff', 0.7),
    '--org-surface-strong': '#ffffff',
    '--org-ink': ink,
    '--org-ink-soft': inkSoft,
    '--org-muted': muted,
    '--org-line': mix(background, ink, 0.12),
    '--org-link': link,
    '--org-focus': link,
    '--org-heading-font': fontStack(safe.headingFont),
    '--org-body-font': fontStack(safe.bodyFont),
    '--org-btn-radius': safe.buttonStyle === 'soft' ? '10px' : '999px',
    '--org-radius': safe.buttonStyle === 'soft' ? '12px' : '18px',
  }
}
