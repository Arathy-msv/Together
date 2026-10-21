import { fontStack } from './theme.ts'
import type { ShareContent } from './sharing.ts'
import type { Campaign, Organization } from './types.ts'

/**
 * Canvas rendering for the downloadable poster and social images. Kept separate from QR
 * generation (`lib/qr.ts`) and from content preparation (`lib/sharing.ts`) so each concern can be
 * tested and reused on its own.
 */

export class AssetRenderError extends Error {
  /** True when the failure looks like a tainted-canvas / cross-origin image problem. */
  readonly imageRelated: boolean
  constructor(message: string, imageRelated = false) {
    super(message)
    this.imageRelated = imageRelated
  }
}

export const POSTER_WIDTH = 2480
export const POSTER_HEIGHT = 3508

export const SOCIAL_SIZES = {
  square: { id: 'square' as const, label: 'Square', width: 1080, height: 1080 },
  portrait: { id: 'portrait' as const, label: 'Portrait', width: 1080, height: 1350 },
  story: { id: 'story' as const, label: 'Story', width: 1080, height: 1920 },
}
export type SocialSizeId = keyof typeof SOCIAL_SIZES

export interface RenderImages {
  logo: HTMLImageElement | null
  cover: HTMLImageElement | null
}

export interface PosterOptions {
  org: Organization
  campaign: Campaign
  content: ShareContent
  qr: HTMLImageElement
  images: RenderImages
}

export interface SocialOptions extends PosterOptions {
  size: SocialSizeId
  includeQr: boolean
}

/** Waits for the organization's chosen web fonts to finish loading so text does not jump mid-render. */
async function waitForFonts(org: Organization): Promise<void> {
  try {
    const heading = fontStack(org.branding.headingFont).split(',')[0]?.replace(/["']/g, '').trim()
    const body = fontStack(org.branding.bodyFont).split(',')[0]?.replace(/["']/g, '').trim()
    const specs = [heading ? `800 64px "${heading}"` : null, body ? `400 32px "${body}"` : null].filter((value): value is string => Boolean(value))
    await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => undefined)))
  } catch {
    // Font preloading is a nicety. Canvas text still falls back to the browser default.
  }
  try {
    await document.fonts.ready
  } catch {
    // Some test environments do not implement document.fonts.
  }
}

/** Greedy word-wrap. Returns at most `maxLines` lines, ellipsizing the last one if text overflows. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  let consumed = 0
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word
    if (current && ctx.measureText(attempt).width > maxWidth) {
      lines.push(current)
      consumed += current.split(/\s+/).length
      current = word
    } else {
      current = attempt
    }
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && current) {
    lines.push(current)
    consumed += current.split(/\s+/).length
  }
  if (consumed < words.length && lines.length > 0) {
    let last = lines[lines.length - 1].replace(/[.,;:\s]+$/, '')
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last}…`
  }
  return lines
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number): number {
  const lines = wrapLines(ctx, text, maxWidth, maxLines)
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

/** Fits an image inside a box without stretching it, so non-square logos are never distorted. */
function drawImageContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  ctx.drawImage(img, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH)
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  const dx = x + (w - drawW) / 2
  const dy = y + (h - drawH) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, drawW, drawH)
  ctx.restore()
}

/** Rounded rectangle. `r` is clamped to half the shortest side so an oversized radius (e.g. "999" for a pill) degrades to a clean capsule instead of distorting into a blob. */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AssetRenderError('This browser cannot draw the downloadable image.')
  return ctx
}

/** Renders the A4 (300dpi) poster. Missing logos, cover images and long text degrade gracefully. */
export async function renderPoster(canvas: HTMLCanvasElement, options: PosterOptions): Promise<void> {
  const { org, campaign, content, qr, images } = options
  canvas.width = POSTER_WIDTH
  canvas.height = POSTER_HEIGHT
  const ctx = getContext(canvas)
  await waitForFonts(org)

  const heading = fontStack(org.branding.headingFont)
  const body = fontStack(org.branding.bodyFont)
  const ink = '#15221c'
  const muted = '#4c5c54'
  const margin = 160

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)
  ctx.fillStyle = org.branding.primary
  ctx.fillRect(0, 0, POSTER_WIDTH, 36)

  let cursorY = 220
  if (images.logo) {
    try {
      drawImageContain(ctx, images.logo, margin, cursorY - 110, 160, 160)
    } catch {
      // Keep the poster usable even if the logo cannot be drawn.
    }
  }
  ctx.fillStyle = ink
  ctx.font = `700 46px ${body}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(org.name, margin + (images.logo ? 196 : 0), cursorY)
  cursorY += 130

  ctx.font = `800 108px ${heading}`
  ctx.fillStyle = ink
  cursorY = drawWrapped(ctx, campaign.title, margin, cursorY, POSTER_WIDTH - margin * 2, 128, 3) + 20

  ctx.font = `400 46px ${body}`
  ctx.fillStyle = muted
  cursorY = drawWrapped(ctx, content.purpose, margin, cursorY, POSTER_WIDTH - margin * 2, 62, 3) + 30

  const coverHeight = 820
  if (images.cover) {
    try {
      roundRect(ctx, margin, cursorY, POSTER_WIDTH - margin * 2, coverHeight, 28)
      ctx.save()
      ctx.clip()
      drawImageCover(ctx, images.cover, margin, cursorY, POSTER_WIDTH - margin * 2, coverHeight)
      ctx.restore()
      cursorY += coverHeight + 50
    } catch {
      throw new AssetRenderError('The campaign image could not be drawn. Try the image-free poster instead.', true)
    }
  } else {
    cursorY += 24
  }

  ctx.font = `700 50px ${body}`
  ctx.fillStyle = org.branding.primary
  ctx.fillText(content.goalLine, margin, cursorY)
  cursorY += 90

  if (content.attribution) {
    ctx.font = `700 48px ${body}`
    ctx.fillStyle = ink
    cursorY = drawWrapped(ctx, content.posterHeading, margin, cursorY, POSTER_WIDTH - margin * 2, 60, 2) + 10
    if (content.attribution.intro) {
      ctx.font = `italic 400 42px ${body}`
      ctx.fillStyle = muted
      cursorY = drawWrapped(ctx, `“${content.attribution.intro}”`, margin, cursorY, POSTER_WIDTH - margin * 2, 56, 3) + 10
    }
  }

  const qrSize = 560
  const cardPad = 36
  const footerBaseline = POSTER_HEIGHT - 120
  const cardBottom = footerBaseline - 80
  const cardTop = cardBottom - qrSize - cardPad * 2
  const qrX = margin
  const qrBlockY = cardTop + cardPad
  if (cursorY > cardTop - 48) cursorY = cardTop - 48
  roundRect(ctx, qrX - cardPad, cardTop, qrSize + cardPad * 2, cardBottom - cardTop, 24)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#d8ddd6'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.drawImage(qr, qrX, qrBlockY, qrSize, qrSize)

  ctx.font = `800 54px ${heading}`
  ctx.fillStyle = ink
  ctx.fillText('Scan to support', qrX + qrSize + 90, qrBlockY + 90)
  ctx.font = `400 38px ${body}`
  ctx.fillStyle = muted
  drawWrapped(ctx, content.url, qrX + qrSize + 90, qrBlockY + 160, POSTER_WIDTH - margin - (qrX + qrSize + 90), 50, 4)

  ctx.font = `400 34px ${body}`
  ctx.fillStyle = muted
  ctx.fillText(`A fundraiser by ${org.name}`, margin, footerBaseline)
}

/** Renders one of the three social-image sizes. */
export async function renderSocialImage(canvas: HTMLCanvasElement, options: SocialOptions): Promise<void> {
  const { org, campaign, content, qr, images, size, includeQr } = options
  const dims = SOCIAL_SIZES[size]
  canvas.width = dims.width
  canvas.height = dims.height
  const ctx = getContext(canvas)
  await waitForFonts(org)

  const heading = fontStack(org.branding.headingFont)
  const body = fontStack(org.branding.bodyFont)
  const margin = 72

  if (images.cover) {
    try {
      drawImageCover(ctx, images.cover, 0, 0, dims.width, dims.height)
    } catch {
      throw new AssetRenderError('The campaign image could not be drawn. Try the image-free design instead.', true)
    }
  } else {
    ctx.fillStyle = org.branding.primary
    ctx.fillRect(0, 0, dims.width, dims.height)
  }

  const overlayHeight = Math.round(dims.height * (size === 'square' ? 0.58 : 0.5))
  const gradient = ctx.createLinearGradient(0, dims.height - overlayHeight, 0, dims.height)
  gradient.addColorStop(0, 'rgba(10, 16, 13, 0)')
  gradient.addColorStop(1, 'rgba(8, 14, 11, 0.86)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, dims.height - overlayHeight, dims.width, overlayHeight)

  const qrSize = includeQr ? 188 : 0
  const ctaY = dims.height - margin - 8
  const bandTop = includeQr ? ctaY - 8 - qrSize : ctaY - 72
  const textWidth = dims.width - margin * 2
  let cursorY = Math.max(dims.height - overlayHeight + 36, bandTop - (size === 'square' ? 250 : 320))

  if (images.logo) {
    try {
      ctx.save()
      ctx.beginPath()
      ctx.arc(margin + 36, cursorY - 18, 36, 0, Math.PI * 2)
      ctx.clip()
      drawImageContain(ctx, images.logo, margin, cursorY - 54, 72, 72)
      ctx.restore()
    } catch {
      // Logo compositing is decorative; skip on failure.
    }
  }
  ctx.font = `700 28px ${body}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(org.name, margin + (images.logo ? 88 : 0), cursorY)
  cursorY += 52

  ctx.font = `800 48px ${heading}`
  ctx.fillStyle = '#ffffff'
  cursorY = drawWrapped(ctx, campaign.title, margin, cursorY, textWidth, 58, 2) + 12

  const purposeLines = size === 'square' ? 3 : 4
  ctx.font = `400 28px ${body}`
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const purposeBottom = bandTop - (content.attribution ? 48 : 16)
  const room = Math.max(1, Math.floor((purposeBottom - cursorY) / 36))
  cursorY = drawWrapped(ctx, content.purpose, margin, cursorY, textWidth, 36, Math.min(purposeLines, room)) + 12

  if (content.attribution && cursorY < bandTop - 8) {
    ctx.font = `700 26px ${body}`
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    drawWrapped(ctx, content.posterHeading, margin, cursorY, textWidth, 34, 1)
  }

  ctx.font = `800 28px ${body}`
  const ctaLabel = 'Support this campaign'
  const ctaWidth = Math.min(ctx.measureText(ctaLabel).width + 56, includeQr ? dims.width - margin * 2 - qrSize - 36 : dims.width - margin * 2)
  roundRect(ctx, margin, ctaY - 52, ctaWidth, 52, 999)
  ctx.fillStyle = org.branding.accent
  ctx.fill()
  ctx.fillStyle = '#1a1208'
  ctx.fillText(ctaLabel, margin + 28, ctaY - 16)

  if (includeQr) {
    const qrX = dims.width - margin - qrSize
    const qrY = ctaY - qrSize
    roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)
  }
}
