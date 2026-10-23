import { useNavigate } from 'react-router-dom'
import { seededOrganization } from '../data/organizations.ts'
import { createOrganization, loadOrganizations } from '../lib/orgStorage.ts'
import { currentUser } from '../lib/identity.ts'
import { ownsSetup } from '../lib/permissions.ts'
import type { PlanId } from '../lib/types.ts'

/**
 * "Create your website": resumes a setup the visitor started on this device, otherwise starts a new
 * organization on the default demo plan (changeable later in Settings). The seeded example setup is
 * only offered from "Continue a setup", so first-time visitors start fresh.
 */
export function useStartWebsite() {
  const navigate = useNavigate()
  return (plan: PlanId = 'community', { forceNew = false } = {}) => {
    const unfinished = loadOrganizations().filter((org) => org.website.status === 'setup' && !seededOrganization(org.id) && ownsSetup(currentUser(), org.id))
    if (!forceNew && unfinished.length === 1) {
      navigate(`/start/${unfinished[0].id}`)
      return
    }
    if (!forceNew && unfinished.length > 1) {
      navigate('/start')
      return
    }
    try {
      const org = createOrganization(plan)
      navigate(`/start/${org.id}`)
    } catch {
      navigate('/start')
    }
  }
}
