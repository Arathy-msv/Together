import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useStartWebsite } from '../../hooks/useStartWebsite.ts'
import { membership, ROLE_LABEL } from '../../lib/identity.ts'
import { orgBase, orgTypeLabel } from '../../lib/organizations.ts'
import { demoPlan } from '../../lib/plans.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { previewOrganization, websiteStatusLabel, workspacePath } from '../../lib/website.ts'

/** /workspace — demo entry point for choosing an organization workspace. Not a sign-in. */
export function WorkspaceEntryPage() {
  const user = useCurrentUser()
  const startWebsite = useStartWebsite()
  const organizations = useOrganizations().filter((org) => user && membership(user.id, org.id))

  useEffect(() => {
    document.title = 'Demo workspace — Together'
  }, [])

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo control</span> Simulated identities — not secure access control
          </p>
          <h1>Your workspaces</h1>
          <p className="muted">
            {user
              ? `Organizations where ${user.name} is a member. In a real product this would require signing in.`
              : 'You are browsing as a guest. Choose a demo identity above to manage an organization.'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => startWebsite()}>
          Create your organization website
        </button>
      </header>
      {organizations.length === 0 ? (
        <div className="panel empty">
          <h2>No workspaces for this identity</h2>
          <p className="muted">Switch to an Organization Admin or Campaign Organizer demo identity, or create a new organization website.</p>
          <Link to="/demo-identities" className="btn btn-outline">
            Choose a demo identity
          </Link>
        </div>
      ) : null}
      <ul className="workspace-cards">
        {organizations.map((stored) => {
          const org = previewOrganization(stored)
          const setup = stored.website.status === 'setup'
          return (
            <li key={org.id} className="panel">
              <div className="example-brand">
                <OrgLogoMark org={org} size={44} />
                <div>
                  <strong>{org.name || 'Untitled organization'}</strong>
                  <span className="muted small">
                    {orgTypeLabel(org.type)} · {demoPlan(org.plan.id).name} · you: {ROLE_LABEL[membership(user!.id, org.id)!.role]}
                  </span>
                </div>
              </div>
              <span className={`status-pill ${stored.website.status}`}>{websiteStatusLabel(stored)}</span>
              <div className="inline-actions">
                <Link
                  to={setup ? `/start/${org.id}` : workspacePath(org)}
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveOrgId(org.id)}
                >
                  {setup ? 'Continue setup' : 'Open workspace'}
                </Link>
                {stored.website.status === 'published' ? (
                  <a href={orgBase(org.slug)} className="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer">
                    Visit website
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
