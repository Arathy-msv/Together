import { useEffect, useState } from 'react'
import { AccessDenied } from '../../components/identity/AccessDenied.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { capabilityName } from '../../lib/features.ts'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format.ts'
import { merchantLookupVoucher, merchantRedeem, merchantRedemptionHistory, merchantStores, type MerchantVoucherView } from '../../lib/vouchers.ts'

/**
 * /merchant — partner-store staff look up and redeem vouchers at their assigned stores and
 * branches. Shows offer terms and balances only; never who holds a voucher or any organization record.
 */
export function MerchantPortalPage() {
  const user = useCurrentUser()
  const store = useVoucherStore()
  const scoped = user ? merchantStores(store) : []
  const [code, setCode] = useState('')
  const [found, setFound] = useState<MerchantVoucherView | null>(null)
  const [branchId, setBranchId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    document.title = 'Merchant portal — Together'
  }, [])

  if (!user || scoped.length === 0) {
    return <AccessDenied reason="The merchant portal is for partner-store staff. An Organization Admin gives a demo identity access to a store under Partner offers." />
  }

  const branchesForFound = found ? (scoped.find((item) => item.merchant.id === found.merchantId)?.branches ?? []) : []
  const history = merchantRedemptionHistory()

  function lookup() {
    setMessage(null)
    try {
      const result = merchantLookupVoucher(code)
      setFound(result)
      setBranchId('')
      if (!result) setMessage({ tone: 'error', text: 'No voucher with that code at your assigned stores.' })
    } catch (problem) {
      setFound(null)
      setMessage({ tone: 'error', text: problem instanceof Error ? problem.message : 'Lookup failed.' })
    }
  }

  function redeem() {
    if (!found) return
    try {
      const next = merchantRedeem(found.code, branchId, found.capability === 'storeValueVouchers' ? Number(amount || 0) : undefined)
      setFound(next)
      setAmount('')
      setMessage({ tone: 'success', text: 'Simulated redemption confirmed. No real money or goods changed hands.' })
    } catch (problem) {
      setMessage({ tone: 'error', text: problem instanceof Error ? problem.message : 'Redemption failed.' })
    }
  }

  return (
    <div className="container page-pad">
      <header className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo</span> Merchant portal · simulated
          </p>
          <h1>Redeem a voucher</h1>
          <p className="muted">Acting as {user.name} for: {scoped.map((item) => `${item.merchant.name} (${item.branches.map((branch) => branch.name).join(', ')})`).join(' · ')}</p>
        </div>
      </header>

      <section className="panel ws-card" aria-labelledby="lookup-title">
        <h2 id="lookup-title">Look up a voucher</h2>
        <form
          className="inline-actions"
          onSubmit={(event) => {
            event.preventDefault()
            lookup()
          }}
        >
          <label className="sr-only" htmlFor="voucher-code">
            Voucher code
          </label>
          <input id="voucher-code" value={code} placeholder="GGL-XXXX-XXXX" maxLength={20} onChange={(event) => setCode(event.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Look up
          </button>
        </form>
        {message ? (
          <p className={message.tone === 'error' ? 'error-text' : 'notice success compact'} role={message.tone === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        ) : null}
        {found ? (
          <div className="offer-admin">
            <div className="offer-admin-head">
              <div>
                <strong>
                  {found.title} · <code>{found.code}</code>
                </strong>
                <span className="muted small">
                  {capabilityName(found.capability)} · valid until {formatDate(found.validUntil)}
                  {found.balance !== undefined ? ` · balance ${formatMoney(found.balance, found.currency)}` : ''}
                  {found.rewardText ? ` · ${found.rewardText}` : ''}
                </span>
              </div>
              <span className={`status-badge status-${found.status === 'active' && !found.expired ? 'active' : 'closed'}`}>
                <i />
                {found.status === 'redeemed' ? 'Used' : found.expired ? 'Expired' : 'Valid'}
              </span>
            </div>
            <details>
              <summary>Terms</summary>
              <p className="small">{found.terms}</p>
            </details>
            {found.status === 'active' && !found.expired ? (
              <div className="stack-form">
                <label className="field">
                  <span className="field-label">Branch</span>
                  <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                    <option value="">Choose your branch</option>
                    {branchesForFound.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                {found.capability === 'storeValueVouchers' ? (
                  <label className="field">
                    <span className="field-label">Amount used</span>
                    <input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} />
                  </label>
                ) : null}
                <button type="button" className="btn btn-primary btn-sm" disabled={!branchId} onClick={redeem}>
                  Confirm simulated redemption
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel ws-card" aria-labelledby="history-title">
        <h2 id="history-title">Redemptions at your stores</h2>
        {history.length === 0 ? (
          <p className="muted small">No redemptions yet.</p>
        ) : (
          <ul className="ws-list compact">
            {history.map((row) => (
              <li key={row.redemption.id}>
                <span>
                  <strong>{row.voucher.title}</strong> · <code>{row.voucher.code}</code> · {row.branchName}
                  {row.redemption.amount ? ` · ${formatMoney(row.redemption.amount, row.voucher.currency)}` : ''}
                </span>
                <span className="muted small">{formatDateTime(row.redemption.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
