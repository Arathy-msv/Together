import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatINR } from '../lib/format.ts'
import '../styles/goal.css'

const PETALS = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 53) % 100}%`,
  delay: `${(index % 9) * 0.28}s`,
  duration: `${7 + (index % 5) * 0.8}s`,
  size: 10 + (index % 4) * 4,
  tone: index % 3,
}))

/**
 * Stops play once a campaign has reached its target.
 * The garden keeps the fully grown shared tree visible behind the gesture.
 */
export function GoalGesture({
  campaignTitle,
  goal,
  gift,
  backTo,
  resting,
  variant = 'stage',
}: {
  campaignTitle: string
  goal: number
  /** Rupees confirmed in this moment, when this gift is what crossed the line. */
  gift?: number
  backTo?: string
  resting: string
  variant?: 'scene' | 'stage' | 'banner'
}) {
  useEffect(() => {
    if (variant === 'banner') return
    document.getElementById('goal-gesture-title')?.focus()
  }, [variant])

  return (
    <div className={`goal-gesture goal-${variant}`} role="status">
      {variant === 'banner' ? null : <Petals />}
      <div className="goal-card">
        <div className="goal-medallion" aria-hidden="true">
          <span className="goal-ring" />
          <Leaf />
        </div>
        <div className="goal-copy">
          <p className="goal-kicker">Campaign complete</p>
          <h2 id="goal-gesture-title" tabIndex={-1}>
            The goal is reached
          </h2>
          <p className="goal-lead">
            <strong>{campaignTitle}</strong> has grown to {formatINR(goal)}.
            {gift != null && gift > 0 ? ` Your ${formatINR(gift)} carried it there.` : ''}
          </p>
          {variant === 'scene' ? null : <p>{resting}</p>}
        </div>
        {backTo ? (
          <Link className="goal-back" to={backTo}>
            Back to campaign
          </Link>
        ) : (
          <p className="goal-resting-note">Play is resting.</p>
        )}
      </div>
    </div>
  )
}

function Petals() {
  return (
    <div className="goal-petals" aria-hidden="true">
      {PETALS.map((petal, index) => (
        <i
          key={index}
          data-tone={petal.tone}
          style={{
            left: petal.left,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
            width: petal.size,
            height: petal.size * 1.35,
          }}
        />
      ))}
    </div>
  )
}

function Leaf() {
  return (
    <svg viewBox="0 0 48 48" width="42" height="42">
      <path
        d="M24 6c8 8 14 16 14 24a14 14 0 0 1-28 0C10 22 16 14 24 6z"
        fill="#1e4b3b"
      />
      <path d="M24 16v20" stroke="#f6e7b2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
