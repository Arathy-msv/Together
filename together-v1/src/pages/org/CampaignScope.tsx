import { Outlet, useParams } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { setDisplayCurrency } from '../../lib/format.ts'
import { OrgNotFound } from './OrgNotFound.tsx'

/**
 * Guards every campaign route: the campaign must exist and belong to the organization in the URL.
 * It also sets the display currency to the campaign's own currency for the screens below.
 */
export function CampaignScope() {
  const { id = '' } = useParams()
  const { org } = useOrg()
  const store = useDemoStore()
  const campaign = store.campaigns.find((item) => item.id === id)
  if (!campaign || campaign.organizationId !== org.id) return <OrgNotFound kind="campaign" />
  setDisplayCurrency(campaign.currency)
  return <Outlet />
}
