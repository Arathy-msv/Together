export function ProgressBar({
  value,
  muted = false,
  tone = 'green',
}: {
  value: number
  muted?: boolean
  tone?: 'green' | 'gold'
}) {
  const width = Math.max(0, Math.min(100, value))
  const classes = ['progress', muted ? 'muted' : '', tone === 'gold' ? 'gold' : ''].filter(Boolean).join(' ')
  return (
    <div className={classes} role="progressbar" aria-valuenow={Math.round(width)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${width}%` }} />
    </div>
  )
}
