import { useState } from 'react'
import { Checkbox, Select, SingleImage, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { currencySymbol, formatDate } from '../../lib/format.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { fromDateInput, minorToInput, toDateInput, nowIso } from '../../lib/inputs.ts'
import { EXPENSE_CATEGORIES } from '../../lib/records.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { campaignMilestones, deleteExpense, EXPENSE_CATEGORY_LABEL, formatMinor, fundSummary, newId, saveCampaignFields, saveExpense } from '../../lib/transparency.ts'
import { validateExpense } from '../../lib/validation.ts'
import type { Expense, ExpenseCategory, PublishState } from '../../lib/types.ts'
import type { WorkspaceProps } from './CampaignWorkspace.tsx'

interface ExpenseDraft {
  id?: string
  description: string
  category: ExpenseCategory
  amount: string
  date: string
  vendor: string
  milestoneId: string
  privateReceipt?: string
  publicReceipt?: string
  receiptRedacted: boolean
  publicNote: string
}

function toDraft(expense?: Expense): ExpenseDraft {
  return {
    id: expense?.id,
    description: expense?.description ?? '',
    category: expense?.category ?? 'materials',
    amount: minorToInput(expense?.amountMinor),
    date: toDateInput(expense?.date ?? nowIso()),
    vendor: expense?.vendor ?? '',
    milestoneId: expense?.milestoneId ?? '',
    privateReceipt: expense?.privateReceipt,
    publicReceipt: expense?.publicReceipt,
    receiptRedacted: expense?.receiptRedacted ?? false,
    publicNote: expense?.publicNote ?? '',
  }
}

export function ExpensesEditor({ campaign, store }: WorkspaceProps) {
  const expenses = store.expenses.filter((item) => item.campaignId === campaign.id).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const milestones = campaignMilestones(store, campaign.id)
  const summary = fundSummary(campaign, store)
  const [draft, setDraft] = useState<ExpenseDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [fundingNote, setFundingNote] = useState(campaign.fundingNote ?? '')

  function save(status: PublishState) {
    if (!draft) return
    const next = validateExpense(draft, status === 'published')
    setErrors(next)
    if (Object.keys(next).length > 0) return
    if (status === 'published' && draft.publicReceipt && !window.confirm('Publish this receipt publicly? Check one last time that personal details are covered.')) return
    const existing = expenses.find((item) => item.id === draft.id)
    const now = nowIso()
    try {
      saveExpense({
        id: draft.id ?? newId('exp'),
        campaignId: campaign.id,
        description: draft.description.trim(),
        category: draft.category,
        amountMinor: parseRupeesToPaise(draft.amount)!,
        date: fromDateInput(draft.date)!,
        vendor: draft.vendor.trim(),
        milestoneId: draft.milestoneId || undefined,
        privateReceipt: draft.privateReceipt,
        publicReceipt: draft.publicReceipt,
        receiptRedacted: draft.receiptRedacted,
        publicNote: draft.publicNote.trim(),
        status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        publishedAt: status === 'published' ? (existing?.publishedAt ?? now) : undefined,
      })
      setDraft(null)
      setNotice(status === 'published' ? 'Expense published as organizer-reported spending.' : 'Draft saved. Draft expenses never count towards spending.')
    } catch (problem) {
      setErrors({ form: problem instanceof StorageFullError ? 'Browser storage is full. Try a smaller receipt image.' : 'The expense could not be saved.' })
    }
  }

  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <div className="section-head-row">
          <h2>Expenses</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDraft(toDraft())}>
            + Report an expense
          </button>
        </div>
        <dl className="ws-stats">
          <div>
            <dt>Confirmed simulated contributions</dt>
            <dd>{formatMinor(summary.contributedMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Published expenses</dt>
            <dd>{formatMinor(summary.spentMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Unallocated balance (demo calculation)</dt>
            <dd className={summary.balanceMinor < 0 ? 'negative-text' : ''}>{formatMinor(summary.balanceMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Draft expenses (not counted)</dt>
            <dd>{summary.draftCount}</dd>
          </div>
        </dl>
        {summary.balanceMinor < 0 ? (
          <div className="notice warn">
            <div>
              <strong>Reported spending is higher than simulated contributions.</strong>
              <p className="small">Supporters see the exact difference. Explain how the extra was funded:</p>
              <TextArea label="Explanation shown publicly" value={fundingNote} maxLength={1000} onChange={setFundingNote} />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  saveCampaignFields(campaign.id, { fundingNote: fundingNote.trim() })
                  setNotice('Explanation saved.')
                }}
              >
                Save explanation
              </button>
            </div>
          </div>
        ) : null}
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        {expenses.length === 0 ? <p className="awaiting">No expenses yet.</p> : null}
        <ul className="ws-list">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <div>
                <strong>
                  {expense.description} · {formatMinor(expense.amountMinor, campaign.currency)}
                </strong>
                <span className="muted small">
                  {EXPENSE_CATEGORY_LABEL[expense.category]} · {formatDate(expense.date)} · {expense.status === 'published' ? 'Published' : 'Draft — not counted'}
                  {expense.publicReceipt ? ' · Evidence attached' : ''}
                </span>
                {expense.status === 'published' && !expense.publicReceipt ? (
                  <span className="prompt-inline">Add evidence to support this reported expense.</span>
                ) : null}
              </div>
              <div className="inline-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(toDraft(expense))}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm(`Delete “${expense.description}”?`)) deleteExpense(expense.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {draft ? (
        <section className="panel ws-card wide" aria-label={draft.id ? 'Edit expense' : 'New expense'}>
          <h2>{draft.id ? 'Edit expense' : 'Report an expense'}</h2>
          <TextInput label="Description" value={draft.description} maxLength={200} error={errors.description} onChange={(description) => setDraft({ ...draft, description })} />
          <div className="two-col">
            <Select
              label="Category"
              value={draft.category}
              options={EXPENSE_CATEGORIES.map((value) => ({ value, label: EXPENSE_CATEGORY_LABEL[value] }))}
              onChange={(category) => setDraft({ ...draft, category: category as ExpenseCategory })}
            />
            <TextInput label={`Amount (${currencySymbol(campaign.currency)})`} inputMode="decimal" value={draft.amount} error={errors.amount} onChange={(amount) => setDraft({ ...draft, amount })} />
          </div>
          <div className="two-col">
            <TextInput label="Expense date" type="date" value={draft.date} error={errors.date} onChange={(date) => setDraft({ ...draft, date })} />
            <TextInput label="Vendor" optional maxLength={120} value={draft.vendor} onChange={(vendor) => setDraft({ ...draft, vendor })} />
          </div>
          <Select
            label="Related milestone"
            value={draft.milestoneId}
            options={[{ value: '', label: 'None' }, ...milestones.map((item) => ({ value: item.id, label: item.title }))]}
            onChange={(milestoneId) => setDraft({ ...draft, milestoneId })}
          />
          <SingleImage
            label="Original receipt (organizer only)"
            value={draft.privateReceipt}
            help="Kept in this workspace only and never shown on public pages. This demo stores it in your browser — it is not secure storage."
            onChange={(privateReceipt) => setDraft({ ...draft, privateReceipt })}
          />
          <SingleImage
            label="Redacted public receipt"
            value={draft.publicReceipt}
            help="Upload a copy with names, addresses, phone numbers, signatures and card details covered. Never upload identity documents."
            onChange={(publicReceipt) => setDraft({ ...draft, publicReceipt, receiptRedacted: publicReceipt ? draft.receiptRedacted : false })}
          />
          {draft.publicReceipt ? (
            <>
              <div className="notice warn compact">
                <div>
                  <strong>Receipts often contain personal details.</strong>
                  <p className="small">Check the image above before publishing. An attached receipt is shown as evidence, not as independent verification.</p>
                </div>
              </div>
              <Checkbox label="I have removed personal and payment details from the public receipt." checked={draft.receiptRedacted} onChange={(receiptRedacted) => setDraft({ ...draft, receiptRedacted })} />
              {errors.receiptRedacted ? <p className="error-text">{errors.receiptRedacted}</p> : null}
            </>
          ) : null}
          <TextArea label="Public note" optional maxLength={600} value={draft.publicNote} onChange={(publicNote) => setDraft({ ...draft, publicNote })} />
          {errors.form ? <p className="error-text">{errors.form}</p> : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary" onClick={() => save('published')}>
              Publish expense
            </button>
            <button type="button" className="btn btn-outline" onClick={() => save('draft')}>
              Save as draft
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
