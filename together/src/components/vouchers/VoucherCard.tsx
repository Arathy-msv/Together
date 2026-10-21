import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { capabilityName } from '../../lib/features.ts'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format.ts'
import { qrPngDataUrl } from '../../lib/qr.ts'
import { issuedVoucherState, loadVoucherStore, type IssuedVoucher, type IssuedVoucherState } from '../../lib/vouchers.ts'

export function voucherState(voucher: IssuedVoucher, now = Date.now()): IssuedVoucherState {
  return issuedVoucherState(voucher, now)
}

const STATE_LABEL: Record<IssuedVoucherState, string> = {
  ready: 'Ready to use',
  partial: 'Partially used',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
}

/** The one line a cashier needs: remaining balance, the reward, or the offer title. */
function headline(voucher: IssuedVoucher): string {
  if (voucher.balance !== undefined) return `${formatMoney(voucher.balance, voucher.currency)} balance`
  return voucher.rewardText?.trim() || voucher.title
}

export function VoucherCard({
  voucher,
  storeName,
  campaign,
}: {
  voucher: IssuedVoucher
  storeName: string
  campaign?: { title: string; href: string }
}) {
  const [showing, setShowing] = useState(false)
  const state = voucherState(voucher)
  return (
    <li className={`voucher-card ${state}`}>
      <div className="voucher-card-top">
        <span className="voucher-store">{storeName}</span>
        <span className={`status-badge status-${state === 'ready' || state === 'partial' ? 'active' : 'closed'}`}>
          <i aria-hidden="true" />
          {STATE_LABEL[state]}
        </span>
      </div>
      <strong className="voucher-value">{headline(voucher)}</strong>
      <span className="muted small">
        {voucher.title} · {capabilityName(voucher.capability)}
      </span>
      <div className="voucher-card-foot">
        <span className="small">
          {state === 'cancelled' ? 'Cancelled' : state === 'expired' ? 'Expired' : 'Valid until'} {state === 'cancelled' && voucher.cancelledAt ? formatDateTime(voucher.cancelledAt) : formatDate(voucher.validUntil)}
        </span>
        <button type="button" className={state === 'ready' || state === 'partial' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setShowing(true)}>
          Show voucher
        </button>
      </div>
      {voucher.pricePaid ? (
        <p className="small">
          Receipt: paid {formatMoney(voucher.pricePaid, voucher.currency)} (simulated) · {formatMoney(voucher.campaignBenefit ?? 0, voucher.currency)} for the campaign ·{' '}
          {voucher.benefitStatus === 'settled' ? 'passed on by the store' : 'pending from the store'}
        </p>
      ) : null}
      <details>
        <summary>Terms and history</summary>
        <p className="small">{voucher.terms}</p>
        <p className="small muted">
          Issued {formatDateTime(voucher.issuedAt)} · supports {campaign ? <Link to={campaign.href}>{campaign.title}</Link> : 'a campaign'}
        </p>
        {voucher.shopUrl ? (
          <p className="small">
            <a href={voucher.shopUrl} target="_blank" rel="noopener noreferrer">
              Partner’s approved shop link<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        ) : null}
        {voucher.redemptions.length > 0 ? (
          <ul className="small">
            {voucher.redemptions.map((item) => (
              <li key={item.id}>
                {formatDateTime(item.at)} · {item.note}
                {item.amount ? ` · ${formatMoney(item.amount, voucher.currency)}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Not used yet.</p>
        )}
      </details>
      {showing ? <VoucherPresentation voucher={voucher} storeName={storeName} onClose={() => setShowing(false)} /> : null}
    </li>
  )
}

/** Full-screen, high-contrast view to hold up at the counter. */
function VoucherPresentation({ voucher, storeName, onClose }: { voucher: IssuedVoucher; storeName: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrFailed, setQrFailed] = useState(false)
  const state = voucherState(voucher)
  const merchant = loadVoucherStore().merchants.find((item) => item.id === voucher.merchantId)
  const branches = merchant?.branches.map((branch) => branch.name).filter(Boolean) ?? []

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    let live = true
    qrPngDataUrl(voucher.code, { size: 320, margin: 4, dark: '#000000', light: '#ffffff' })
      .then((url) => live && setQr(url))
      .catch(() => live && setQrFailed(true))
    return () => {
      live = false
    }
  }, [voucher.code])

  return (
    <dialog ref={ref} className="voucher-present" aria-labelledby={`present-${voucher.id}`} onClose={onClose} onCancel={onClose}>
      <div className="voucher-present-inner">
        <p className="voucher-present-kicker">Present this to store staff</p>
        <p className="voucher-present-store">{storeName}</p>
        {branches.length > 0 ? <p className="voucher-present-branch">{branches.length === 1 ? branches[0] : `Branches: ${branches.join(', ')}`}</p> : null}
        <h2 id={`present-${voucher.id}`}>{headline(voucher)}</h2>
        <p className={`voucher-present-state ${state}`}>{STATE_LABEL[state]}</p>
        {state === 'ready' || state === 'partial' ? (
          <>
            {state === 'partial' ? (
              <p className="voucher-present-note">Partially used. The remaining store balance can still be redeemed. This is not a percentage discount.</p>
            ) : null}
            {qr ? (
              <img className="voucher-present-qr" src={qr} alt={`QR code for voucher ${voucher.code}`} width={280} height={280} />
            ) : qrFailed ? null : (
              <div className="voucher-present-qr placeholder" aria-hidden="true" />
            )}
          </>
        ) : (
          <p className="voucher-present-note">
            {state === 'cancelled'
              ? `Cancelled${voucher.cancelledAt ? ` ${formatDateTime(voucher.cancelledAt)}` : ''}. Reason: ${voucher.cancelReason || 'Not recorded'}. Do not accept it. Issued terms and any earlier redemptions are unchanged.`
              : state === 'used'
                ? 'This voucher has already been used. Do not accept it again.'
                : 'This voucher is past its expiry. Do not accept it.'}
          </p>
        )}
        <p className="voucher-present-code-label">Backup code</p>
        <p className="voucher-present-code" aria-label={`Backup code ${voucher.code.split('').join(' ')}`}>
          {voucher.code}
        </p>
        {voucher.discountCode ? (
          <p>
            Partner code <strong className="voucher-present-sub">{voucher.discountCode}</strong>
          </p>
        ) : null}
        <p>{state === 'expired' ? 'Expired on' : 'Valid until'} {formatDate(voucher.validUntil)}</p>
        <p className="voucher-present-terms"><strong>Restrictions. </strong>{voucher.terms}</p>
        <p className="voucher-present-note">Simulated voucher. The store checks this code in its demo portal; no real value is exchanged.</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => ref.current?.close()} autoFocus>
          Done
        </button>
      </div>
    </dialog>
  )
}
