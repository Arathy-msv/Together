/*
 * Referral attribution rule: the sharing page used when you begin your contribution receives credit.
 *
 * - Visiting a sharing page sets the "share context" for that campaign; visiting the main campaign
 *   page clears it.
 * - When contribution review begins, the current context is snapshotted against that checkout
 *   (direct donation token, game session id or giving-tree checkout id). Later page visits never
 *   change an existing snapshot.
 * - Only a confirmed contribution stores referralId, so cancelled or failed attempts credit nobody.
 */

const CONTEXT_KEY = 'together.shareContext.v1'
const SNAPSHOT_KEY = 'together.checkoutReferral.v1'

type ContextMap = Record<string, string | null>
type SnapshotMap = Record<string, { campaignId: string; referralId: string | null }>

function read<T extends object>(key: string): T {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : ({} as T)
  } catch {
    return {} as T
  }
}

function write(key: string, value: object): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Without session storage the contribution simply has no referral credit.
  }
}

export function setShareContext(campaignId: string, referralId: string | null): void {
  const map = read<ContextMap>(CONTEXT_KEY)
  map[campaignId] = referralId
  write(CONTEXT_KEY, map)
}

export function getShareContext(campaignId: string): string | null {
  const value = read<ContextMap>(CONTEXT_KEY)[campaignId]
  return typeof value === 'string' ? value : null
}

/** Records which sharing page gets credit for a checkout. Returns the existing snapshot if there is one. */
export function snapshotReferral(checkoutKey: string, campaignId: string): string | undefined {
  const map = read<SnapshotMap>(SNAPSHOT_KEY)
  const existing = map[checkoutKey]
  if (existing && existing.campaignId === campaignId) return existing.referralId ?? undefined
  const referralId = getShareContext(campaignId)
  map[checkoutKey] = { campaignId, referralId }
  write(SNAPSHOT_KEY, map)
  return referralId ?? undefined
}

/** The snapshotted referral for a checkout, without creating one. */
export function checkoutReferral(checkoutKey: string, campaignId: string): string | undefined {
  const existing = read<SnapshotMap>(SNAPSHOT_KEY)[checkoutKey]
  return existing && existing.campaignId === campaignId ? (existing.referralId ?? undefined) : undefined
}
