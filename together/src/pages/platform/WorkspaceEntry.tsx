import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { orgBase, orgTypeLabel } from '../../lib/organizations.ts'
import { demoPlan } from '../../lib/plans.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { previewOrganization, websiteStatusLabel, workspacePath } from '../../lib/website.ts'

/** /workspace — demo entry point for choosing an organization workspace. Not a sign-in. */
export function WorkspaceEntryPage() {
  const organizations = useOrganizations()

  useEffect(() => {
    document.title = 'Demo workspace — Together'
  }, [])

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo control</span> Not secure access control
          </p>
          <h1>Open a demo workspace</h1>
          <p className="muted">Choose an organization to manage. In a real product this would require signing in; here anyone using this browser can open any workspace.</p>
        </div>
        <Link to="/plans" className="btn btn-primary">
          Create your organization website
        </Link>
      </header>
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
                    {orgTypeLabel(org.type)} · {demoPlan(org.plan.id).name}
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
                  <Link to={orgBase(org.slug)} className="btn btn-outline btn-sm">
                    Visit website
                  </Link>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
