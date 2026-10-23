import { useEffect, useState } from 'react'
import { AccessDenied } from '../../components/identity/AccessDenied.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { FEATURE_CARDS, isPlatformAvailable } from '../../lib/features.ts'
import { orgAdmins, orgMembers, userName } from '../../lib/identity.ts'
import { orgBase, orgTypeLabel } from '../../lib/organizations.ts'
import { platformSetPlan, setPlatformFeatureAvailability } from '../../lib/orgActions.ts'
import { can } from '../../lib/permissions.ts'
import { DEMO_PLANS } from '../../lib/plans.ts'
import type { PlanId } from '../../lib/types.ts'
import { websiteStatusLabel } from '../../lib/website.ts'

/**
 * /admin — Platform Admin: organizations, demo plans and platform feature availability.
 * Deliberately shows no contributions, receipts, supporter profiles or identity documents.
 */
export function PlatformAdminPage() {
  const user = useCurrentUser()
  const organizations = useOrganizations()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    document.title = 'Platform admin — Together'
  }, [])

  if (!can(user, 'platform.manageOrganizations')) {
    return <AccessDenied reason="Platform administration is only for the Platform Admin demo identity." />
  }

  function run(action: () => void, text: string) {
    try {
      action()
      setMessage({ tone: 'success', text })
    } catch (problem) {
      setMessage({ tone: 'error', text: problem instanceof Error ? problem.message : 'That change could not be saved.' })
    }
  }

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo</span> Platform Admin · {user!.name}
          </p>
          <h1>Platform administration</h1>
          <p className="muted">Organizations, demo plans and feature availability. Supporter records and identity documents are not shown here.</p>
        </div>
      </header>
      {message ? (
        <div className={`notice ${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <section className="panel ws-card" aria-labelledby="orgs-title">
        <h2 id="orgs-title">Organizations</h2>
        <ul className="member-list">
          {organizations.map((org) => (
            <li key={org.id} className="member">
              <div className="member-head">
                <div>
                  <strong>{org.name || 'Untitled organization'}</strong>
                  <span className="muted small">
                    {orgTypeLabel(org.type)} · {websiteStatusLabel(org)} · {orgMembers(org.id).length} member(s) · admins: {orgAdmins(org.id).map(userName).join(', ')}
                  </span>
                </div>
                <div className="inline-actions">
                  <label className="sr-only" htmlFor={`plan-${org.id}`}>
                    Demo plan for {org.name}
                  </label>
                  <select id={`plan-${org.id}`} value={org.plan.id} onChange={(event) => run(() => platformSetPlan(org.id, event.target.value as PlanId), `Plan updated for ${org.name}.`)}>
                    {DEMO_PLANS.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                  {org.website.status === 'published' ? (
                    <a href={orgBase(org.slug)} className="btn btn-outline btn-sm">
                      Public website
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">Changing a plan switches off features the new plan doesn’t include. Their data is kept. No price is charged.</p>
      </section>

      <section className="panel ws-card" aria-labelledby="availability-title">
        <h2 id="availability-title">Platform feature availability</h2>
        <p className="muted small">Making a feature unavailable hides it for every organization without deleting any records. Essentials can’t be turned off.</p>
        <ul className="ws-list">
          {FEATURE_CARDS.map((card) => {
            const available = isPlatformAvailable(card.key)
            return (
              <li key={card.key}>
                <div>
                  <strong>{card.name}</strong>
                  <span className="muted small">{card.explanation}</span>
                </div>
                <label className="feature-toggle">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={available}
                    onChange={(event) => run(() => setPlatformFeatureAvailability(card.key, event.target.checked), `${card.name} is now ${event.target.checked ? 'available' : 'unavailable'}.`)}
                  />
                  <span>{available ? 'Available' : 'Unavailable'}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
