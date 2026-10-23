import type { GameContribution } from '../hooks/useGameContribution.ts'
import { formatPaise, gameAmountRules, selectedPaise, shortNoun } from '../lib/gameContribution.ts'

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
      <p className="gc-feedback" role="status" aria-live="polite">
        {contribution.feedback?.text ?? ''}
      </p>
      <p className="gc-bar-note">
        {session
          ? session.capReached && session.capPaise != null
            ? `Giving limit of ${formatPaise(session.capPaise)} reached. Keep playing — the suggestion stays here until you agree to raise it to ${formatPaise(session.capPaise + session.ratePaise)}.`
            : `${settings.allowCustom ? 'Your final contribution is your choice.' : 'Your contribution is the amount the game suggests.'} No payment is taken while you play.`
          : `${gameAmountRules(contribution.game, settings).join(' ')} No payment is taken while you play.`}
        {session?.capReached && session.capPaise != null ? (
          <>
            {' '}
            <button type="button" className="gc-link" onClick={() => contribution.raiseLimit()} disabled={contribution.paused}>
              Raise the limit from {formatPaise(session.capPaise)} to {formatPaise(session.capPaise + session.ratePaise)}
            </button>
          </>
        ) : null}
        {session && !contribution.preview ? (
          <>
            {' '}
            <button type="button" className="gc-link gc-new-session" onClick={() => contribution.requestNewSession()} disabled={contribution.paused}>
              Start a new session
            </button>
          </>
        ) : null}
      </p>
    </section>
  )
}
