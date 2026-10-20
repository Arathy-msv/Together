import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="container narrow page-pad">
      <div className="panel empty">
        <h1>We couldn’t find that page</h1>
        <p className="muted">The link may be mistyped, or the campaign was cleared when demo data was reset.</p>
        <Link to="/" className="btn btn-primary">
          Return home
        </Link>
      </div>
    </div>
  )
}
