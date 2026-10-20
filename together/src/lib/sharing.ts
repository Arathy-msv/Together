import { slugify } from './organizations.ts'
import { currencySymbol, formatMoney, shortPurpose } from './format.ts'
import type { Campaign, Organization, Referral } from './types.ts'

/**
 * Shared sharing-kit content for both the original campaign link and a supporter's personal
 * referral link. One resolved URL feeds every asset — the QR code, poster, WhatsApp draft, email
 * draft and social captions below always point at the same place.
 */

export type ShareMode = 'campaign' | 'referral'

export interface ShareSubject {
  mode: ShareMode
  org: Organization
  campaign: Campaign
  /** Resolved, absolute URL built from the current origin and the app's own route helpers. */
  url: string
  /** Present only when mode is 'referral'. */
  referral?: Referral
}

export interface ShareEmailDraft {
  subject: string
  body: string
}

export interface ShareContent {
  url: string
  /** Short, factual line used under previews and inside posters/social images. */
  purpose: string
  /** e.g. "Goal ₹60,000". Never a live raised total — static assets would go stale. */
  goalLine: string
  attribution?: { name: string; intro?: string }
  posterHeading: string
  whatsapp: string
  email: ShareEmailDraft
  socialCaption: string
  /** Kept from the original kit as a plain-text alternative to the generated assets. */
  classicMessages: string[]
}

function closingSentence(mode: ShareMode, orgName: string): string {
  return mode === 'referral'
    ? `You can learn more and support ${orgName} here:`
    : `You can learn more and support here:`
}

export function buildShareContent(subject: ShareSubject): ShareContent {
  const { mode, org, campaign, url, referral } = subject
  const purpose = shortPurpose(campaign.description)
  const goalLine = `Goal ${formatMoney(campaign.goalAmount, campaign.currency)}`
  const attribution = mode === 'referral' && referral ? { name: referral.displayName, intro: referral.message.trim() || undefined } : undefined

  const whatsappIntro =
    mode === 'referral' && attribution?.intro
      ? attribution.intro
      : `I’m supporting “${campaign.title}” by ${org.name}.\n${purpose}`
  const whatsapp = [
    mode === 'referral' ? `Hi! I’m supporting ${campaign.title} by ${org.name}.` : `Hi! Take a look at ${campaign.title} by ${org.name}.`,
    whatsappIntro,
    closingSentence(mode, org.name),
    url,
  ]
    .filter(Boolean)
    .join('\n\n')

  const emailGreeting = 'Hi,'
  const emailIntro =
    mode === 'referral' && attribution?.intro
      ? attribution.intro
      : `${org.name} is running “${campaign.title}”. ${purpose}`
  const emailBody = [
    emailGreeting,
    '',
    emailIntro,
    '',
    mode === 'referral' ? `Here’s my personal link to the campaign — your support goes directly to ${org.name}'s campaign:` : 'Here’s the link to the campaign:',
    url,
    '',
    'Thank you for taking a look.',
  ].join('\n')

  const email: ShareEmailDraft = {
    subject: `Help support ${campaign.title}`,
    body: emailBody,
  }

  const socialCaption = [
    mode === 'referral' ? `${attribution?.name ?? 'I'} am supporting ${campaign.title} by ${org.name}.` : `${campaign.title} — a fundraiser by ${org.name}.`,
    purpose,
    'Link in the kit — add it when you post.',
  ]
    .filter(Boolean)
    .join(' ')

  const classicMessages = [
    `Please support “${campaign.title}” with ${org.name}: ${url}`,
    `I’m helping ${org.name} raise funds for ${campaign.title}. Every simulated contribution helps: ${url}`,
    `Join me — ${campaign.title}. Give directly or play a short game: ${url}`,
  ]

  return {
    url,
    purpose,
    goalLine,
    attribution,
    posterHeading: mode === 'referral' && attribution ? `${attribution.name} is supporting this campaign` : 'Scan to support',
    whatsapp,
    email,
    socialCaption,
    classicMessages,
  }
}

/** Filesystem-safe, descriptive download filename, e.g. "school-library-fund-anna-poster.png". */
export function shareAssetFilename(campaignTitle: string, kind: string, extension: string, personName?: string): string {
  const parts = [slugify(campaignTitle), personName ? slugify(personName) : '', kind].filter(Boolean)
  return `${parts.join('-')}.${extension}`
}

export function currencyGoalText(campaign: Campaign): string {
  return `${currencySymbol(campaign.currency)}${campaign.goalAmount.toLocaleString('en-IN')} ${campaign.currency}`
}

/** Turns a `data:` URL into a Blob without leaving the current turn. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('This browser could not export the image.')
  const mime = /:(.*?);/.exec(dataUrl.slice(0, comma))?.[1] || 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Triggers a browser download for a Blob. Call this directly from the click handler:
 * starting the download after an `await` loses the user gesture, and Chrome then
 * silently drops a second file from the same page.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
