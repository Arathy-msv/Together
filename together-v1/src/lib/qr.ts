import QRCode from 'qrcode'

/**
 * Thin wrapper around the `qrcode` package. Every QR code in the app encodes a real, resolved
 * campaign or referral URL — there is no placeholder or "demo" QR. Rendering happens entirely in
 * the browser (canvas and SVG); nothing is sent to a server to generate the code.
 */

export interface QrStyle {
  /** Pixel size of the square output. */
  size?: number
  /** Quiet-zone width in QR modules. The QR spec calls for at least 4; we never go below that. */
  margin?: number
  dark?: string
  light?: string
}

const DEFAULT_STYLE: Required<QrStyle> = { size: 320, margin: 4, dark: '#101418', light: '#ffffff' }

function resolveStyle(style?: QrStyle): Required<QrStyle> {
  return { ...DEFAULT_STYLE, ...style, margin: Math.max(4, style?.margin ?? DEFAULT_STYLE.margin) }
}

export class QrGenerationError extends Error {}

/** Draws a QR code for `text` onto an existing canvas element. Throws QrGenerationError on failure. */
export async function renderQrToCanvas(canvas: HTMLCanvasElement, text: string, style?: QrStyle): Promise<void> {
  const resolved = resolveStyle(style)
  try {
    await QRCode.toCanvas(canvas, text, {
      width: resolved.size,
      margin: resolved.margin,
      color: { dark: resolved.dark, light: resolved.light },
      errorCorrectionLevel: 'M',
    })
  } catch (problem) {
    throw new QrGenerationError(problem instanceof Error ? problem.message : 'The QR code could not be generated.')
  }
}

/** A standalone PNG data URL for the QR code, suitable for downloads or drawing into a bigger canvas. */
export async function qrPngDataUrl(text: string, style?: QrStyle): Promise<string> {
  const resolved = resolveStyle(style)
  try {
    return await QRCode.toDataURL(text, {
      width: resolved.size,
      margin: resolved.margin,
      color: { dark: resolved.dark, light: resolved.light },
      errorCorrectionLevel: 'M',
      type: 'image/png',
    })
  } catch (problem) {
    throw new QrGenerationError(problem instanceof Error ? problem.message : 'The QR code could not be generated.')
  }
}

/** SVG markup for the QR code, used for the "Download SVG" action. */
export async function qrSvgString(text: string, style?: QrStyle): Promise<string> {
  const resolved = resolveStyle(style)
  try {
    return await QRCode.toString(text, {
      width: resolved.size,
      margin: resolved.margin,
      color: { dark: resolved.dark, light: resolved.light },
      errorCorrectionLevel: 'M',
      type: 'svg',
    })
  } catch (problem) {
    throw new QrGenerationError(problem instanceof Error ? problem.message : 'The QR code could not be generated.')
  }
}

/** Loads a data: URL into an <img>, for compositing the QR into posters and social images. */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'sync'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That image could not be loaded.'))
    img.src = src
  })
}
