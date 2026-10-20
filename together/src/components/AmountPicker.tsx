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
        <div className="rupee-field">
          <span>{currencySymbol()}</span>
          <input
            id="custom-amount"
            inputMode="numeric"
            value={customValue}
            placeholder="250"
            aria-invalid={Boolean(error)}
            onChange={(event) => onCustom(event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
        {error ? <p className="field-error">{error}</p> : <p className="hint">Whole rupees, greater than zero. This stays a simulation.</p>}
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
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  )
}
