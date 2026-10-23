import { beneficiaryText } from '../../lib/budget.ts'
import { draftsToBudget } from '../../lib/budget.ts'
import type { CampaignForm, Organization } from '../../lib/types.ts'

/** Practical launch checks. Required items block publishing elsewhere; the rest are recommendations. */
export function LaunchChecklist({ form, org, previewChecked }: { form: CampaignForm; org: Organization; previewChecked: boolean }) {
  const who = beneficiaryText({ whoItHelps: form.storyWho, beneficiary: form.beneficiary })
  const budget = draftsToBudget(form.budget)
  const rows: Array<{ label: string; done: boolean; kind: 'Required' | 'Recommended' | 'Optional' }> = [
    { label: 'Purpose explained', done: form.description.trim().length >= 20, kind: 'Required' },
    { label: 'Beneficiaries provided', done: who.length > 0, kind: 'Recommended' },
    { label: 'Budget explained', done: budget.length > 0 && (!form.budgetApproximate || form.budgetNote.trim().length > 0), kind: 'Recommended' },
    { label: 'Public contact provided', done: Boolean(org.content.contactEmail.trim()), kind: 'Recommended' },
    { label: 'Update plan selected', done: form.milestonePlan.some((item) => item.title.trim()) || Boolean(form.nextUpdateAt), kind: 'Optional' },
    { label: 'Contribution settings reviewed', done: form.direct || form.game, kind: 'Required' },
    { label: 'Public preview checked', done: previewChecked, kind: 'Optional' },
    { label: 'Sharing assets ready', done: Boolean(form.title.trim() && form.coverImageId), kind: 'Optional' },
  ]
  return (
    <section className="panel form-panel" aria-labelledby="launch-checks">
      <h3 id="launch-checks">Before you publish</h3>
      <p className="muted small">These checks read the draft. A ticked preview is your confirmation that you looked, not proof that a payment was tested.</p>
      <ul className="plain-list">
        {rows.map((row) => (
          <li key={row.label}>
            <strong>{row.done ? 'Done' : 'Still open'}:</strong> {row.label} <span className="muted small">· {row.kind}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
