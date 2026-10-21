import type { CurrencyCode } from './types.ts'

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string; symbol: string }[] = [
  { code: 'INR', label: 'Indian rupee (₹)', locale: 'en-IN', symbol: '₹' },
  { code: 'USD', label: 'US dollar ($)', locale: 'en-US', symbol: '$' },
  { code: 'GBP', label: 'British pound (£)', locale: 'en-GB', symbol: '£' },
  { code: 'EUR', label: 'Euro (€)', locale: 'en-IE', symbol: '€' },
]

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((item) => item.code === value)
}

function currencyInfo(code: CurrencyCode) {
  return CURRENCIES.find((item) => item.code === code) ?? CURRENCIES[0]
}

/**
 * Currency used when a caller does not pass one. Campaign routes set this to the open campaign's
 * own currency so game screens keep that campaign's label; lists always pass a currency explicitly.
 */
let displayCurrency: CurrencyCode = 'INR'

export function setDisplayCurrency(code: CurrencyCode | undefined): void {
  displayCurrency = isCurrencyCode(code) ? code : 'INR'
}

export function currencySymbol(code: CurrencyCode = displayCurrency): string {
  return currencyInfo(code).symbol
}

export function formatMoney(value: number, code: CurrencyCode = displayCurrency, fractionDigits = 0): string {
  const amount = Number.isFinite(value) ? value : 0
  const info = currencyInfo(code)
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: info.code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

/** Whole-unit amount in the given currency (defaults to the open campaign's currency). */
export function formatINR(value: number, code?: CurrencyCode): string {
  return formatMoney(value, code)
}

/** App default when an organization has not chosen a timezone. */
export const APP_TIME_ZONE = 'Asia/Kolkata'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const TIME_ZONES: { id: string; label: string }[] = [
  { id: '', label: 'App default — Asia/Kolkata' },
  { id: 'Asia/Kolkata', label: 'India — Asia/Kolkata' },
  { id: 'Asia/Dubai', label: 'Gulf — Asia/Dubai' },
  { id: 'Europe/London', label: 'United Kingdom — Europe/London' },
  { id: 'America/New_York', label: 'US Eastern — America/New_York' },
  { id: 'UTC', label: 'UTC' },
]

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    Intl.DateTimeFormat('en-GB', { timeZone: value }).format(0)
    return true
  } catch {
    return false
  }
}

/** Timezone for date-times when a caller does not pass one. Organization pages set this from the open organization. */
let displayTimeZone = APP_TIME_ZONE

export function setDisplayTimeZone(zone: string | undefined): void {
  displayTimeZone = isTimeZone(zone) ? zone : APP_TIME_ZONE
}

export function currentDisplayTimeZone(): string {
  return displayTimeZone
}

function formatInZone(iso: string, options: Intl.DateTimeFormatOptions, zone: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: zone }).format(date)
}

/**
 * Calendar date. A `YYYY-MM-DD` value keeps that calendar day and is not shifted into a timezone.
 * A full timestamp is shown as the calendar day in the display timezone.
 */
export function formatDate(iso: string): string {
  const trimmed = iso.trim()
  if (DATE_ONLY.test(trimmed)) {
    return formatInZone(`${trimmed}T00:00:00.000Z`, { day: 'numeric', month: 'short', year: 'numeric' }, 'UTC') ?? 'Date unavailable'
  }
  return formatInZone(trimmed, { day: 'numeric', month: 'short', year: 'numeric' }, displayTimeZone) ?? 'Date unavailable'
}

/** Date and time, always labelled with the display timezone. */
export function formatDateTime(iso: string): string {
  const formatted = formatInZone(
    iso,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
    displayTimeZone,
  )
  if (!formatted) return 'Date unavailable'
  return `${formatted} ${displayTimeZone}`
}

export function formatDateRange(opensAt: string, closesAt: string): string {
  return `${formatDate(opensAt)} – ${formatDate(closesAt)}`
}

export function daysLeft(closesAt: string, now = Date.now()): number {
  const close = Date.parse(closesAt)
  if (Number.isNaN(close)) return 0
  return Math.max(0, Math.ceil((close - now) / 86_400_000))
}

export function progressPercent(raised: number, goal: number): number {
  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}

/** The first sentence of a longer text, kept short enough to read at a glance. */
export function shortPurpose(text: string): string {
  const trimmed = text.trim()
  const sentence = trimmed.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? trimmed
  return sentence.length > 180 ? `${sentence.slice(0, 177).trimEnd()}…` : sentence
}

export function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDatetimeLocal(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

export function parseWholeRupees(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const amount = Number(trimmed)
  if (!Number.isSafeInteger(amount) || amount <= 0) return null
  return amount
}

export function shiftLocal(dayOffset: number, hours: number, minutes = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}


export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
