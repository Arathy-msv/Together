import type { CampaignCategory, CurrencyCode } from '../types.ts'

/*
 * Reads only explicit, structured facts from an organizer's opening message: an amount written with
 * a currency marker (₹50,000 · Rs 50000 · $2,500 · 50k rupees · 2 lakh) and a *suggested* category
 * that the organizer confirms on the next question. Nothing else is inferred — no beneficiaries,
 * dates, costs or impact claims.
 */

export interface ParsedMessage {
  amount?: number
  currency?: CurrencyCode
  /** The exact words the amount came from, shown back to the organizer. */
  amountText?: string
  category?: CampaignCategory
  categoryReason?: string
}

const SYMBOLS: Array<[RegExp, CurrencyCode]> = [
  [/^(₹|rs\.?|inr)$/i, 'INR'],
  [/^(\$|usd)$/i, 'USD'],
  [/^(£|gbp)$/i, 'GBP'],
  [/^(€|eur)$/i, 'EUR'],
]
const WORDS: Array<[RegExp, CurrencyCode]> = [
  [/^(rupees?|inr)$/i, 'INR'],
  [/^(dollars?|usd)$/i, 'USD'],
  [/^(pounds?|gbp)$/i, 'GBP'],
  [/^(euros?|eur)$/i, 'EUR'],
]

const AMOUNT = /(₹|rs\.?|inr|\$|usd|£|gbp|€|eur)?\s?(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)\s?(k|thousand|lakhs?|lacs?)?\b\s?(rupees?|inr|dollars?|usd|pounds?|gbp|euros?|eur)?/gi

function currencyFrom(token: string | undefined, table: Array<[RegExp, CurrencyCode]>): CurrencyCode | undefined {
  if (!token) return undefined
  return table.find(([pattern]) => pattern.test(token.trim()))?.[1]
}

export function extractAmount(text: string): Pick<ParsedMessage, 'amount' | 'currency' | 'amountText'> {
  for (const match of text.matchAll(AMOUNT)) {
    const [whole, symbol, digits, scale, word] = match
    const currency = currencyFrom(symbol, SYMBOLS) ?? currencyFrom(word, WORDS)
    // Only accept numbers that are clearly money: a currency marker, or a k/lakh scale word.
    if (!currency && !scale) continue
    let amount = Number(digits.replace(/,/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) continue
    const unit = scale?.toLowerCase()
    if (unit === 'k' || unit === 'thousand') amount *= 1000
    if (unit?.startsWith('lakh') || unit?.startsWith('lac')) amount *= 100000
    amount = Math.round(amount)
    if (!Number.isSafeInteger(amount)) continue
    return { amount, currency, amountText: whole.trim() }
  }
  return {}
}

const CATEGORY_HINTS: Array<{ category: CampaignCategory; words: RegExp; label: string }> = [
  { category: 'education', words: /\b(school|supplies|books?|library|students?|classroom|learning|education|stationery|laptops?)\b/i, label: 'school and learning' },
  { category: 'clothing', words: /\b(coats?|jackets?|blankets?|clothing|clothes|winter|warm|uniforms?|hygiene)\b/i, label: 'clothing and essentials' },
  { category: 'environment', words: /\b(trees?|plant(?:ing)?|garden|clean[- ]?up|green|environment|saplings?|recycling)\b/i, label: 'the environment' },
  { category: 'sports', words: /\b(sports?|team|club|football|cricket|kit|equipment|tournament)\b/i, label: 'sport and clubs' },
  { category: 'community', words: /\b(community|neighbou?rs?|park|event|festival|hall)\b/i, label: 'a community project' },
]

export function suggestCategory(text: string): Pick<ParsedMessage, 'category' | 'categoryReason'> {
  const hit = CATEGORY_HINTS.find((hint) => hint.words.test(text))
  if (!hit) return {}
  const word = text.match(hit.words)?.[0] ?? ''
  return { category: hit.category, categoryReason: `You mentioned “${word}”, which usually fits ${hit.label}.` }
}

export function parseCampaignMessage(text: string): ParsedMessage {
  return { ...extractAmount(text), ...suggestCategory(text) }
}
