import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { formatDateTime } from '../../lib/format.ts'
import { discardUnfinishedOrganization } from '../../lib/orgStorage.ts'
import { demoPlan } from '../../lib/plans.ts'

/** /start — resume an unfinished organization setup on this device. */
export function StartPage() {
  const unfinished = useOrganizations().filter((org) => org.website.status === 'setup')

  useEffect(() => {
    document.title = 'Continue setup — Together'
  }, [])

  if (unfinished.length === 0) return <Navigate to="/plans" replace />
  return (
    <div className="container narrow page-pad">
      <section className="panel resume-card" aria-labelledby="resume-setup">
        <h1 id="resume-setup">Continue your website setup?</h1>
        <p className="muted">Setup progress is saved on this device. Pick up where you left off, or start another organization.</p>
        <ul className="resume-list">
          {unfinished.map((org) => (
            <li key={org.id}>
              <div className="example-brand">
                <OrgLogoMark org={org.website.draft ?? org} size={36} />
                <div>
                  <strong>{org.website.draft?.name || org.name || 'Untitled organization'}</strong>
                  <span className="muted small">
                    Step {org.onboarding?.step ?? 1} of 6 · {demoPlan(org.plan.id).name} · last saved {formatDateTime(org.website.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="inline-actions">
                <Link to={`/start/${org.id}`} className="btn btn-primary btn-sm">
                  Continue setup
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm(`Discard the unfinished setup for “${org.name || 'Untitled organization'}”?`)) discardUnfinishedOrganization(org.id)
                  }}
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/plans" className="btn btn-outline">
          Start another organization
        </Link>
      </section>
    </div>
  )
}
