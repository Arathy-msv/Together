import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CampaignCover } from '../components/CampaignImage.tsx'
import { Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { campaignPlayPath, goalReached } from '../lib/campaigns.ts'
import { useOrg, useOrgBase } from '../components/org/OrgContext.tsx'
import { rememberContribution } from './org/SupporterHistory.tsx'
import { useSupporterId } from '../hooks/useIdentity.ts'
import { ContributionRewards } from './org/PartnerOffersPublic.tsx'
import { GoalGesture } from '../components/GoalGesture.tsx'
import { formatDate, formatDateTime, formatINR } from '../lib/format.ts'
import { useCampaignBackPath } from '../hooks/useBackPath.ts'
import { followedAt, setFollowing } from '../lib/follows.ts'
import { updatesSince } from '../lib/transparency.ts'
import { jacketColorFromDetail, jacketImage } from '../lib/warmth.ts'
import { NotFoundPage } from './NotFound.tsx'

export function SuccessPage() {
  const { id = '', contributionId = '' } = useParams()
  const view = useCampaignView(id)
  const base = useOrgBase()
  const { org } = useOrg()
  const store = useDemoStore()
  const backPath = useCampaignBackPath(id)
  const [following, setFollowingState] = useState(() => Boolean(followedAt(id)))
  const supporterId = useSupporterId()
  const found = store.contributions.find((item) => item.id === contributionId && item.campaignId === id)
  // Receipts are private: only the supporter who made the contribution may open it. Earlier demo data has no owner.
  const contribution = found && (!found.supporterId || found.supporterId === supporterId) ? found : undefined

  useEffect(() => {
    document.title = 'Contribution successful — Together'
  }, [])

  useEffect(() => {
    if (contribution) rememberContribution(org.id, contribution.id)
  }, [org.id, contribution])

  if (!view) return <NotFoundPage />
  if (!contribution) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>We couldn’t find that contribution</h1>
          <p className="muted">
            {found ? 'This receipt belongs to another demo supporter. Switch back to the identity that made it to view it.' : 'It may belong to another browser, or the demo data was reset.'}
          </p>
          <Link to={backPath} className="btn btn-primary">
            Back to campaign
          </Link>
        </div>
      </div>
    )
  }

  const creditedReferral = contribution.referralId ? store.referrals.find((item) => item.id === contribution.referralId) : undefined
  const since = updatesSince(store, view.campaign.id, contribution.createdAt)
  const exactPercent = view.campaign.goalAmount > 0 ? Math.min(100, (view.raised / view.campaign.goalAmount) * 100) : 0
  const finished = goalReached(view.raised, view.campaign.goalAmount)
  const jacketColor =
    contribution.method === 'game' && view.campaign.gameType === 'jacket' ? jacketColorFromDetail(contribution.detail) : null

  return (
    <div className="container narrow page-pad success">
      {finished ? (
        <GoalGesture
          variant="banner"
          campaignTitle={view.campaign.title}
          goal={view.campaign.goalAmount}
          gift={contribution.amount}
          resting="The game rests here. Thank you for helping it grow."
        />
      ) : null}
      <div className="success-check">
        <Icon name="check" size={40} />
      </div>
      <h1 className="center">Thank you for supporting {view.campaign.title}.</h1>
      <p className="center">
        <span className="success-pill">Contribution successful</span>
      </p>
      {jacketColor ? (
        <img
          className="success-jacket"
          src={jacketImage(jacketColor, 'folded')}
          alt={`Your ${jacketColor} jacket, folded and tied with a ribbon`}
        />
      ) : null}
      <section className="panel receipt-card">
        <div className="receipt-top">
          <CampaignCover campaign={view.campaign} />
          <div>
            <span className="eyebrow-label">Campaign</span>
            <h2>{view.campaign.title}</h2>
            <div className="receipt-facts">
              <div>
                <span className="eyebrow-label">Amount</span>
                <strong>{formatINR(contribution.amount)}</strong>
              </div>
              <div>
                <span className="eyebrow-label">Reference</span>
                <strong>{contribution.reference}</strong>
              </div>
            </div>
          </div>
        </div>
        {contribution.detail ? <p className="muted small">{contribution.detail}</p> : null}
        {creditedReferral ? (
          <p className="referral-credit">
            Credited to <strong>{creditedReferral.displayName}’s sharing page</strong>. Your contribution went to the original campaign and is counted once.
          </p>
        ) : null}
        <div className="divider" />
        <div className="money-row big">
          <span>
            <strong>{formatINR(view.raised)}</strong> of {formatINR(view.campaign.goalAmount)}
          </span>
          <strong>{Number.isInteger(exactPercent) ? exactPercent : exactPercent.toFixed(1)}%</strong>
        </div>
        <ProgressBar value={exactPercent} tone="gold" />
        <p className="muted small">{view.supporters === 1 ? '1 simulated contribution' : `${view.supporters} simulated contributions`}</p>
      </section>
      <ContributionRewards campaign={view.campaign} contribution={contribution} />
      <section className="panel since-card" aria-labelledby="since-title">
        <h2 id="since-title">Updates since your contribution</h2>
        {since.length === 0 ? (
          <p className="muted small">No updates yet since {formatDateTime(contribution.createdAt)}. Organizers post milestones, spending and photos on the campaign’s Updates tab.</p>
        ) : (
          <ul className="plain-list">
            {since.map((update) => (
              <li key={update.id}>
                <strong>{update.title}</strong> <span className="muted small">· {formatDate(update.date)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="inline-actions">
          <Link to={`${backPath}${backPath.includes('?') ? '&' : '?'}tab=updates`} className="btn btn-outline btn-sm">
            See campaign updates
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            aria-pressed={following}
            onClick={() => {
              if (setFollowing(view.campaign.id, !following)) setFollowingState(!following)
            }}
          >
            {following ? 'Following on this device' : 'Follow updates on this device'}
          </button>
        </div>
        <p className="muted small">Following is a local bookmark in this browser. No emails or notifications are sent.</p>
      </section>
      <div className="center-actions">
        {contribution.method === 'game' && view.campaign.participation.game && !finished ? (
          <Link to={campaignPlayPath(view.campaign.id, view.campaign.gameType, base)} className="btn btn-primary btn-lg">
            Keep playing
          </Link>
        ) : null}
        <Link
          to={backPath}
          className={contribution.method === 'game' ? 'btn btn-outline btn-lg' : 'btn btn-primary btn-lg'}
        >
          Back to campaign
        </Link>
        <Link to={base || '/'} className="btn btn-outline btn-lg">
          Return home
        </Link>
      </div>
      <p className="muted small center">Saved in this browser as local demo data. No real money was collected. Your completed game progress is kept, and only new actions start a new suggestion.</p>
    </div>
  )
}
