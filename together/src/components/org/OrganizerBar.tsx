import { useId } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { orgBase, organizerSection, orgTypeLabel } from '../../lib/organizations.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { useOrg } from './OrgContext.tsx'

/** Demo-only switcher. It changes which organization you are viewing; it is not access control. */
export function DemoOrgSwitcher() {
  const { org, base } = useOrg()
  const organizations = useOrganizations()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const id = useId()

  return (
    <div className="org-switcher">
      <label htmlFor={id}>Viewing organization</label>
      <select
        id={id}
        value={org.id}
        onChange={(event) => {
          const next = organizations.find((item) => item.id === event.target.value)
          if (!next) return
          if (document.querySelector('.save-state.dirty') && !window.confirm('Switch organization and discard unsaved brand settings?')) return
          setActiveOrgId(next.id)
          const section = organizerSection(pathname, base) ?? 'dashboard'
          navigate(`${orgBase(next.slug)}/${section === 'create' ? 'create?new=1' : section}`)
        }}
      >
        {organizations.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {orgTypeLabel(item.type)}
          </option>
        ))}
      </select>
    </div>
  )
}

export function OrganizerBar() {
  const { org, base } = useOrg()
  return (
    <div className="organizer-bar" role="region" aria-label="Demo organizer controls">
      <div className="organizer-bar-inner">
        <span className="demo-badge" title="These controls exist for reviewing the demo. They are not secure tenant isolation.">
          Demo organizer controls
        </span>
        <DemoOrgSwitcher />
        <nav className="organizer-links" aria-label="Organizer">
          <NavLink to={`${base}/dashboard`}>Campaigns</NavLink>
          <NavLink to={`${base}/create?new=1`}>Create form</NavLink>
          {org.visibility.assistant ? <NavLink to={`${base}/assistant`}>Campaign assistant</NavLink> : null}
          <NavLink to={`${base}/settings`}>Brand settings</NavLink>
        </nav>
      </div>
    </div>
  )
}
