import { useId } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { membershipsFor } from '../../lib/identity.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'

const WORKSPACE_SECTIONS = ['website', 'settings', 'plan', 'assistant', 'campaigns', 'features']

/**
 * Demo control for jumping between the workspaces this demo identity is a member of. Lives only in the
 * workspace (manage site) chrome — an organization's public website never reveals that other
 * organizations exist in this demo, so this is intentionally not shown there.
 */
export function OrgSwitcher({ currentId }: { currentId: string }) {
  const user = useCurrentUser()
  const memberOf = new Set(membershipsFor(user?.id).map((item) => item.organizationId))
  const organizations = useOrganizations().filter((org) => memberOf.has(org.id))
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const id = useId()

  if (organizations.length < 2) return null
  return (
    <div className="org-switcher">
      <label htmlFor={id}>Switch organization</label>
      <select
        id={id}
        value={currentId}
        onChange={(event) => {
          const next = organizations.find((org) => org.id === event.target.value)
          if (!next) return
          if (document.querySelector('.save-state.dirty') && !window.confirm('Switch organization and discard unsaved edits?')) return
          setActiveOrgId(next.id)
          const section = pathname.split('/')[3] ?? 'overview'
          navigate(next.website.status === 'setup' ? `/start/${next.id}` : `/workspace/${next.id}/${WORKSPACE_SECTIONS.includes(section) ? section : 'overview'}`)
        }}
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {(org.website.draft?.name || org.name || 'Untitled organization') + (org.website.status === 'setup' ? ' (setup)' : '')}
          </option>
        ))}
      </select>
    </div>
  )
}
