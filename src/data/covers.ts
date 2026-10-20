export const UPLOADED_COVER_ID = 'upload'

export const COVERS: { id: string; label: string; alt: string; src: string }[] = [
  { id: 'library', label: 'School library', alt: 'A stack of books on a library table', src: '/covers/cover-library.jpg' },
  { id: 'garden', label: 'Community garden', alt: 'Seedlings growing in a raised garden bed', src: '/covers/cover-garden.jpg' },
  { id: 'winter', label: 'Winter care', alt: 'Folded knitted sweaters and scarves', src: '/covers/cover-winter.jpg' },
  { id: 'sports', label: 'Sports & play', alt: 'A football on a school sports field', src: '/covers/cover-sports.jpg' },
  { id: 'reading', label: 'Reading room', alt: 'A bright school reading room with bookshelves', src: '/covers/cover-reading.jpg' },
  { id: 'jacket', label: 'Warm jacket', alt: 'A navy puffer jacket ready for cold weather', src: '/covers/cover-jacket.jpg' },
]

const LEGACY: Record<string, string> = { books: 'library', readers: 'reading', nook: 'reading', pages: 'reading', pencil: 'sports' }

export function coverTemplate(id: string) {
  const resolved = LEGACY[id] ?? id
  return COVERS.find((cover) => cover.id === resolved) ?? COVERS[0]
}
