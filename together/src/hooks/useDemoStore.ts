import { useEffect, useMemo, useState } from 'react'
import { toView } from '../lib/campaigns.ts'
import { loadStore, subscribe } from '../lib/storage.ts'
import type { CampaignView, DemoStore } from '../lib/types.ts'

export function useDemoStore(): DemoStore {
  const [store, setStore] = useState<DemoStore>(() => loadStore())
  useEffect(() => subscribe(() => setStore(loadStore())), [])
  return store
}

export function useCampaignViews(): CampaignView[] {
  const store = useDemoStore()
  return useMemo(
    () => store.campaigns.map((campaign) => toView(campaign, store.contributions)),
    [store],
  )
}

export function useCampaignView(id: string | undefined): CampaignView | undefined {
  const store = useDemoStore()
  return useMemo(() => {
    if (!id) return undefined
    const campaign = store.campaigns.find((item) => item.id === id)
    if (!campaign) return undefined
    return toView(campaign, store.contributions)
  }, [store, id])
}
