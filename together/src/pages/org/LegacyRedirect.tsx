import { Navigate, useLocation, useParams } from 'react-router-dom'
import { orgBase } from '../../lib/organizations.ts'
import { activeOrganization, findOrganization } from '../../lib/orgStorage.ts'
import { loadStore } from '../../lib/storage.ts'

/** Sends pre-organization URLs (/, /explore, /dashboard…) to the matching page of the demo organization. */
export function LegacyRedirect({ to }: { to?: string }) {
  const { pathname, search, hash } = useLocation()
  const org = activeOrganization()
  const path = to ?? pathname
  return <Navigate to={`${orgBase(org.slug)}${path === '/' ? '' : path}${search}${hash}`} replace />
}

/** Old campaign links (/campaigns/:id/...) keep working by redirecting to the campaign's organization. */
export function LegacyCampaignRedirect() {
  const { id = '' } = useParams()
  const { pathname, search, hash } = useLocation()
  const campaign = loadStore().campaigns.find((item) => item.id === id)
  const org = (campaign && findOrganization(campaign.organizationId)) || activeOrganization()
  return <Navigate to={`${orgBase(org.slug)}${pathname}${search}${hash}`} replace />
}
