export function formatINR(value: number): string {
  const amount = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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

export function statusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'scheduled':
      return 'Scheduled'
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'closed':
      return 'Closed'
    default:
      return status
  }
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}
