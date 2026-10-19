import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page narrow empty-state">
      <h1>That page is not in this demo</h1>
      <p>The link may be mistyped, or the campaign was cleared when demo data was reset.</p>
      <Link to="/" className="btn btn-primary">
        Return home
      </Link>
    </div>
  )
}
