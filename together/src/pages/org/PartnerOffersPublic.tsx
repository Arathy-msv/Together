import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser, useSupporterId } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { campaignDetailsPath } from '../../lib/campaigns.ts'
import { canUseFeature, capabilityName } from '../../lib/features.ts'
import { formatDate, formatMoney } from '../../lib/format.ts'
import type { Campaign, Contribution } from '../../lib/types.ts'
import {
  campaignOffers,
  campaignsForOffer,
  claimContributionReward,
  claimOnlineOffer,
  holderVouchers,
  merchantFor,
  offerIsLive,
  offerValueLine,
  publicOffers,
  purchaseStoreValue,
  type IssuedVoucher,
  type PartnerOffer,
} from '../../lib/vouchers.ts'
import { OrgNotFound } from './OrgNotFound.tsx'
import { VoucherCard, voucherState } from '../../components/vouchers/VoucherCard.tsx'

function stockLine(offer: PartnerOffer): string {
  return offer.stock === null ? 'Available while the offer runs' : `${offer.stock} left`
}

function OfferFacts({ offer }: { offer: PartnerOffer }) {
  const { org } = useOrg()
  const store = useVoucherStore()
  return (
    <dl className="offer-facts">
      <div>
        <dt>Partner store</dt>
        <dd>{merchantFor(store, org.id, offer.merchantId)?.name ?? 'Partner store'}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{capabilityName(offer.capability)}</dd>
      </div>
      <div>
        <dt>{offer.capability === 'storeValueVouchers' ? 'Price and benefit' : 'Offer'}</dt>
        <dd>{offerValueLine(offer)}</dd>
      </div>
      <div>
        <dt>Valid until</dt>
        <dd>{formatDate(offer.validUntil)}</dd>
      </div>
      <div>
        <dt>Availability</dt>
        <dd>{stockLine(offer)}</dd>
      </div>
    </dl>
  )
}

/** Online offer: claim it into the wallet for a specific campaign, then show the partner code or link. */
function OnlineOfferAction({ offer, campaignId }: { offer: PartnerOffer; campaignId: string }) {
  const { org } = useOrg()
  const [voucher, setVoucher] = useState<IssuedVoucher | null>(null)
  const [error, setError] = useState('')
  if (voucher) {
    return (
      <div className="offer-claimed" role="status">
        {voucher.discountCode ? (
          <p>
            Partner code: <code>{voucher.discountCode}</code>
          </p>
        ) : null}
        {voucher.shopUrl ? (
          <a href={voucher.shopUrl} target="_blank" rel="noopener noreferrer">
            Open the partner’s approved shop link<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
        <p className="muted small">Saved in My vouchers on this device.</p>
      </div>
    )
  }
  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => {
          try {
            setVoucher(claimOnlineOffer(org, offer.id, campaignId))
            setError('')
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'This offer is not available.')
          }
        }}
      >
        Get this offer
      </button>
      {error ? <p className="error-text small">{error}</p> : null}
    </>
  )
}

/** Partner offers on one campaign page. Renders nothing when the campaign has no live offers. */
export function CampaignPartnerOffers({ campaign }: { campaign: Campaign }) {
  const { org, base } = useOrg()
  const store = useVoucherStore()
  const offers = campaignOffers(org, store, campaign)
  if (offers.length === 0) return null
  return (
    <div className="panel aside-card partner-offers-card">
      <h2 className="aside-title">Partner offers</h2>
      <p className="muted small">From participating local stores. Simulated in this demo.</p>
      <ul className="partner-offer-list">
        {offers.map((offer) => (
          <li key={offer.id}>
            <strong>{offer.title}</strong>
            <OfferFacts offer={offer} />
            {offer.capability === 'contributionRewards' ? (
              <p className="small">Contribute {formatMoney(offer.minContribution ?? 0, offer.currency)} or more to this campaign and claim it on your confirmation screen.</p>
            ) : null}
            {offer.capability === 'storeValueVouchers' ? (
              <Link to={`${base}/offers/${offer.id}/buy?campaign=${campaign.id}`} className="btn btn-outline btn-sm">
                Buy store credit
              </Link>
            ) : null}
            {offer.capability === 'onlineOffers' ? <OnlineOfferAction offer={offer} campaignId={campaign.id} /> : null}
            <details>
              <summary>Terms</summary>
              <p className="small">{offer.terms}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Contribution rewards a confirmed contribution qualifies for, shown on the confirmation screen. */
export function ContributionRewards({ campaign, contribution }: { campaign: Campaign; contribution: Contribution }) {
  const { org, base } = useOrg()
  const store = useVoucherStore()
  const [error, setError] = useState('')
  const offers = campaignOffers(org, store, campaign).filter(
    (offer) => offer.capability === 'contributionRewards' && contribution.amount >= (offer.minContribution ?? 0),
  )
  const claimed = store.vouchers.filter((voucher) => voucher.contributionId === contribution.id && voucher.organizationId === org.id)
  const unclaimed = offers.filter((offer) => !claimed.some((voucher) => voucher.offerId === offer.id))
  if (offers.length === 0 && claimed.length === 0) return null
  return (
    <section className="panel partner-reward" aria-labelledby="reward-title">
      <h2 id="reward-title">Your partner reward</h2>
      {claimed.map((voucher) => (
        <p key={voucher.id}>
          <strong>{voucher.title}</strong> — {voucher.rewardText}. Code <code>{voucher.code}</code>, valid until {formatDate(voucher.validUntil)}.{' '}
          <Link to={`${base}/my-vouchers`}>Open My vouchers</Link>
        </p>
      ))}
      {unclaimed.map((offer) => (
        <div key={offer.id} className="inline-actions">
          <span>
            <strong>{offer.title}</strong> — {offer.rewardText}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              try {
                claimContributionReward(org, offer.id, contribution.id)
                setError('')
              } catch (problem) {
                setError(problem instanceof Error ? problem.message : 'This reward is not available.')
              }
            }}
          >
            Claim reward
          </button>
        </div>
      ))}
      {error ? <p className="error-text small">{error}</p> : null}
    </section>
  )
}

/** /o/:slug/offers — only exists when the organization has live, campaign-assigned offers. */
export function PublicOffersPage() {
  const { org, base } = useOrg()
  const store = useVoucherStore()
  const demo = useDemoStore()
  const offers = publicOffers(org, store, demo)

  useEffect(() => {
    document.title = `Partner offers — ${org.name}`
  }, [org.name])

  if (offers.length === 0) return <OrgNotFound kind="page" />
  return (
    <div className="container page-pad">
      <h1>Partner offers</h1>
      <p className="muted">Local stores supporting {org.name}’s campaigns. Every offer names the campaign it supports. Simulated in this demo — no real money changes hands.</p>
      <ul className="partner-offer-grid">
        {offers.map((offer) => {
          const campaigns = campaignsForOffer(org, offer, demo, store)
          return (
            <li key={offer.id} className="panel">
              <h2>{offer.title}</h2>
              <OfferFacts offer={offer} />
              <p className="small">
                Supports: {campaigns.map((campaign, index) => (
                  <span key={campaign.id}>
                    {index > 0 ? ', ' : ''}
                    <Link to={campaignDetailsPath(campaign.id, base)}>{campaign.title}</Link>
                  </span>
                ))}
              </p>
              {offer.capability === 'storeValueVouchers' ? (
                <Link to={`${base}/offers/${offer.id}/buy`} className="btn btn-primary btn-sm">
                  Buy store credit
                </Link>
              ) : null}
              {offer.capability === 'contributionRewards' ? <p className="small">Contribute to one of these campaigns to receive this offer.</p> : null}
              {offer.capability === 'onlineOffers' ? <OnlineOfferPicker offer={offer} campaigns={campaigns} /> : null}
              <details>
                <summary>Terms</summary>
                <p className="small">{offer.terms}</p>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OnlineOfferPicker({ offer, campaigns }: { offer: PartnerOffer; campaigns: Campaign[] }) {
  const [campaignId, setCampaignId] = useState(campaigns.length === 1 ? campaigns[0].id : '')
  return (
    <div className="stack-form">
      {campaigns.length > 1 ? (
        <label className="field">
          <span className="field-label">Campaign this supports</span>
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            <option value="">Choose a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {campaignId ? <OnlineOfferAction key={campaignId} offer={offer} campaignId={campaignId} /> : <p className="muted small">Choose a campaign first.</p>}
    </div>
  )
}

/** /o/:slug/offers/:offerId/buy — simulated store-credit purchase. The campaign must be chosen. */
export function StoreValuePurchasePage() {
  const { offerId = '' } = useParams()
  const [params] = useSearchParams()
  const { org, base } = useOrg()
  const store = useVoucherStore()
  const demo = useDemoStore()
  const offer = store.offers.find((item) => item.id === offerId && item.organizationId === org.id)
  const campaigns = offer ? campaignsForOffer(org, offer, demo, store) : []
  const requested = params.get('campaign') ?? ''
  const [campaignId, setCampaignId] = useState(campaigns.some((item) => item.id === requested) ? requested : '')
  const [voucher, setVoucher] = useState<IssuedVoucher | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `Buy store credit — ${org.name}`
  }, [org.name])

  if (voucher) {
    return (
      <div className="container narrow page-pad">
        <section className="panel" aria-labelledby="bought-title">
          <span className="success-pill">Simulated purchase complete</span>
          <h1 id="bought-title">{voucher.title}</h1>
          <p>
            Store credit {formatMoney(voucher.balance ?? 0, voucher.currency)} · code <code>{voucher.code}</code> · valid until {formatDate(voucher.validUntil)}.
          </p>
          <p className="muted small">
            {formatMoney(voucher.campaignBenefit ?? 0, voucher.currency)} of your {formatMoney(voucher.pricePaid ?? 0, voucher.currency)} supports “
            {demo.campaigns.find((item) => item.id === voucher.campaignId)?.title}”. It is recorded as a pending merchant benefit and is not added to the campaign total until
            the store passes it on. No real money was collected.
          </p>
          <div className="inline-actions">
            <Link to={`${base}/my-vouchers`} className="btn btn-primary">
              Open My vouchers
            </Link>
            <Link to={campaignDetailsPath(voucher.campaignId, base)} className="btn btn-outline">
              Back to campaign
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!offer || offer.capability !== 'storeValueVouchers' || !offerIsLive(org, offer, store) || campaigns.length === 0) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>This offer isn’t available</h1>
          <p className="muted">It may have ended, sold out, or been paused. Vouchers you already hold stay in My vouchers.</p>
          <Link to={base} className="btn btn-primary">
            Back to {org.name}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container narrow page-pad">
      <h1>Buy store credit</h1>
      <section className="panel">
        <h2>{offer.title}</h2>
        <OfferFacts offer={offer} />
        <details>
          <summary>Terms</summary>
          <p className="small">{offer.terms}</p>
        </details>
      </section>
      <section className="panel stack-form">
        <label className="field">
          <span className="field-label">Campaign this purchase supports</span>
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-invalid={Boolean(error && !campaignId)}>
            <option value="">Choose a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </label>
        {campaignId ? (
          <p className="small">
            You pay {formatMoney(offer.price ?? 0, offer.currency)} and get {formatMoney(offer.storeValue ?? 0, offer.currency)} store credit.{' '}
            {formatMoney(offer.campaignShare ?? 0, offer.currency)} supports “{campaigns.find((item) => item.id === campaignId)?.title}”.
          </p>
        ) : null}
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            if (!campaignId) {
              setError('Choose which campaign this purchase supports.')
              return
            }
            try {
              setVoucher(purchaseStoreValue(org, offer.id, campaignId))
            } catch (problem) {
              setError(problem instanceof Error ? problem.message : 'This purchase could not be completed.')
            }
          }}
        >
          Confirm simulated purchase — {formatMoney(offer.price ?? 0, offer.currency)}
        </button>
        <p className="muted small">No payment details required. No real money is collected.</p>
      </section>
    </div>
  )
}

/** Holder-scoped list of vouchers for this organization. */
export function VoucherList({ vouchers }: { vouchers: IssuedVoucher[] }) {
  const { org, base } = useOrg()
  const demo = useDemoStore()
  const store = useVoucherStore()
  if (vouchers.length === 0) return <p className="awaiting">No vouchers for this supporter profile yet.</p>
  const order = { ready: 0, partial: 1, used: 2, expired: 3, cancelled: 4 }
  const sorted = [...vouchers].sort((a, b) => order[voucherState(a)] - order[voucherState(b)])
  return (
    <ul className="voucher-grid">
      {sorted.map((voucher) => {
        const campaign = demo.campaigns.find((item) => item.id === voucher.campaignId && item.organizationId === org.id)
        return (
          <VoucherCard
            key={voucher.id}
            voucher={voucher}
            storeName={merchantFor(store, org.id, voucher.merchantId)?.name ?? 'Partner store'}
            campaign={campaign ? { title: campaign.title, href: campaignDetailsPath(campaign.id, base) } : undefined}
          />
        )
      })}
    </ul>
  )
}

/**
 * /o/:slug/my-vouchers — always reachable for holders, even when the organization has stopped
 * offering vouchers, supporter history is off, or the campaign has finished.
 */
export function VoucherWalletPage() {
  const { org, base } = useOrg()
  const store = useVoucherStore()
  const user = useCurrentUser()
  const supporterId = useSupporterId()
  const mine = holderVouchers(store, org.id, supporterId)

  useEffect(() => {
    document.title = `My vouchers — ${org.name}`
  }, [org.name])

  return (
    <div className="container narrow page-pad">
      <Link to={base} className="back-link page-back">
        ← Back to {org.name}
      </Link>
      <h1>My vouchers</h1>
      <p className="muted">
        Partner vouchers from {org.name} for {user ? user.name : 'the guest visitor on this device'}. Only this demo identity can see them; other devices
        cannot see them at all.
      </p>
      <VoucherList vouchers={mine} />
      {canUseFeature(org, 'supporterHistory') ? (
        <p className="small">
          <Link to={`${base}/my-history`}>See your contributions too</Link>
        </p>
      ) : null}
    </div>
  )
}
