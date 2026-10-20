import type { GameContribution } from '../hooks/useGameContribution.ts'
import { formatPaise, gameActionAmounts, selectedPaise, shortNoun } from '../lib/gameContribution.ts'

export function ContributionBar({ contribution }: { contribution: GameContribution }) {
  const { session, config, settings } = contribution
  const rate = session?.ratePaise ?? settings.ratePaise
  const count = session?.actions.length ?? 0
  const pending = session?.suggestedPaise ?? 0
  const custom = session?.customPaise != null

  return (
    <section className="gc-bar" aria-label="Your game contribution">
      <div className="gc-bar-inner">
        <div className="gc-bar-stats">
          <span className="gc-rate">
            {formatPaise(rate)} per {shortNoun(contribution.game)}
          </span>
          <span className="gc-count" aria-live="polite">
            {count} {count === 1 ? config.noun : config.nounPlural}
          </span>
          <span className="gc-pending" aria-live="polite">
            <span>Suggested contribution</span>
            <strong>{formatPaise(pending)}</strong>
          </span>
          {custom ? (
            <span className="gc-pending gc-chosen">
              <span>Your chosen amount</span>
              <strong>{formatPaise(selectedPaise(session))}</strong>
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="gc-review"
          onClick={() => contribution.openReview()}
          disabled={!session || contribution.paused}
        >
          Review & contribute
        </button>
      </div>
      <p className="gc-bar-note">
        {session
          ? session.capReached && session.capPaise != null
            ? `Suggestion limit of ${formatPaise(session.capPaise)} reached. More actions won’t increase it.`
            : 'No payment is taken while you play. You can review the amount before confirming.'
          : `${gameActionAmounts(contribution.game, settings.ratePaise)} No payment is taken while you play.`}
      </p>
    </section>
  )
}
