/* "Follow updates on this device" is a local bookmark. Nothing is sent anywhere. */

export const FOLLOWS_KEY = 'together.followed.v1'

export interface FollowedCampaign {
  campaignId: string
  followedAt: string
}

export function listFollowed(): FollowedCampaign[] {
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { campaigns?: unknown }
    if (!Array.isArray(parsed.campaigns)) return []
    return parsed.campaigns.filter(
      (item): item is FollowedCampaign =>
        !!item && typeof item === 'object' && typeof (item as FollowedCampaign).campaignId === 'string' && typeof (item as FollowedCampaign).followedAt === 'string',
    )
  } catch {
    return []
  }
}

export function followedAt(campaignId: string): string | null {
  return listFollowed().find((item) => item.campaignId === campaignId)?.followedAt ?? null
}

/** Returns false when the browser could not store the bookmark. */
export function setFollowing(campaignId: string, following: boolean): boolean {
  const rest = listFollowed().filter((item) => item.campaignId !== campaignId)
  const next = following ? [...rest, { campaignId, followedAt: new Date().toISOString() }] : rest
  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify({ version: 1, campaigns: next }))
    return true
  } catch {
    return false
  }
}
