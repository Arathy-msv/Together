import { blankBudgetLine, budgetSummary, draftLineTotal, draftsToBudget, MAX_BUDGET_LINES, type BudgetLineDraft } from '../../lib/budget.ts'
import { currencySymbol } from '../../lib/format.ts'
import { formatMinor } from '../../lib/transparency.ts'
import type { CurrencyCode } from '../../lib/types.ts'

export interface BudgetEditorProps {
  lines: BudgetLineDraft[]
  onLines: (lines: BudgetLineDraft[]) => void
  currency: CurrencyCode
  /** Fundraising target in minor units. Shown for comparison only; the editor never changes it. */
  targetMinor: number
  milestones: Array<{ id: string; title: string }>
  approximate: boolean
  note: string
  onApproximate: (approximate: boolean) => void
  onNote: (note: string) => void
  error?: string
  /** Element id for jump links from review and readiness checks. */
  anchorId?: string
}

/** Organizer budget items with quantity × unit cost or a direct total, compared with the target. */
export function BudgetEditor({ lines, onLines, currency, targetMinor, milestones, approximate, note, onApproximate, onNote, error, anchorId = 'budget-plan' }: BudgetEditorProps) {
  const symbol = currencySymbol(currency)
  const summary = budgetSummary(draftsToBudget(lines), targetMinor)
  const update = (id: string, patch: Partial<BudgetLineDraft>) => onLines(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  const usable = milestones.filter((item) => item.title.trim())

  return (
    <div className="field budget-editor" id={anchorId} tabIndex={-1}>
      <span className="field-label">
        Budget plan <span className="optional-tag">Optional</span>
      </span>
      <p className="help">What you plan to spend. Supporters see it as a plan, never as purchases already made.</p>
      {lines.length > 0 ? (
        <ol className="budget-items">
          {lines.map((line, index) => {
            const n = index + 1
            const itemized = Boolean(line.quantity?.trim() && line.unitCost?.trim())
            const computed = draftLineTotal(line)
            return (
              <li key={line.id} className="budget-item">
                <div className="budget-item-main">
                  <label className="budget-cell budget-desc">
                    <span className="small">Item {n}</span>
                    <input value={line.label} maxLength={120} placeholder="e.g. Exercise books" onChange={(event) => update(line.id, { label: event.target.value })} />
                  </label>
                  <label className="budget-cell budget-qty">
                    <span className="small">Quantity</span>
                    <input inputMode="numeric" value={line.quantity ?? ''} placeholder="—" aria-label={`Item ${n} quantity (optional)`} onChange={(event) => update(line.id, { quantity: event.target.value })} />
                  </label>
                  <label className="budget-cell budget-unit">
                    <span className="small">Unit cost</span>
                    <span className="input-prefix">
                      <span>{symbol}</span>
                      <input inputMode="decimal" value={line.unitCost ?? ''} placeholder="—" aria-label={`Item ${n} unit cost (optional)`} onChange={(event) => update(line.id, { unitCost: event.target.value })} />
                    </span>
                  </label>
                  <label className="budget-cell budget-total">
                    <span className="small">Total</span>
                    {itemized ? (
                      <output className="budget-computed" aria-label={`Item ${n} total`} aria-live="polite">
                        {computed != null ? formatMinor(computed, currency) : 'Check the numbers'}
                      </output>
                    ) : (
                      <span className="input-prefix">
                        <span>{symbol}</span>
                        <input inputMode="decimal" value={line.amount} placeholder="0" aria-label={`Item ${n} total`} onChange={(event) => update(line.id, { amount: event.target.value })} />
                      </span>
                    )}
                  </label>
                  <button type="button" className="btn btn-outline btn-sm icon-only budget-remove" aria-label={`Remove item ${n}`} onClick={() => onLines(lines.filter((item) => item.id !== line.id))}>
                    ×
                  </button>
                </div>
                <div className="budget-item-extra">
                  {usable.length > 0 ? (
                    <label className="budget-cell">
                      <span className="small">Related milestone</span>
                      <select value={line.milestoneId ?? ''} onChange={(event) => update(line.id, { milestoneId: event.target.value })}>
                        <option value="">None</option>
                        {usable.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="budget-cell budget-note">
                    <span className="small">Short explanation (optional)</span>
                    <input value={line.note ?? ''} maxLength={200} placeholder="e.g. Supplier quotation, March" onChange={(event) => update(line.id, { note: event.target.value })} />
                  </label>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}
      {lines.length < MAX_BUDGET_LINES ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onLines([...lines, blankBudgetLine()])}>
          + Add budget item
        </button>
      ) : null}
      <p className="help">Fill in quantity and unit cost to calculate a total, or type the total directly.</p>

      {summary.plannedMinor > 0 ? (
        <dl className="budget-summary" aria-live="polite">
          <div>
            <dt>Fundraising target</dt>
            <dd>{summary.targetMinor > 0 ? formatMinor(summary.targetMinor, currency) : 'Not set'}</dd>
          </div>
          <div>
            <dt>Planned budget total</dt>
            <dd>{formatMinor(summary.plannedMinor, currency)}</dd>
          </div>
          {summary.overTargetMinor > 0 ? (
            <div className="is-over">
              <dt>Above the target</dt>
              <dd>{formatMinor(summary.overTargetMinor, currency)}</dd>
            </div>
          ) : (
            <div>
              <dt>Not yet assigned to an item</dt>
              <dd>{formatMinor(summary.unallocatedMinor, currency)}</dd>
            </div>
          )}
        </dl>
      ) : null}
      {summary.overTargetMinor > 0 ? (
        <p className="help">The plan is larger than the target. The target stays as you set it — explain how the difference will be covered, or trim the plan.</p>
      ) : null}

      <label className="check-row">
        <input type="checkbox" checked={approximate} onChange={(event) => onApproximate(event.target.checked)} />
        <span>These amounts are estimates</span>
      </label>
      {approximate || note ? (
        <label className="budget-cell">
          <span className="small">How you estimated the budget{approximate ? '' : ' (optional)'}</span>
          <textarea rows={2} maxLength={400} value={note} placeholder="e.g. Based on last year’s prices; final costs depend on supplier quotes." onChange={(event) => onNote(event.target.value)} />
        </label>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
