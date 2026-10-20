import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { DEMO_PLANS, demoPlan } from '../../lib/plans.ts'
import { createOrganization } from '../../lib/orgStorage.ts'
import { StorageFullError } from '../../lib/storage.ts'
import type { PlanId } from '../../lib/types.ts'

/** Simulated plan selection. No prices, no billing, no enforcement. */
export function PlansPage() {
  const navigate = useNavigate()
  const unfinished = useOrganizations().filter((org) => org.website.status === 'setup')
  const [selected, setSelected] = useState<PlanId | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Demo plans — Together'
  }, [])

  function confirm() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const org = createOrganization(selected)
      navigate(`/start/${org.id}`)
    } catch (problem) {
      setBusy(false)
      setError(problem instanceof StorageFullError ? problem.message : 'The demo plan could not be saved in this browser.')
    }
  }

  return (
    <div className="container page-pad plans-page">
      <header className="center-head">
        <p className="oh-eyebrow">Step 1 of setup</p>
        <h1>Choose a demo plan</h1>
        <p className="muted">These are sample plans for the prototype. There are no prices, no payment is collected, and limits are shown for illustration only.</p>
      </header>
      {unfinished.length > 0 ? (
        <div className="notice warn">
          <div>
            <strong>You have an unfinished setup on this device.</strong>
            <p className="small">{unfinished.map((org) => org.name || 'Untitled organization').join(', ')}</p>
          </div>
          <Link to="/start" className="btn btn-outline btn-sm">
            Continue setup
          </Link>
        </div>
      ) : null}
      <div className="plan-grid" role="radiogroup" aria-label="Demo plans">
        {DEMO_PLANS.map((plan) => (
          <article key={plan.id} className={selected === plan.id ? 'plan-card selected' : 'plan-card'}>
            <span className="eyebrow-label">Demo plan · no price</span>
            <h2>{plan.name}</h2>
            <p className="muted">{plan.audience}</p>
            <h3>Included</h3>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <h3>Limits</h3>
            <ul className="limits">
              {plan.limits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
            <button type="button" role="radio" aria-checked={selected === plan.id} className={selected === plan.id ? 'btn btn-primary btn-block' : 'btn btn-outline btn-block'} onClick={() => setSelected(plan.id)}>
              {selected === plan.id ? 'Selected' : 'Choose this demo plan'}
            </button>
          </article>
        ))}
      </div>
      {selected ? (
        <section className="panel confirm-plan" aria-labelledby="confirm-plan-title">
          <h2 id="confirm-plan-title">Confirm demo subscription</h2>
          <p>
            You chose the <strong>{demoPlan(selected).name}</strong>. This is a simulated subscription: <strong>no payment is collected</strong>, and there is no
            billing, renewal or invoice. The plan is saved with your new organization in this browser.
          </p>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
              Confirm demo plan and start setup
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>
              Change plan
            </button>
          </div>
        </section>
      ) : null}
      <p className="muted small center">Limits are not enforced in this prototype.</p>
    </div>
  )
}
