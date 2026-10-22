import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { Select, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { listUsers, merchantStaff, userName } from '../../lib/identity.ts'
import { grantMerchantAccess, revokeMerchantAccess } from '../../lib/members.ts'
import { canUseFeature, canUseVoucherCapability, capabilityName, VOUCHER_CAPABILITIES } from '../../lib/features.ts'
import { CURRENCIES, formatDate, formatDateTime, formatMoney, isCurrencyCode } from '../../lib/format.ts'
import type { CurrencyCode, Organization, VoucherCapability } from '../../lib/types.ts'
import {
  activateOffer,
  addMerchant,
  addMerchantBranch,
  assignOfferToCampaign,
  createOffer,
  isExpired,
  markTermsReviewed,
  merchantFor,
  offerValueLine,
  orgMerchants,
  orgOffers,
  orgVouchers,
  pauseOffer,
  cancelVoucher,
  redeemVoucher,
  settleMerchantBenefit,
  validateOffer,
  type OfferInput,
  type VoucherStore,
} from '../../lib/vouchers.ts'

type Notice = { tone: 'success' | 'error'; text: string } | null

/** Workspace → Partner offers (Give & Get Local). */
export function PartnerOffersPage() {
  const { org, workspace } = useOrg()
  const vouchers = useVoucherStore()
  const [notice, setNotice] = useState<Notice>(null)
  const [creatingOffer, setCreatingOffer] = useState(false)
  const usable = canUseFeature(org, 'partnerVouchers')
  const issued = orgVouchers(vouchers, org.id)

  useEffect(() => {
    document.title = `Partner offers — ${org.name}`
  }, [org.name])

  function run(action: () => void, success: string) {
    try {
      action()
      setNotice({ tone: 'success', text: success })
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'That change could not be saved.' })
    }
  }

  if (!usable && issued.length === 0) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>Give &amp; Get Local isn’t turned on</h1>
          <p className="muted">Partner-store rewards and vouchers are an optional module. You can turn it on and choose its capabilities in Website features.</p>
          <Link to={`${workspace}/features`} className="btn btn-primary">
            Open Website features
          </Link>
        </div>
      </div>
    )
  }

  const merchants = orgMerchants(vouchers, org.id)
  const offers = orgOffers(vouchers, org.id)

  return (
    <div className="container page-pad partner-offers">
      <header className="page-head">
        <div>
          <h1>Partner offers</h1>
          <p className="muted">Give &amp; Get Local · fictional partner stores · everything is simulated on this device.</p>
        </div>
      </header>
      {notice ? (
        <div className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      ) : null}
      {!usable ? (
        <div className="notice warn" role="status">
          <div>
            <strong>Give &amp; Get Local is turned off.</strong>
            <p className="small">New offers and purchases are stopped. Issued vouchers stay valid: you can still redeem them and settle pending merchant benefits below.</p>
          </div>
          <Link to={`${workspace}/features`} className="btn btn-outline btn-sm">
            Website features
          </Link>
        </div>
      ) : null}

      {usable ? <SetupChecklist org={org} store={vouchers} /> : null}
      {usable ? <MerchantsSection org={org} store={vouchers} run={run} /> : null}
      {usable && merchants.length > 0 && !creatingOffer && offers.length === 0 ? (
        <section className="panel ws-card" aria-labelledby="add-offer-title">
          <div className="section-head-row">
            <h2 id="add-offer-title">Offers</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreatingOffer(true)}>
              Add an offer
            </button>
          </div>
          <p className="awaiting">No offers yet. Add an offer when a partner store is ready.</p>
        </section>
      ) : null}
      {usable && merchants.length > 0 && creatingOffer ? <CreateOfferSection org={org} store={vouchers} run={run} onDone={() => setCreatingOffer(false)} /> : null}
      {offers.length > 0 ? <OffersSection org={org} store={vouchers} run={run} onAdd={usable && !creatingOffer ? () => setCreatingOffer(true) : undefined} /> : null}
      {issued.length > 0 ? <IssuedSection org={org} store={vouchers} run={run} /> : null}
    </div>
  )
}

type Run = (action: () => void, success: string) => void

/** Branches and Merchant access for one partner store. Staff see only this store in the merchant portal. */
function StoreStaff({ org, merchantId, branches, run }: { org: Organization; merchantId: string; branches: { id: string; name: string }[]; run: Run }) {
  const user = useCurrentUser()
  const [branchName, setBranchName] = useState('')
  const [staffId, setStaffId] = useState('')
  const [scope, setScope] = useState<string>('all')
  const staff = merchantStaff(merchantId)
  const candidates = listUsers().filter((item) => item.id !== user?.id && !staff.some((access) => access.userId === item.id))
  return (
    <div className="store-staff">
      <p className="small">
        <strong>Branches:</strong> {branches.map((branch) => branch.name).join(', ')}
      </p>
      <form
        className="inline-actions"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => {
            addMerchantBranch(org, merchantId, branchName)
            setBranchName('')
          }, 'Branch added.')
        }}
      >
        <input aria-label="New branch name" value={branchName} maxLength={80} placeholder="Add a branch" onChange={(event) => setBranchName(event.target.value)} />
        <button type="submit" className="btn btn-outline btn-sm">
          Add branch
        </button>
      </form>
      <p className="small">
        <strong>Store staff (Merchant access):</strong>{' '}
        {staff.length === 0 ? 'None yet.' : null}
      </p>
      {staff.length > 0 ? (
        <ul className="ws-list compact">
          {staff.map((access) => (
            <li key={access.userId}>
              <span>
                {userName(access.userId)} · {access.branchIds === 'all' ? 'all branches' : branches.filter((branch) => (access.branchIds as string[]).includes(branch.id)).map((branch) => branch.name).join(', ')}
              </span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => revokeMerchantAccess(org.id, merchantId, access.userId), 'Store access removed.')}>
                Remove access
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="inline-actions"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => {
            if (!staffId) throw new Error('Choose a demo identity.')
            grantMerchantAccess(org.id, merchantId, staffId, scope === 'all' ? 'all' : [scope])
            setStaffId('')
          }, 'Store access given. That identity can now use the merchant portal for this store only.')
        }}
      >
        <label className="sr-only" htmlFor={`staff-${merchantId}`}>
          Demo identity
        </label>
        <select id={`staff-${merchantId}`} value={staffId} onChange={(event) => setStaffId(event.target.value)}>
          <option value="">Give store access to…</option>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`scope-${merchantId}`}>
          Branches
        </label>
        <select id={`scope-${merchantId}`} value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="all">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} only
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-outline btn-sm">
          Give access
        </button>
      </form>
    </div>
  )
}

function SetupChecklist({ org, store }: { org: Organization; store: VoucherStore }) {
  const demo = useDemoStore()
  const offers = orgOffers(store, org.id)
  const merchants = orgMerchants(store, org.id)
  const assigned = offers.some((offer) => demo.campaigns.some((campaign) => campaign.organizationId === org.id && campaign.partnerOfferIds?.includes(offer.id)))
  const steps = [
    { label: 'Add a fictional partner store', done: merchants.length > 0 },
    { label: 'Create an offer', done: offers.length > 0 },
    { label: 'Review its terms', done: offers.some((offer) => offer.termsReviewedAt) },
    { label: 'Assign it to a campaign', done: assigned },
    { label: 'Activate the offer', done: offers.some((offer) => offer.status === 'active') },
  ]
  if (merchants.length === 0) {
    return (
      <section className="panel empty partner-empty" aria-labelledby="first-offer-title">
        <h2 id="first-offer-title">Add your first partner offer.</h2>
        <p className="muted">Connect a participating store with your fundraising campaigns.</p>
        <a href="#add-store" className="btn btn-primary">
          Add partner store
        </a>
        <ChecklistList steps={steps} />
      </section>
    )
  }
  if (steps.every((step) => step.done)) return null
  return (
    <section className="panel ws-card" aria-labelledby="offer-checklist-title">
      <h2 id="offer-checklist-title">Set up your first offer</h2>
      <ChecklistList steps={steps} />
    </section>
  )
}

function ChecklistList({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <ol className="guide-list">
      {steps.map((step, index) => (
        <li key={step.label} className={step.done ? 'done' : ''}>
          <span className="guide-mark" aria-hidden="true">
            {step.done ? '✓' : index + 1}
          </span>
          <div>
            <strong>{step.label}</strong>
            <span className="muted small">{step.done ? 'Done' : 'To do'}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

function MerchantsSection({ org, store, run }: { org: Organization; store: VoucherStore; run: Run }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const merchants = orgMerchants(store, org.id)
  return (
    <section className="panel ws-card" aria-labelledby="stores-title">
      <h2 id="stores-title">Partner stores</h2>
      {merchants.length > 0 ? (
        <ul className="member-list">
          {merchants.map((merchant) => (
            <li key={merchant.id} className="member">
              <div>
                <strong>{merchant.name}</strong>
                <span className="muted small">{[merchant.location, merchant.description].filter(Boolean).join(' · ') || 'Fictional partner store'}</span>
              </div>
              <StoreStaff org={org} merchantId={merchant.id} branches={merchant.branches} run={run} />
            </li>
          ))}
        </ul>
      ) : null}
      <form
        id="add-store"
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          run(() => {
            addMerchant(org, { name, description, location })
            setName('')
            setDescription('')
            setLocation('')
          }, 'Partner store added. Next, create an offer.')
        }}
      >
        <h3>Add partner store</h3>
        <p className="muted small">Use a fictional store for this demo. No real business is contacted.</p>
        <TextInput label="Store name" value={name} maxLength={80} onChange={setName} placeholder="e.g. Corner Books" />
        <TextInput label="Area" optional value={location} maxLength={120} onChange={setLocation} help="A neighbourhood or city. Avoid street addresses." />
        <TextArea label="Short description" optional value={description} maxLength={240} onChange={setDescription} />
        <button type="submit" className="btn btn-primary">
          Add partner store
        </button>
      </form>
    </section>
  )
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
const whole = (value: string) => (value.trim() ? Number(value) : undefined)

function CreateOfferSection({ org, store, run, onDone }: { org: Organization; store: VoucherStore; run: Run; onDone: () => void }) {
  const merchants = orgMerchants(store, org.id)
  const capabilities = VOUCHER_CAPABILITIES.filter((item) => canUseVoucherCapability(org, item.key))
  const [capability, setCapability] = useState<VoucherCapability>(capabilities[0]?.key ?? 'contributionRewards')
  const [merchantId, setMerchantId] = useState(merchants[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [terms, setTerms] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(org.defaults.currency)
  const [validUntil, setValidUntil] = useState(inDays(60))
  const [stock, setStock] = useState('')
  const [minContribution, setMinContribution] = useState('')
  const [rewardText, setRewardText] = useState('')
  const [price, setPrice] = useState('')
  const [storeValue, setStoreValue] = useState('')
  const [campaignShare, setCampaignShare] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [shopUrl, setShopUrl] = useState('')
  const [attempted, setAttempted] = useState(false)

  if (capabilities.length === 0) return null
  const active = capabilities.some((item) => item.key === capability) ? capability : capabilities[0].key
  const input: OfferInput = {
    merchantId: merchantId || merchants[0]?.id || '',
    capability: active,
    title,
    terms,
    currency,
    validUntil: validUntil ? `${validUntil}T23:59:00` : '',
    stock: stock.trim() ? Number(stock) : null,
    minContribution: whole(minContribution),
    rewardText,
    price: whole(price),
    storeValue: whole(storeValue),
    campaignShare: whole(campaignShare),
    discountCode,
    shopUrl,
  }
  const errors = attempted ? validateOffer(input) : {}

  return (
    <section className="panel ws-card" aria-labelledby="create-offer-title">
      <h2 id="create-offer-title">Create an offer</h2>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          setAttempted(true)
          if (Object.keys(validateOffer(input)).length > 0) return
          run(() => {
            createOffer(org, input)
            setTitle('')
            setTerms('')
            setAttempted(false)
            onDone()
          }, 'Offer saved as a draft. Review its terms, assign it to a campaign, then activate it.')
        }}
      >
        {capabilities.length > 1 ? (
          <fieldset className="set-fieldset">
            <legend className="field-label">Offer type</legend>
            {capabilities.map((item) => (
              <label key={item.key} className="check-row">
                <input type="radio" name="offer-capability" checked={active === item.key} onChange={() => setCapability(item.key)} />
                <span>
                  <strong>{item.name}</strong> — {item.explanation}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <p className="small">
            Offer type: <strong>{capabilities[0].name}</strong>
          </p>
        )}
        <Select label="Partner store" value={input.merchantId} options={merchants.map((merchant) => ({ value: merchant.id, label: merchant.name }))} onChange={setMerchantId} />
        <TextInput label="Offer title" value={title} maxLength={80} error={errors.title} onChange={setTitle} placeholder="e.g. 10% off school books" />
        <Select
          label="Currency"
          value={currency}
          options={CURRENCIES.map((item) => ({ value: item.code, label: item.label }))}
          help="Offers can only be attached to campaigns in the same currency."
          onChange={(value) => isCurrencyCode(value) && setCurrency(value)}
        />
        {active === 'contributionRewards' ? (
          <>
            <TextInput label="Smallest qualifying contribution" inputMode="numeric" value={minContribution} error={errors.minContribution} onChange={(value) => setMinContribution(value.replace(/[^\d]/g, ''))} />
            <TextInput label="Reward" value={rewardText} maxLength={120} error={errors.rewardText} onChange={setRewardText} placeholder="e.g. 10% off one purchase" />
          </>
        ) : null}
        {active === 'storeValueVouchers' ? (
          <div className="two-col">
            <TextInput label="Supporter pays" inputMode="numeric" value={price} error={errors.price} onChange={(value) => setPrice(value.replace(/[^\d]/g, ''))} />
            <TextInput label="Store credit value" inputMode="numeric" value={storeValue} error={errors.storeValue} onChange={(value) => setStoreValue(value.replace(/[^\d]/g, ''))} />
            <TextInput
              label="Amount supporting the campaign"
              inputMode="numeric"
              value={campaignShare}
              error={errors.campaignShare}
              help="Stated to supporters before they buy. Recorded as a pending merchant benefit."
              onChange={(value) => setCampaignShare(value.replace(/[^\d]/g, ''))}
            />
          </div>
        ) : null}
        {active === 'onlineOffers' ? (
          <>
            <TextInput label="Discount" value={rewardText} maxLength={120} error={errors.rewardText} onChange={setRewardText} placeholder="e.g. 15% off online orders" />
            <TextInput label="Partner code" optional value={discountCode} maxLength={30} error={errors.discountCode} onChange={setDiscountCode} />
            <TextInput label="Approved shopping link" optional value={shopUrl} maxLength={200} error={errors.shopUrl} onChange={setShopUrl} placeholder="https://" />
          </>
        ) : null}
        <TextArea label="Terms" value={terms} maxLength={600} error={errors.terms} onChange={setTerms} help="What supporters must know: limits, exclusions, how to use it." />
        <div className="two-col">
          <TextInput label="Valid until" type="date" value={validUntil} error={errors.validUntil} onChange={setValidUntil} />
          <TextInput label="Number available" optional inputMode="numeric" value={stock} error={errors.stock} onChange={(value) => setStock(value.replace(/[^\d]/g, ''))} help="Leave empty for no limit." />
        </div>
        <div className="inline-actions">
          <button type="submit" className="btn btn-primary">
            Save offer as draft
          </button>
          <button type="button" className="btn btn-outline" onClick={onDone}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function OffersSection({ org, store, run, onAdd }: { org: Organization; store: VoucherStore; run: Run; onAdd?: () => void }) {
  const demo = useDemoStore()
  const offers = orgOffers(store, org.id)
  const campaigns = demo.campaigns.filter((campaign) => campaign.organizationId === org.id)
  return (
    <section className="panel ws-card" aria-labelledby="offers-title">
      <div className="section-head-row">
        <h2 id="offers-title">Offers</h2>
        {onAdd ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
            Add an offer
          </button>
        ) : null}
      </div>
      <ul className="offer-admin-list">
        {offers.map((offer) => {
          const usable = canUseVoucherCapability(org, offer.capability)
          const expired = isExpired(offer)
          return (
            <li key={offer.id} className="offer-admin">
              <div className="offer-admin-head">
                <div>
                  <strong>{offer.title}</strong>
                  <span className="muted small">
                    {merchantFor(store, org.id, offer.merchantId)?.name ?? 'Partner store'} · {capabilityName(offer.capability)} · valid until {formatDate(offer.validUntil)} ·{' '}
                    {offer.stock === null ? 'no stock limit' : `${offer.stock} left`} · {offer.issuedCount} issued
                  </span>
                  <span className="small">{offerValueLine(offer)}</span>
                </div>
                <span className={`status-badge status-${offer.status === 'active' && !expired ? 'active' : offer.status === 'paused' ? 'closed' : 'draft'}`}>
                  <i />
                  {expired ? 'Ended' : offer.status === 'active' ? 'Active' : offer.status === 'paused' ? (offer.pausedReason === 'feature-disabled' ? 'Paused (feature turned off)' : 'Paused') : 'Draft'}
                </span>
              </div>
              <details>
                <summary>Terms</summary>
                <p className="small">{offer.terms}</p>
              </details>
              <div className="inline-actions">
                {!offer.termsReviewedAt ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => markTermsReviewed(org, offer.id), 'Terms marked as reviewed.')}>
                    I’ve reviewed these terms
                  </button>
                ) : (
                  <span className="muted small">Terms reviewed {formatDateTime(offer.termsReviewedAt)}</span>
                )}
                {offer.status !== 'active' && usable && !expired ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => activateOffer(org, offer.id), 'Offer activated.')}>
                    Activate offer
                  </button>
                ) : null}
                {offer.status === 'active' ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => pauseOffer(org, offer.id), 'Offer paused. Issued vouchers stay valid.')}>
                    Pause offer
                  </button>
                ) : null}
              </div>
              {campaigns.length > 0 ? (
                <fieldset className="set-fieldset">
                  <legend className="field-label">Show on campaigns</legend>
                  {campaigns.map((campaign) => {
                    const on = Boolean(campaign.partnerOfferIds?.includes(offer.id))
                    const mismatch = campaign.currency !== offer.currency
                    return (
                      <label key={campaign.id} className="check-row">
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!on && (mismatch || !usable)}
                          onChange={(event) =>
                            run(() => assignOfferToCampaign(org, offer.id, campaign.id, event.target.checked), event.target.checked ? `Offer added to “${campaign.title}”.` : `Offer removed from “${campaign.title}”.`)
                          }
                        />
                        <span>
                          {campaign.title}
                          {campaign.isDraft ? ' (draft)' : ''}
                          {mismatch ? <em className="muted small"> · uses {campaign.currency}</em> : null}
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              ) : (
                <p className="muted small">Create a campaign to attach this offer.</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function IssuedSection({ org, store, run }: { org: Organization; store: VoucherStore; run: Run }) {
  const demo = useDemoStore()
  const issued = orgVouchers(store, org.id)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  return (
    <section className="panel ws-card" aria-labelledby="issued-title">
      <h2 id="issued-title">Issued vouchers</h2>
      <p className="muted small">Redemptions and merchant benefits stay manageable even if Give &amp; Get Local is turned off. Supporter names are not shown.</p>
      <ul className="offer-admin-list">
        {issued.map((voucher) => {
          const campaign = demo.campaigns.find((item) => item.id === voucher.campaignId && item.organizationId === org.id)
          const expired = isExpired(voucher)
          return (
            <li key={voucher.id} className="offer-admin">
              <div className="offer-admin-head">
                <div>
                  <strong>
                    {voucher.title} · <code>{voucher.code}</code>
                  </strong>
                  <span className="muted small">
                    {capabilityName(voucher.capability)} · for “{campaign?.title ?? 'campaign'}” · issued {formatDate(voucher.issuedAt)}
                    {voucher.balance !== undefined ? ` · balance ${formatMoney(voucher.balance, voucher.currency)}` : ''}
                  </span>
                  {voucher.campaignBenefit ? (
                    <span className="small">
                      Campaign benefit {formatMoney(voucher.campaignBenefit, voucher.currency)} · {voucher.benefitStatus === 'settled' ? 'settled by merchant' : 'pending from merchant'}
                    </span>
                  ) : null}
                </div>
                <span className={`status-badge status-${voucher.status === 'active' && !expired ? 'active' : 'closed'}`}>
                  <i />
                  {voucher.status === 'cancelled' ? 'Cancelled' : voucher.status === 'redeemed' ? 'Used' : expired ? 'Expired' : 'Active'}
                </span>
              </div>
              <div className="inline-actions">
                {voucher.status === 'active' && !expired ? (
                  voucher.capability === 'storeValueVouchers' ? (
                    <>
                      <input
                        className="inline-amount"
                        inputMode="numeric"
                        aria-label={`Amount to redeem from ${voucher.code}`}
                        value={amounts[voucher.id] ?? ''}
                        placeholder="Amount"
                        onChange={(event) => setAmounts({ ...amounts, [voucher.id]: event.target.value.replace(/[^\d]/g, '') })}
                      />
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => redeemVoucher(org, voucher.id, Number(amounts[voucher.id] || 0)), 'Redemption recorded.')}>
                        Record store redemption
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => redeemVoucher(org, voucher.id), 'Marked as used.')}>
                      Mark as used at store
                    </button>
                  )
                ) : null}
                {voucher.benefitStatus === 'pending' ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => settleMerchantBenefit(org, voucher.id), 'Merchant benefit marked as settled.')}>
                    Mark merchant benefit settled
                  </button>
                ) : null}
                {voucher.status === 'active' ? (
                  <>
                    <input
                      className="inline-amount"
                      aria-label={`Cancellation reason for ${voucher.code}`}
                      value={reasons[voucher.id] ?? ''}
                      placeholder="Reason for cancellation"
                      maxLength={240}
                      onChange={(event) => setReasons({ ...reasons, [voucher.id]: event.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => run(() => cancelVoucher(org, voucher.id, reasons[voucher.id] ?? ''), 'Voucher cancelled. The balance was not restored and campaign totals were not changed.')}
                    >
                      Cancel voucher
                    </button>
                  </>
                ) : null}
              </div>
              {voucher.status === 'cancelled' ? (
                <p className="small">
                  Cancelled {voucher.cancelledAt ? formatDateTime(voucher.cancelledAt) : 'at an unrecorded time'}. Reason: {voucher.cancelReason || 'Not recorded'}. Issued terms and redemption history stay as they were. Redeemed value is not restored.
                </p>
              ) : null}
              {voucher.redemptions.length > 0 ? (
                <ul className="small muted">
                  {voucher.redemptions.map((item) => (
                    <li key={item.id}>
                      {formatDateTime(item.at)} · {item.note}
                      {item.amount ? ` · ${formatMoney(item.amount, voucher.currency)}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
