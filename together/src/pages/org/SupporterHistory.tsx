import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { canUseFeature } from '../../lib/features.ts'
import { formatDateTime, formatMoney } from '../../lib/format.ts'
import { OrgNotFound } from './OrgNotFound.tsx'

const HISTORY_KEY = 'together.supporterHistory.v1'

/** Contributions confirmed on this device for this organization. */
export function readLocalHistory(organizationId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return []
    const list = (parsed as Record<string, unknown>)[organizationId]
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function rememberContribution(organizationId: string, contributionId: string): void {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{}')
    const data = parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {}
    const next = new Set(data[organizationId] ?? [])
    next.add(contributionId)
    data[organizationId] = [...next]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data))
  } catch {
    // History is optional convenience.
  }
}

export function SupporterHistoryPage() {
  const { org, base } = useOrg()
  const store = useDemoStore()
  const ids = useMemo(() => readLocalHistory(org.id), [org.id])

  useEffect(() => {
    document.title = `Your contributions — ${org.name}`
  }, [org.name])

  if (!canUseFeature(org, 'supporterHistory')) return <OrgNotFound kind="page" />

  const rows = store.contributions
    .filter((item) => ids.includes(item.id))
    .map((item) => ({ item, campaign: store.campaigns.find((campaign) => campaign.id === item.campaignId) }))
    .filter((row) => row.campaign?.organizationId === org.id)
    .sort((a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt))

  return (
    <div className="container narrow page-pad">
      <Link to={base} className="back-link page-back">
        ← Back to {org.name}
      </Link>
      <h1>Your impact on this device</h1>
      <p className="muted">Simulated contributions you confirmed in this browser for {org.name}. Other devices cannot see this list.</p>
      {rows.length === 0 ? (
        <p className="awaiting">No contributions saved on this device yet.</p>
      ) : (
        <ul className="history-list ws-list">
          {rows.map(({ item, campaign }) => (
            <li key={item.id}>
              <div>
                <strong>{campaign?.title ?? 'Campaign'}</strong>
                <span className="muted small">
                  {formatMoney(item.amount, campaign?.currency ?? 'INR')} · {formatDateTime(item.createdAt)} · Simulated
                </span>
              </div>
              <Link to={`${base}/campaigns/${item.campaignId}/success/${item.id}`} className="btn btn-outline btn-sm">
                Open receipt
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
