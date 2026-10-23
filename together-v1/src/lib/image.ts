const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const IMAGE_ACCEPT = ACCEPTED.join(',')

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    image.src = url
  })
}

/**
 * Downscales uploads before they go into localStorage, which is limited to a few megabytes per origin.
 */
export async function readImageFile(
  file: File,
  options: { maxWidth: number; maxHeight: number; type: 'image/jpeg' | 'image/png'; quality?: number; maxChars?: number },
): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Use a JPG, PNG, WebP or GIF image.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose an image smaller than 8 MB.')
  const image = await loadImage(file)
  const scale = Math.min(1, options.maxWidth / image.naturalWidth, options.maxHeight / image.naturalHeight)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not process this image.')
  if (options.type === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }
  context.drawImage(image, 0, 0, width, height)
  const limit = options.maxChars ?? 1_200_000
  let quality = options.quality ?? 0.82
  let data = canvas.toDataURL(options.type, quality)
  while (data.length > limit && options.type === 'image/jpeg' && quality > 0.45) {
    quality -= 0.1
    data = canvas.toDataURL(options.type, quality)
  }
  if (data.length > limit) throw new Error('This image is still too large after compression. Try a simpler or smaller image.')
  return data
}

const VIDEO_TYPES = ['video/mp4', 'video/webm']
export const VIDEO_ACCEPT = VIDEO_TYPES.join(',')
/** Browser storage is only a few megabytes, so demo videos must be very short. */
export const MAX_VIDEO_BYTES = 2.5 * 1024 * 1024

export function readVideoFile(file: File): Promise<string> {
  if (!VIDEO_TYPES.includes(file.type)) return Promise.reject(new Error('Use an MP4 or WebM video.'))
  if (file.size > MAX_VIDEO_BYTES) return Promise.reject(new Error('Choose a video under 2.5 MB. Browser storage in this demo is very limited.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('That video could not be read.')))
    reader.onerror = () => reject(new Error('That video could not be read.'))
    reader.readAsDataURL(file)
  })
}
