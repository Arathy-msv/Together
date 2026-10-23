import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { listUsers, roleSummary, switchIdentity } from '../../lib/identity.ts'

/**
 * Demo identity switcher. Clearly labelled as simulated. Used in platform and workspace chrome only,
 * never in an organization’s public navigation. Switching remounts the app, clearing private views.
 */
export function DemoIdentitySwitcher({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser()
  const organizations = useOrganizations()
  const id = useId()
  const orgName = (orgId: string) => organizations.find((org) => org.id === orgId)?.name || 'Untitled organization'
  const users = listUsers()
  return (
    <div className={compact ? 'identity-switcher compact' : 'identity-switcher'}>
      <label htmlFor={id}>
        <span className="demo-badge small-badge">Demo identity</span> <span className="identity-label">Simulated — not a real sign-in</span>
      </label>
      <select
        id={id}
        value={user?.id ?? ''}
        onChange={(event) => {
          switchIdentity(event.target.value || null)
        }}
      >
        <option value="">Guest visitor (Supporter)</option>
        {users.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} — {roleSummary(item, orgName)}
          </option>
        ))}
      </select>
      {!compact ? (
        <Link to="/demo-identities" className="link-button small">
          About demo identities
        </Link>
      ) : null}
    </div>
  )
}
