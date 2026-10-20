import { Link } from 'react-router-dom'
import { campaignCoverSrc } from '../../data/covers.ts'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { formatMoney } from '../../lib/format.ts'
import { orgInitials } from '../../lib/organizations.ts'
import { isMyReferral, referralTotals, shareWorkspacePath } from '../../lib/referrals.ts'
import type { Campaign, CampaignView, Referral } from '../../lib/types.ts'
import { useOrg } from '../org/OrgContext.tsx'
import { SafeImage } from '../campaign/PublicSections.tsx'

export function ReferrerAvatar({ referral, size = 56 }: { referral: Pick<Referral, 'displayName' | 'avatarData'>; size?: number }) {
  return (
    <span className="referrer-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {referral.avatarData ? <img src={referral.avatarData} alt="" /> : orgInitials(referral.displayName || 'A')}
    </span>
  )
}

/** "My sharing goal" is separate from — and never added to — the campaign goal. */
export function SharingGoal({ referral, campaign }: { referral: Referral; campaign: Campaign }) {
  const store = useDemoStore()
  const totals = referralTotals(referral, store.contributions)
  return (
    <div className="sharing-goal">
      <span className="eyebrow-label">{referral.personalTarget ? 'My sharing goal' : 'Raised through this sharing page'}</span>
      <div className="money-row">
        <span>
          <strong>{formatMoney(totals.amount, campaign.currency)}</strong>
          {referral.personalTarget ? ` of ${formatMoney(referral.personalTarget, campaign.currency)}` : ''}
        </span>
        {totals.percent !== null ? <strong>{totals.percent}%</strong> : null}
      </div>
      {totals.percent !== null ? (
        <span className="sharing-bar" aria-hidden="true">
          <i style={{ width: `${totals.percent}%` }} />
        </span>
      ) : null}
      <span className="muted small">
        {totals.count === 1 ? '1 confirmed simulated contribution' : `${totals.count} confirmed simulated contributions`} credited to this page. These are part
        of the campaign total, not extra to it.
      </span>
    </div>
  )
}

/** Personal introduction at the top of a sharing page. Campaign facts are rendered separately, unchanged. */
export function ReferralIntro({ referral, view, preview = false }: { referral: Referral; view: CampaignView; preview?: boolean }) {
  const { base } = useOrg()
  const cover = referral.coverImage || campaignCoverSrc(view.campaign)
  return (
    <section className="referral-hero" aria-label={`Shared by ${referral.displayName}`}>
      <div className="referral-media">
        <SafeImage src={cover} alt="" />
      </div>
      <div className="referral-copy">
        <div className="shared-by">
          <ReferrerAvatar referral={referral} />
          <span>
            <span className="eyebrow-label">Shared by</span>
            <strong>{referral.displayName}</strong>
          </span>
        </div>
        <h2>{referral.headline}</h2>
        <figure className="referral-message">
          <figcaption className="eyebrow-label">Why I support this campaign</figcaption>
          <blockquote>{referral.message}</blockquote>
        </figure>
        <SharingGoal referral={referral} campaign={view.campaign} />
        <p className="muted small">
          This is {referral.displayName}’s personal introduction. The campaign story, goal, organizer, updates and fund use below come from the original
          campaign and cannot be changed by people who share it.
        </p>
        {!preview && isMyReferral(referral.id) ? (
          <Link to={shareWorkspacePath(base, view.campaign.id, referral.code)} className="link-button small">
            Edit my sharing page (demo control)
          </Link>
        ) : null}
      </div>
    </section>
  )
}
