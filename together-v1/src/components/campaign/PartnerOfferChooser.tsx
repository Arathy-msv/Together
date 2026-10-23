import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { capabilityName } from '../../lib/features.ts'
import { formatDate } from '../../lib/format.ts'
import type { CurrencyCode, Organization } from '../../lib/types.ts'
import { eligibleOffersForCampaign, merchantFor, offerValueLine } from '../../lib/vouchers.ts'

/**
 * Optional campaign section: “Offer partner rewards or vouchers?”. Only rendered when the
 * organization can use Give & Get Local. Never blocks publishing.
 */
export function PartnerOfferChooser({
  org,
  currency,
  selected,
  onChange,
}: {
  org: Organization
  currency: CurrencyCode
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const store = useVoucherStore()
  const eligible = eligibleOffersForCampaign(org, store, { currency, organizationId: org.id })
  const [mode, setMode] = useState<'none' | 'select'>(selected.length > 0 ? 'select' : 'none')
  const chosen = selected.filter((id) => eligible.some((offer) => offer.id === id))

  return (
    <section className="panel form-panel" aria-labelledby="partner-offers-title">
      <h2 id="partner-offers-title">
        Offer partner rewards or vouchers? <span className="optional-tag">Optional</span>
      </h2>
      {eligible.length === 0 ? (
        <>
          <p>No partner offers are ready yet.</p>
          <p className="muted small">
            Offers must be active and use {currency}. You can publish now and add offers to this campaign later from Partner offers.
          </p>
          <div className="inline-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([])}>
              Set up later
            </button>
            <Link to={`/workspace/${org.id}/offers`} className="link-button">
              Open Partner offers
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="option-grid two" role="radiogroup" aria-label="Partner offers for this campaign">
            <label className={mode === 'none' ? 'check-row selected' : 'check-row'}>
              <input
                type="radio"
                name="partner-offer-mode"
                checked={mode === 'none'}
                onChange={() => {
                  setMode('none')
                  onChange([])
                }}
              />
              <span>No partner offers</span>
            </label>
            <label className={mode === 'select' ? 'check-row selected' : 'check-row'}>
              <input type="radio" name="partner-offer-mode" checked={mode === 'select'} onChange={() => setMode('select')} />
              <span>Select eligible existing offers</span>
            </label>
          </div>
          {mode === 'select' ? (
            <ul className="partner-offer-list">
              {eligible.map((offer) => {
                const on = chosen.includes(offer.id)
                return (
                  <li key={offer.id}>
                    <label className="check-row">
                      <input type="checkbox" checked={on} onChange={() => onChange(on ? chosen.filter((id) => id !== offer.id) : [...chosen, offer.id])} />
                      <span>
                        <strong>{offer.title}</strong>
                        <em className="muted small">
                          {merchantFor(store, org.id, offer.merchantId)?.name ?? 'Partner store'} · {capabilityName(offer.capability)} · {offerValueLine(offer)} · valid until{' '}
                          {formatDate(offer.validUntil)} · {offer.stock === null ? 'no stock limit' : `${offer.stock} left`}
                        </em>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </>
      )}
    </section>
  )
}
