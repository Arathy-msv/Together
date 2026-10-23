import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useIdentity.ts'

/** Shown when the acting demo identity may not open a page. Explains, never reveals the protected data. */
export function AccessDenied({ reason }: { reason: string }) {
  const user = useCurrentUser()
  return (
    <div className="container narrow page-pad">
      <div className="panel empty" role="alert">
        <h1>You don’t have access to this page</h1>
        <p className="muted">{reason}</p>
        <p className="small">
          Acting as <strong>{user ? user.name : 'a guest visitor'}</strong>. This prototype uses simulated demo identities, not real sign-in.
        </p>
        <Link to="/demo-identities" className="btn btn-primary">
          Switch demo identity
        </Link>
      </div>
    </div>
  )
}
