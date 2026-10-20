import { useEffect, useMemo, useState } from 'react'
import { useOptionalOrg } from '../components/org/OrgContext.tsx'
import { toView } from '../lib/campaigns.ts'
import { effectiveParticipation } from '../lib/organizations.ts'
import { loadStore, subscribe } from '../lib/storage.ts'
import type { Campaign, CampaignView, DemoStore, Organization } from '../lib/types.ts'

export function useDemoStore(): DemoStore {
  const [store, setStore] = useState<DemoStore>(() => loadStore())
  useEffect(() => subscribe(() => setStore(loadStore())), [])
  return store
}

/** Applies organization visibility (hidden games or direct giving) to what supporters see. */
function withOrgRules(campaign: Campaign, org: Organization | null): Campaign {
  const participation = effectiveParticipation(campaign, org)
  if (participation === campaign.participation) return campaign
  return { ...campaign, participation }
}

/** Campaign views for the current organization route (all campaigns outside one). */
export function useCampaignViews(): CampaignView[] {
  const store = useDemoStore()
  const org = useOptionalOrg()?.org ?? null
  return useMemo(
    () =>
      store.campaigns
        .filter((campaign) => !org || campaign.organizationId === org.id)
        .map((campaign) => toView(withOrgRules(campaign, org), store.contributions)),
    [store, org],
  )
}

/** One campaign, only if it belongs to the organization in the URL. */
export function useCampaignView(id: string | undefined): CampaignView | undefined {
  const store = useDemoStore()
  const org = useOptionalOrg()?.org ?? null
  return useMemo(() => {
    if (!id) return undefined
    const campaign = store.campaigns.find((item) => item.id === id)
    if (!campaign) return undefined
    if (org && campaign.organizationId !== org.id) return undefined
    return toView(withOrgRules(campaign, org), store.contributions)
  }, [store, id, org])
}
