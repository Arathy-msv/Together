import { currencySymbol, formatINR } from '../lib/format.ts'
import type { DonationMode } from '../lib/types.ts'

export function AmountPicker({
  mode,
  amounts,
  value,
  customValue,
  onSelect,
  onCustom,
  error,
}: {
  mode: DonationMode
  amounts: number[]
  value: number | null
  customValue: string
  onSelect: (amount: number) => void
  onCustom: (value: string) => void
  error?: string
}) {
  if (mode === 'custom') {
    return (
      <div className="amount-picker">
        <label htmlFor="custom-amount">Enter an amount</label>
        <CustomAmountField id="custom-amount" value={customValue} error={error} onCustom={onCustom} />
        {error ? <p className="field-error">{error}</p> : <p className="hint">Whole dollars, greater than zero. This stays a simulation.</p>}
      </div>
    )
  }

  return (
    <div className="amount-picker">
      <p className="label">Choose an amount</p>
      <div className="amount-choices">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className={value === amount ? 'amount-choice selected' : 'amount-choice'}
            onClick={() => onSelect(amount)}
          >
            {formatINR(amount)}
          </button>
        ))}
      </div>
      <label className="amount-custom-label" htmlFor="custom-amount">
        Or enter your own
      </label>
      <CustomAmountField id="custom-amount" value={customValue} error={error} onCustom={onCustom} />
      {error ? <p className="field-error">{error}</p> : <p className="hint">Whole dollars, greater than zero. This stays a simulation.</p>}
    </div>
  )
}

function CustomAmountField({
  id,
  value,
  error,
  onCustom,
}: {
  id: string
  value: string
  error?: string
  onCustom: (value: string) => void
}) {
  return (
    <div className="rupee-field">
      <span>{currencySymbol()}</span>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        placeholder="250"
        aria-invalid={Boolean(error)}
        onChange={(event) => onCustom(event.target.value.replace(/[^\d]/g, ''))}
      />
    </div>
  )
}
