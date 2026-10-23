import { useOrgBase } from '../components/org/OrgContext.tsx'
import { getShareContext } from '../lib/attribution.ts'
import { campaignDetailsPath } from '../lib/campaigns.ts'
import { referralPath } from '../lib/referrals.ts'
import { useDemoStore } from './useDemoStore.ts'

/** "Back to campaign" returns to the sharing page the supporter came from, if any. */
export function useCampaignBackPath(campaignId: string): string {
  const base = useOrgBase()
  const store = useDemoStore()
  const referralId = getShareContext(campaignId)
  const referral = referralId ? store.referrals.find((item) => item.id === referralId && item.campaignId === campaignId) : undefined
  return referral ? referralPath(base, campaignId, referral.code) : campaignDetailsPath(campaignId, base)
}
