import type { GameContribution } from '../hooks/useGameContribution.ts'
import { formatPaise, gameIntroSentence, selectedPaise, shortNoun } from '../lib/gameContribution.ts'

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
            <span>{custom ? 'Game suggestion' : 'Pending contribution'}</span>
            <strong>{formatPaise(pending)}</strong>
          </span>
          {custom ? (
            <span className="gc-pending gc-chosen">
              <span>Your chosen contribution</span>
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
          Review contribution
        </button>
      </div>
      <p className="gc-bar-note">
        {session
          ? session.capReached && session.capPaise != null
            ? `Suggestion cap of ${formatPaise(session.capPaise)} reached. Further actions will not increase it.`
            : 'Nothing is charged while playing. Totals are local demo data in this browser.'
          : gameIntroSentence(contribution.game, settings.ratePaise)}
      </p>
    </section>
  )
}
