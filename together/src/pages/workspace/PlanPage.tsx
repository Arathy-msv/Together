import { useEffect, useState } from 'react'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { formatDate } from '../../lib/format.ts'
import { DEMO_PLANS, demoPlan } from '../../lib/plans.ts'
import { saveOrganization } from '../../lib/orgStorage.ts'
import type { PlanId } from '../../lib/types.ts'

/** /workspace/:organizationId/plan — the selected demo plan. Changing it is simulated. */
export function PlanPage() {
  const { org } = useOrg()
  const stored = useOrganizations().find((item) => item.id === org.id)!
  const [choice, setChoice] = useState<PlanId>(stored.plan.id)
  const [notice, setNotice] = useState('')
  const current = demoPlan(stored.plan.id)

  useEffect(() => {
    document.title = `Demo plan — ${org.name}`
  }, [org.name])

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <h1>Demo plan</h1>
          <p className="muted">Simulated subscription. No payment, billing, renewals or invoices — and limits are not enforced in this prototype.</p>
        </div>
      </header>
      {notice ? (
        <div className="notice success" role="status">
          {notice}
        </div>
      ) : null}
      <section className="panel ws-card">
        <span className="eyebrow-label">Current plan · selected {formatDate(stored.plan.selectedAt)}</span>
        <h2>{current.name}</h2>
        <p className="muted">{current.audience}</p>
        <div className="two-col">
          <div>
            <h3>Included</h3>
            <ul>
              {current.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Limits (illustrative)</h3>
            <ul>
              {current.limits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="panel ws-card" aria-labelledby="change-plan">
        <h2 id="change-plan">Switch demo plan</h2>
        <div className="segmented" role="radiogroup" aria-label="Demo plans">
          {DEMO_PLANS.map((plan) => (
            <label key={plan.id} className={choice === plan.id ? 'selected' : ''}>
              <input type="radio" name="demo-plan" checked={choice === plan.id} onChange={() => setChoice(plan.id)} />
              {plan.name}
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={choice === stored.plan.id}
          onClick={() => {
            saveOrganization({ ...stored, plan: { id: choice, selectedAt: new Date().toISOString() } })
            setNotice(`Switched to the ${demoPlan(choice).name}. No payment was collected.`)
          }}
        >
          Switch plan (simulated)
        </button>
      </section>
    </div>
  )
}
