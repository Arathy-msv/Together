import { useNavigate } from 'react-router-dom'
import { createOrganization, loadOrganizations } from '../lib/orgStorage.ts'
import type { PlanId } from '../lib/types.ts'

/**
 * "Create your website": resumes an unfinished setup on this device if there is one, otherwise
 * starts a new organization on the default demo plan (changeable later in Settings).
 */
export function useStartWebsite() {
  const navigate = useNavigate()
  return (plan: PlanId = 'community', { forceNew = false } = {}) => {
    if (!forceNew && loadOrganizations().some((org) => org.website.status === 'setup')) {
      navigate('/start')
      return
    }
    try {
      const org = createOrganization(plan)
      navigate(`/start/${org.id}`)
    } catch {
      navigate('/plans')
    }
  }
}
