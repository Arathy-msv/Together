import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser, useSupporterId } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { canUseFeature } from '../../lib/features.ts'
import { holderVouchers } from '../../lib/vouchers.ts'
import { VoucherList } from './PartnerOffersPublic.tsx'
import { formatDateTime, formatMoney } from '../../lib/format.ts'
import { listFollowed } from '../../lib/follows.ts'
import { mySharingPages, ownsReferral, referralPath, shareWorkspacePath } from '../../lib/referrals.ts'
import { updatesSince } from '../../lib/transparency.ts'
import { campaignDetailsPath } from '../../lib/campaigns.ts'

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

/** /o/:slug/my-activity — contributions, followed campaigns and vouchers kept on this device. */
export function SupporterHistoryPage() {
  const { org, base } = useOrg()
  const store = useDemoStore()
  const ids = useMemo(() => readLocalHistory(org.id), [org.id])
  const voucherStore = useVoucherStore()
  const user = useCurrentUser()
  const supporterId = useSupporterId()
  const vouchers = holderVouchers(voucherStore, org.id, supporterId)
  const historyOn = canUseFeature(org, 'supporterHistory')

  useEffect(() => {
    document.title = `My activity — ${org.name}`
  }, [org.name])

  const rows = historyOn
    ? store.contributions
        .filter((item) => ids.includes(item.id) && (!item.supporterId || item.supporterId === supporterId))
        .map((item) => ({ item, campaign: store.campaigns.find((campaign) => campaign.id === item.campaignId) }))
        .filter((row) => row.campaign?.organizationId === org.id)
        .sort((a, b) => Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt))
    : []
  const sharingPages = mySharingPages(org.id)
  const followed = listFollowed()
    .map((follow) => ({ follow, campaign: store.campaigns.find((item) => item.id === follow.campaignId && item.organizationId === org.id && !item.isDraft) }))
    .filter((row): row is { follow: (typeof row)['follow']; campaign: NonNullable<(typeof row)['campaign']> } => Boolean(row.campaign))

  return (
    <div className="container narrow page-pad my-activity">
      <Link to={base} className="back-link page-back">
        ← Back to {org.name}
      </Link>
      <h1>My activity</h1>
      <p className="muted">What you’ve done with {org.name} in this browser. Nothing here leaves this device, and other devices can’t see it.</p>

      <section aria-labelledby="activity-contributions">
        <h2 id="activity-contributions">Contributions</h2>
        {!historyOn ? (
          <p className="muted small">{org.name} doesn’t keep a contribution list on this device. Your receipts were shown after each contribution.</p>
        ) : rows.length === 0 ? (
          <p className="awaiting">
            No contributions saved on this device yet. <Link to={`${base}/campaigns`}>Find a campaign</Link>
          </p>
        ) : (
          <ul className="history-list ws-list">
            {rows.map(({ item, campaign }) => {
              const fresh = campaign ? updatesSince(store, campaign.id, item.createdAt).length : 0
              return (
                <li key={item.id}>
                  <div>
                    <strong>{campaign?.title ?? 'Campaign'}</strong>
                    <span className="muted small">
                      {formatMoney(item.amount, campaign?.currency ?? 'INR')} · {formatDateTime(item.createdAt)} · Simulated
                      {fresh ? ` · ${fresh} new update${fresh === 1 ? '' : 's'} since` : ''}
                    </span>
                  </div>
                  <span className="inline-actions">
                    {fresh ? (
                      <Link to={`${campaignDetailsPath(item.campaignId, base)}?tab=updates`} className="btn btn-primary btn-sm">
                        See updates
                      </Link>
                    ) : null}
                    <Link to={`${base}/campaigns/${item.campaignId}/success/${item.id}`} className="btn btn-outline btn-sm">
                      Open receipt
                    </Link>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="activity-following">
        <h2 id="activity-following">Following</h2>
        {followed.length === 0 ? (
          <p className="muted small">Campaigns you follow on this device appear here, with any updates posted since.</p>
        ) : (
          <ul className="history-list ws-list">
            {followed.map(({ follow, campaign }) => {
              const fresh = updatesSince(store, campaign.id, follow.followedAt).length
              return (
                <li key={campaign.id}>
                  <div>
                    <strong>{campaign.title}</strong>
                    <span className="muted small">
                      Following since {formatDateTime(follow.followedAt)} · {fresh ? `${fresh} new update${fresh === 1 ? '' : 's'}` : 'No new updates'}
                    </span>
                  </div>
                  <Link to={`${campaignDetailsPath(campaign.id, base)}?tab=updates`} className="btn btn-outline btn-sm">
                    Open updates
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="activity-sharing">
        <h2 id="activity-sharing">Sharing pages</h2>
        <p className="muted small">Pages you created for {org.name}. Opening this list does not create another page.</p>
        {sharingPages.length === 0 ? (
          <p className="awaiting">
            No sharing pages for this supporter yet. <Link to={`${base}/campaigns`}>Choose a campaign</Link> and create one from its share tools.
          </p>
        ) : (
          <ul className="history-list ws-list">
            {sharingPages.map((page) => {
              const campaign = store.campaigns.find((item) => item.id === page.campaignId && item.organizationId === org.id)
              return (
                <li key={page.id}>
                  <div>
                    <strong>{page.displayName}</strong>
                    <span className="muted small">
                      {campaign?.title ?? 'Campaign'} · {page.headline}
                    </span>
                  </div>
                  <span className="inline-actions">
                    <Link to={referralPath(base, page.campaignId, page.code)} className="btn btn-outline btn-sm">
                      Open page
                    </Link>
                    {ownsReferral(page) ? (
                      <Link to={shareWorkspacePath(base, page.campaignId, page.code)} className="btn btn-primary btn-sm">
                        Edit and share
                      </Link>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-vouchers-title">
        <h2 id="history-vouchers-title">Partner vouchers</h2>
        {vouchers.length > 0 ? (
          <>
            <p className="muted small">For {user ? user.name : 'the guest visitor on this device'}.</p>
            <VoucherList vouchers={vouchers} />
          </>
        ) : (
          <p className="muted small">No vouchers for this supporter profile yet.</p>
        )}
      </section>
    </div>
  )
}
