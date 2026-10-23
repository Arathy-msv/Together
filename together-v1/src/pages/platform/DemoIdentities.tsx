import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { createDemoUser, listUsers, membershipsFor, merchantAccessFor, roleSummary, switchIdentity } from '../../lib/identity.ts'

const ROLE_GUIDE = [
  { role: 'Platform Admin', text: 'Manages organizations, demo plans and which optional features exist on the platform. Does not see supporter records.' },
  { role: 'Organization Admin', text: 'Runs one organization: website, features, members, campaigns, reviews, expenses, sponsors, partner offers and reports.' },
  { role: 'Campaign Organizer', text: 'Creates campaigns and works only on assigned ones: story, games, milestones, updates, expenses and sharing. Submits for review when required.' },
  { role: 'Merchant', text: 'Looks up and redeems vouchers at assigned partner stores and branches. No organization or supporter records.' },
  { role: 'Supporter', text: 'Everyone, including guests: browse, contribute, play, create a sharing page and see their own receipts and vouchers.' },
]

/** /demo-identities — explains the five roles and lets the demo switch between simulated identities. */
export function DemoIdentitiesPage() {
  const user = useCurrentUser()
  const organizations = useOrganizations()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const orgName = (id: string) => organizations.find((org) => org.id === id)?.name || 'Untitled organization'

  useEffect(() => {
    document.title = 'Demo identities — Together'
  }, [])

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo control</span> Simulated identities — not real sign-in or security
          </p>
          <h1>Demo identities</h1>
          <p className="muted">
            Pick who you are acting as. Anyone using this browser can choose any identity; nothing is verified. Switching clears what the previous identity had
            open.
          </p>
        </div>
      </header>

      <section className="panel ws-card" aria-labelledby="roles-title">
        <h2 id="roles-title">The five roles</h2>
        <dl className="detail-list">
          {ROLE_GUIDE.map((item) => (
            <div key={item.role}>
              <dt>{item.role}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="muted small">Visitors can browse every published website and campaign without choosing an identity.</p>
      </section>

      <section className="panel ws-card" aria-labelledby="identities-title">
        <h2 id="identities-title">Act as</h2>
        <ul className="identity-list">
          <li className={!user ? 'current' : ''}>
            <div>
              <strong>Guest visitor</strong>
              <span className="muted small">Supporter · uses this device’s guest profile for receipts and vouchers</span>
            </div>
            {user ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => switchIdentity(null)}>
                Act as guest
              </button>
            ) : (
              <span className="success-pill">Current</span>
            )}
          </li>
          {listUsers().map((item) => {
            const current = user?.id === item.id
            const firstOrg = membershipsFor(item.id)[0]
            return (
              <li key={item.id} className={current ? 'current' : ''}>
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted small">{roleSummary(item, orgName)}</span>
                </div>
                <div className="inline-actions">
                  {current ? (
                    <>
                      <span className="success-pill">Current</span>
                      {item.platformAdmin ? (
                        <Link to="/admin" className="btn btn-outline btn-sm">
                          Platform admin
                        </Link>
                      ) : null}
                      {firstOrg ? (
                        <Link to={`/workspace/${firstOrg.organizationId}/overview`} className="btn btn-outline btn-sm">
                          Open workspace
                        </Link>
                      ) : null}
                      {merchantAccessFor(item.id).length > 0 ? (
                        <Link to="/merchant" className="btn btn-outline btn-sm">
                          Merchant portal
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => switchIdentity(item.id)}>
                      Act as {item.name.split(' ')[0]}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <form
          className="inline-actions"
          onSubmit={(event) => {
            event.preventDefault()
            try {
              const created = createDemoUser(name)
              setName('')
              setError('')
              switchIdentity(created.id)
            } catch (problem) {
              setError(problem instanceof Error ? problem.message : 'Could not create that identity.')
            }
          }}
        >
          <label className="sr-only" htmlFor="new-identity">
            New demo identity name
          </label>
          <input id="new-identity" value={name} maxLength={60} placeholder="New supporter identity name" onChange={(event) => setName(event.target.value)} />
          <button type="submit" className="btn btn-outline btn-sm">
            Create and act as
          </button>
        </form>
        <p className="muted small">New identities start as Supporters. Only an Organization Admin can add them to an organization; nobody can promote themselves.</p>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </div>
  )
}
