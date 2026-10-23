import { Link } from 'react-router-dom'
import { useOrgBase } from '../components/org/OrgContext.tsx'

export function NotFoundPage() {
  const base = useOrgBase()
  return (
    <div className="container narrow page-pad">
      <div className="panel empty">
        <h1>We couldn’t find that page</h1>
        <p className="muted">The link may be mistyped, or the campaign was cleared when demo data was reset.</p>
        <Link to={base || '/'} className="btn btn-primary">
          Return home
        </Link>
      </div>
    </div>
  )
}
