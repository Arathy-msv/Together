import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AiStatus } from '../../hooks/useAiRequest.ts'
import { SIMULATION_LABEL, type SourceRef } from '../../lib/ai/types.ts'

export function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="ai-spark">
      <path d="M10 18c-.6-4.4 1.2-7.6 6-9.4.5 4.6-2.2 8-6 9.4Z" fill="currentColor" opacity="0.55" />
      <path d="M10 18C6.2 16.6 3.5 13.2 4 8.6c4.8 1.8 6.6 5 6 9.4Z" fill="currentColor" opacity="0.8" />
      <path d="M14.5 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" fill="currentColor" />
    </svg>
  )
}

export function AiBadge({ label = SIMULATION_LABEL }: { label?: string }) {
  return (
    <span className="ai-badge">
      <SparkIcon size={14} />
      {label}
    </span>
  )
}

/** Opens an AI helper. Styled distinctly from primary actions so it never looks like "publish". */
export function AiButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="ai-button" onClick={onClick} disabled={disabled}>
      <SparkIcon size={15} />
      {children}
    </button>
  )
}

/**
 * Consistent frame for every AI helper: label, input context, status, then editable output.
 * Suggestions shown inside stay separate from saved data until the organizer applies them.
 */
export function AiPanel({
  title,
  context,
  status,
  error,
  onCancel,
  onRetry,
  onClose,
  children,
  label,
}: {
  title: string
  context?: ReactNode
  status: AiStatus
  error?: string
  onCancel?: () => void
  onRetry?: () => void
  onClose?: () => void
  children?: ReactNode
  label?: string
}) {
  return (
    <section className="ai-panel" aria-label={title} aria-busy={status === 'loading'}>
      <header className="ai-panel-head">
        <div>
          <AiBadge label={label} />
          <h3>{title}</h3>
        </div>
        {onClose ? (
          <button type="button" className="ai-close" aria-label={`Close ${title}`} onClick={onClose}>
            ×
          </button>
        ) : null}
      </header>
      {context ? <div className="ai-context">{context}</div> : null}
      <div role="status" aria-live="polite" className="ai-status">
        {status === 'loading' ? (
          <span className="ai-loading">
            <i aria-hidden="true" /> Preparing a suggestion…
            {onCancel ? (
              <button type="button" className="link-button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </span>
        ) : null}
        {status === 'cancelled' ? (
          <span className="muted small">
            Cancelled. Nothing was changed.{' '}
            {onRetry ? (
              <button type="button" className="link-button" onClick={onRetry}>
                Try again
              </button>
            ) : null}
          </span>
        ) : null}
        {status === 'error' ? (
          <span className="error-text">
            {error || 'The suggestion could not be prepared.'}{' '}
            {onRetry ? (
              <button type="button" className="link-button" onClick={onRetry}>
                Retry
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {children}
      <p className="ai-footnote">Simulated suggestions from fixed rules and your own information. Review everything before using it — nothing is applied or published automatically.</p>
    </section>
  )
}

export function MissingList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="ai-missing">
      <strong>Still needed from you</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function SourceChips({ sources, hrefFor }: { sources: SourceRef[]; hrefFor?: (source: SourceRef) => string | undefined }) {
  if (sources.length === 0) return null
  return (
    <ul className="source-chips" aria-label="Sources">
      {sources.map((source) => {
        const href = hrefFor?.(source)
        const content = (
          <>
            <span className="source-kind">{source.kind}</span>
            {source.label}
          </>
        )
        return <li key={`${source.kind}-${source.id}`}>{href ? <Link to={href}>{content}</Link> : <span>{content}</span>}</li>
      })}
    </ul>
  )
}
