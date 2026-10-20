import { Navigate, useLocation, useParams } from 'react-router-dom'
import { orgBase } from '../../lib/organizations.ts'
import { activeOrganization, findOrganization } from '../../lib/orgStorage.ts'
import { loadStore } from '../../lib/storage.ts'

/** Pre-platform public URLs (/explore) go to the demo organization's own website. */
export function LegacyPublicRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${orgBase(activeOrganization().slug)}${to}${search}${hash}`} replace />
}

/** Pre-platform organizer URLs (/dashboard, /create) go to the demo organization's workspace. */
export function LegacyWorkspaceRedirect({ section }: { section: string }) {
  const { search } = useLocation()
  return <Navigate to={`/workspace/${activeOrganization().id}/${section}${search}`} replace />
}

/** Old campaign links (/campaigns/:id/...) keep working by redirecting to the campaign's organization website. */
export function LegacyCampaignRedirect() {
  const { id = '' } = useParams()
  const { pathname, search, hash } = useLocation()
  const campaign = loadStore().campaigns.find((item) => item.id === id)
  const org = (campaign && findOrganization(campaign.organizationId)) || activeOrganization()
  return <Navigate to={`${orgBase(org.slug)}${pathname}${search}${hash}`} replace />
}
