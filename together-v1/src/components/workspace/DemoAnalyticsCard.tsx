import { useState } from 'react'
import { analyticsPaused, analyticsSummary, clearAnalytics, exportAnalytics, setAnalyticsPaused } from '../../lib/analytics.ts'

/** Counts from this browser only. Not a study and not proof of what caused a gift. */
export function DemoAnalyticsCard() {
  const [tick, setTick] = useState(0)
  const summary = analyticsSummary()
  void tick
  function download() {
    const blob = new Blob([exportAnalytics()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'together-demo-analytics.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section className="panel ws-card" aria-labelledby="demo-analytics">
      <h2 id="demo-analytics">Demo journey counts</h2>
      <p className="muted small">
        Last {summary.windowDays} days on this device. Views are the denominator for participation. An open review without a confirmation is an abandoned review, not a failed payment. Seeded demo activity is not a statistically valid result.
      </p>
      <dl className="budget-summary">
        <div><dt>Views</dt><dd>{summary.views}</dd></div>
        <div><dt>Participation starts</dt><dd>{summary.participationStarts}</dd></div>
        <div><dt>Reviews</dt><dd>{summary.reviews}</dd></div>
        <div><dt>Confirmed contributions</dt><dd>{summary.confirmed}</dd></div>
      </dl>
      <p className="small">Confirmed by mode — direct {summary.byMode.direct}, game {summary.byMode.game}, sponsor {summary.byMode.sponsor}. Abandoned reviews in this window: {summary.abandonedReviews}.</p>
      <div className="inline-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { setAnalyticsPaused(!analyticsPaused()); setTick((n) => n + 1) }}>
          {summary.paused ? 'Resume measurement' : 'Pause measurement'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={download}>Export counts</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => { clearAnalytics(); setTick((n) => n + 1) }}>Clear demo analytics</button>
      </div>
    </section>
  )
}
