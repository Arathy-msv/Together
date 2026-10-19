export function ProgressBar({ value, muted = false }: { value: number; muted?: boolean }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div
      className={muted ? 'progress muted' : 'progress'}
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${width}%` }} />
    </div>
  )
}
