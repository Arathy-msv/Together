/* Conversions between stored values and form inputs. */

export function minorToInput(minor: number | undefined): string {
  if (minor === undefined) return ''
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2)
}

export function toDateInput(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDateInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function nowIso(): string {
  return new Date().toISOString()
}
