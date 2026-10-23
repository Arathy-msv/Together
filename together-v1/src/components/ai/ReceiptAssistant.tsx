import { useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { SAMPLE_RECEIPTS, type ExtractedReceipt } from '../../lib/ai/receipts.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { currencySymbol } from '../../lib/format.ts'
import { minorToInput } from '../../lib/inputs.ts'
import { EXPENSE_CATEGORIES } from '../../lib/records.ts'
import { EXPENSE_CATEGORY_LABEL } from '../../lib/transparency.ts'
import type { CurrencyCode, ExpenseCategory } from '../../lib/types.ts'
import { validateExpense } from '../../lib/validation.ts'
import { AiPanel } from './AiUI.tsx'

export interface ReceiptValues {
  vendor: string
  date: string
  amount: string
  category: ExpenseCategory
  description: string
  publicReceipt: string
}

/**
 * Sample receipt extraction · Simulated. Each fictional sample maps to fixed values — there is no
 * OCR and no verification. Values only become an expense after the organizer reviews and saves.
 */
export function ReceiptAssistant({ campaignCurrency, onUse, onClose }: { campaignCurrency: CurrencyCode; onUse: (values: ReceiptValues) => void; onClose: () => void }) {
  const request = useAiRequest<AiResult<ExtractedReceipt>>()
  const [sampleId, setSampleId] = useState<string | null>(null)
  const [values, setValues] = useState<ReceiptValues | null>(null)
  const [currency, setCurrency] = useState<CurrencyCode | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function extract(id: string) {
    setSampleId(id)
    setErrors({})
    void request.run((signal) => assistantService.extractSampleReceipt({ sampleId: id }, { signal })).then((value) => {
      if (!value) return
      const sample = SAMPLE_RECEIPTS.find((item) => item.id === id)!
      setCurrency(value.content.currency)
      setValues({
        vendor: value.content.vendor,
        date: value.content.date,
        // A receipt in another currency is not converted; the organizer enters the campaign-currency amount.
        amount: value.content.currency === campaignCurrency ? minorToInput(value.content.amountMinor) : '',
        category: value.content.category,
        description: value.content.description,
        publicReceipt: sample.src,
      })
    })
  }

  function use() {
    if (!values) return
    const next = validateExpense({ description: values.description, amount: values.amount, date: values.date, receiptRedacted: true }, false)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onUse(values)
  }

  const sample = SAMPLE_RECEIPTS.find((item) => item.id === sampleId)
  return (
    <AiPanel
      title="Try receipt assistance"
      label="Sample receipt extraction · Simulated"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={() => sampleId && extract(sampleId)}
      onClose={onClose}
      context={
        <div className="ai-inputs">
          <p className="small">
            Choose a fictional sample receipt. Each sample maps to prepared values — this prototype has no OCR and does not check documents. For your own
            uploads, enter the fields manually in the expense form; automatic extraction is not connected.
          </p>
          <div className="receipt-gallery" role="group" aria-label="Sample receipts">
            {SAMPLE_RECEIPTS.map((item) => (
              <button key={item.id} type="button" className={sampleId === item.id ? 'gallery-choice selected' : 'gallery-choice'} aria-pressed={sampleId === item.id} onClick={() => extract(item.id)}>
                <img src={item.src} alt="" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      {request.status === 'success' && values && sample ? (
        <div className="receipt-review">
          <img className="receipt-large" src={sample.src} alt={`${sample.label}, shown for review`} />
          <div className="ai-output">
            <p className="muted small">Review every field against the receipt. Nothing is saved until you save or publish the expense.</p>
            <label className="field">
              <span className="field-label">Vendor</span>
              <input value={values.vendor} maxLength={120} onChange={(event) => setValues({ ...values, vendor: event.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Receipt date</span>
              <input type="date" value={values.date} aria-invalid={Boolean(errors.date)} onChange={(event) => setValues({ ...values, date: event.target.value })} />
              {errors.date ? <span className="error-text">{errors.date}</span> : null}
            </label>
            <label className="field">
              <span className="field-label">Amount ({currencySymbol(campaignCurrency)})</span>
              <input inputMode="decimal" value={values.amount} aria-invalid={Boolean(errors.amount)} onChange={(event) => setValues({ ...values, amount: event.target.value })} />
              {currency && currency !== campaignCurrency ? (
                <span className="ai-missing">
                  This sample is in {currency}; the campaign uses {campaignCurrency}. Amounts are not converted — enter the {campaignCurrency} amount you paid.
                </span>
              ) : null}
              {errors.amount ? <span className="error-text">{errors.amount}</span> : null}
            </label>
            <label className="field">
              <span className="field-label">Expense category</span>
              <select value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value as ExpenseCategory })}>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {EXPENSE_CATEGORY_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <input value={values.description} maxLength={200} aria-invalid={Boolean(errors.description)} onChange={(event) => setValues({ ...values, description: event.target.value })} />
              {errors.description ? <span className="error-text">{errors.description}</span> : null}
            </label>
            <div className="inline-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={use}>
                Use in a new expense
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AiPanel>
  )
}
