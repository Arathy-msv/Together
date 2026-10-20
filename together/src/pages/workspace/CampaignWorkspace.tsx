import { useEffect, useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { CampaignCover } from '../../components/CampaignImage.tsx'
import { MilestoneTimeline, StatusPill } from '../../components/campaign/PublicSections.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { Select, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { useCampaignView, useDemoStore } from '../../hooks/useDemoStore.ts'
import { campaignDetailsPath, closeCampaign } from '../../lib/campaigns.ts'
import { currencySymbol, formatDate, formatMoney } from '../../lib/format.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { fromDateInput, minorToInput, toDateInput, nowIso } from '../../lib/inputs.ts'
import { referralPath, referralTotals } from '../../lib/referrals.ts'
import { StorageFullError } from '../../lib/storage.ts'
import {
  campaignMilestones,
  deleteMilestone,
  deliverySummary,
  formatMinor,
  fundSummary,
  isMilestoneDelayed,
  MILESTONE_LABEL,
  newId,
  publishedUpdates,
  saveMilestone,
  workspacePrompts,
} from '../../lib/transparency.ts'
import type { Campaign, CampaignView, DemoStore, Milestone, MilestoneStatus } from '../../lib/types.ts'
import { OrgNotFound } from '../org/OrgNotFound.tsx'
import { StoryEditor } from './StoryEditor.tsx'
import { UpdatesEditor } from './UpdatesEditor.tsx'
import { ExpensesEditor } from './ExpensesEditor.tsx'
import { TrustEditor } from './TrustEditor.tsx'
import { FinalReportEditor } from './FinalReportEditor.tsx'

const WORKSPACE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'story', label: 'Story & settings' },
  { id: 'referrals', label: 'Referral pages' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'updates', label: 'Updates' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'trust', label: 'Trust & documents' },
  { id: 'report', label: 'Final report' },
] as const

export interface WorkspaceProps {
  campaign: Campaign
  view: CampaignView
  store: DemoStore
}

/** Organizer workspace for one campaign, inside the existing organizer area. */
export function CampaignWorkspacePage() {
  const { campaignId = '', tab = 'overview' } = useParams()
  const { base } = useOrg()
  const view = useCampaignView(campaignId)
  const store = useDemoStore()

  useEffect(() => {
    if (view) document.title = `Manage ${view.campaign.title}`
  }, [view])

  if (!view) return <OrgNotFound kind="campaign" />
  const campaign = view.campaign
  const props: WorkspaceProps = { campaign, view, store }
  const root = `${base}/dashboard/${campaign.id}`

  return (
    <div className="container page-pad workspace">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`${base}/dashboard`}>Campaigns</Link>
        <span>/</span>
        <span>{campaign.title}</span>
      </nav>
      <header className="workspace-head">
        <CampaignCover campaign={campaign} />
        <div>
          <h1>{campaign.title}</h1>
          <p className="muted small">
            Organizer workspace · {campaign.organizerName} · amounts in {campaign.currency}
          </p>
        </div>
        <Link to={campaignDetailsPath(campaign.id, base)} className="btn btn-outline btn-sm">
          View public page
        </Link>
      </header>
      <nav className="workspace-tabs" aria-label="Campaign workspace">
        {WORKSPACE_TABS.map((item) => (
          <NavLink key={item.id} to={item.id === 'overview' ? root : `${root}/${item.id}`} end>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="workspace-body">
        {tab === 'overview' ? <Overview {...props} /> : null}
        {tab === 'story' ? <StoryEditor {...props} /> : null}
        {tab === 'referrals' ? <ReferralsPanel {...props} /> : null}
        {tab === 'milestones' ? <MilestonesEditor {...props} /> : null}
        {tab === 'updates' ? <UpdatesEditor {...props} /> : null}
        {tab === 'expenses' ? <ExpensesEditor {...props} /> : null}
        {tab === 'trust' ? <TrustEditor {...props} /> : null}
        {tab === 'report' ? <FinalReportEditor {...props} /> : null}
        {!WORKSPACE_TABS.some((item) => item.id === tab) ? <OrgNotFound kind="page" /> : null}
      </div>
    </div>
  )
}

function Overview({ campaign, view, store }: WorkspaceProps) {
  const { base } = useOrg()
  const summary = fundSummary(campaign, store)
  const delivery = deliverySummary(campaignMilestones(store, campaign.id))
  const prompts = workspacePrompts(campaign, store)
  const referrals = store.referrals.filter((item) => item.campaignId === campaign.id)
  const credited = store.contributions.filter((item) => item.campaignId === campaign.id && item.referralId).reduce((sum, item) => sum + item.amount, 0)
  const root = `${base}/dashboard/${campaign.id}`
  const fundraisingOpen = !campaign.manualClosedAt && (view.status === 'active' || view.status === 'scheduled')
  return (
    <div className="workspace-grid">
      <section className="panel ws-card">
        <h2>Fundraising</h2>
        <dl className="ws-stats">
          <div>
            <dt>Confirmed simulated contributions</dt>
            <dd>{formatMinor(summary.contributedMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Campaign goal</dt>
            <dd>
              {formatMoney(campaign.goalAmount, campaign.currency)} · {view.percent}%
            </dd>
          </div>
          <div>
            <dt>Credited to sharing pages</dt>
            <dd>
              {formatMoney(credited, campaign.currency)} · {referrals.length} page{referrals.length === 1 ? '' : 's'}
            </dd>
          </div>
        </dl>
        <p className="muted small">Sharing-page credit is part of the campaign total, not added to it.</p>
        {fundraisingOpen ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (window.confirm('Close fundraising? Supporters will no longer be able to contribute. Delivery reporting continues.')) closeCampaign(campaign.id)
            }}
          >
            Close fundraising
          </button>
        ) : (
          <p className="small">
            Fundraising is {view.status === 'completed' ? 'complete' : 'closed'}. Publishing a final report is a separate step.
          </p>
        )}
      </section>
      <section className="panel ws-card">
        <h2>Delivery</h2>
        <dl className="ws-stats">
          <div>
            <dt>Milestones reported complete</dt>
            <dd>
              {delivery.complete} of {delivery.total}
            </dd>
          </div>
          <div>
            <dt>Published updates</dt>
            <dd>{publishedUpdates(store, campaign.id).length}</dd>
          </div>
          <div>
            <dt>Published expenses</dt>
            <dd>{formatMinor(summary.spentMinor, campaign.currency)}</dd>
          </div>
          <div>
            <dt>Unallocated balance (demo calculation)</dt>
            <dd className={summary.balanceMinor < 0 ? 'negative-text' : ''}>{formatMinor(summary.balanceMinor, campaign.currency)}</dd>
          </div>
        </dl>
      </section>
      <section className="panel ws-card wide">
        <h2>Suggested next steps</h2>
        {prompts.length === 0 ? (
          <p className="muted">Nothing outstanding. Keep supporters informed as delivery continues.</p>
        ) : (
          <ul className="prompt-list">
            {prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        )}
        <div className="inline-actions">
          <Link to={`${root}/updates`} className="btn btn-primary btn-sm">
            Write an update
          </Link>
          <Link to={`${root}/milestones`} className="btn btn-outline btn-sm">
            Manage milestones
          </Link>
          <Link to={`${root}/expenses`} className="btn btn-outline btn-sm">
            Report an expense
          </Link>
        </div>
      </section>
    </div>
  )
}

function ReferralsPanel({ campaign, store }: WorkspaceProps) {
  const { base } = useOrg()
  const referrals = store.referrals.filter((item) => item.campaignId === campaign.id)
  return (
    <section className="panel ws-card wide">
      <h2>Referral pages</h2>
      <p className="muted small">
        Supporters create sharing pages with a personal introduction. They cannot change the campaign’s facts, goal, currency or where money goes. Credited
        amounts are already included in the campaign total. Donor names are never shown here.
      </p>
      {referrals.length === 0 ? (
        <p className="awaiting">No sharing pages yet. Supporters can create one from the campaign page.</p>
      ) : (
        <table className="ws-table">
          <thead>
            <tr>
              <th>Shared by</th>
              <th>Credited</th>
              <th>Contributions</th>
              <th>Sharing goal</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => {
              const totals = referralTotals(referral, store.contributions)
              return (
                <tr key={referral.id}>
                  <td data-label="Shared by">
                    <strong>{referral.displayName}</strong>
                    <span className="muted small"> /{referral.code}</span>
                  </td>
                  <td data-label="Credited">{formatMoney(totals.amount, campaign.currency)}</td>
                  <td data-label="Contributions">{totals.count}</td>
                  <td data-label="Sharing goal">
                    {referral.personalTarget ? `${formatMoney(referral.personalTarget, campaign.currency)} · ${totals.percent}%` : '—'}
                  </td>
                  <td>
                    <Link to={referralPath(base, campaign.id, referral.code)} className="btn btn-outline btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

interface MilestoneDraft {
  id?: string
  title: string
  description: string
  due: string
  budget: string
  status: MilestoneStatus
  completed: string
  progressNote: string
}

function toDraft(milestone?: Milestone): MilestoneDraft {
  return {
    id: milestone?.id,
    title: milestone?.title ?? '',
    description: milestone?.description ?? '',
    due: toDateInput(milestone?.dueDate),
    budget: minorToInput(milestone?.plannedBudgetMinor),
    status: milestone?.status ?? 'planned',
    completed: toDateInput(milestone?.completedAt),
    progressNote: milestone?.progressNote ?? '',
  }
}

export function MilestonesEditor({ campaign, store }: WorkspaceProps) {
  const milestones = campaignMilestones(store, campaign.id)
  const [draft, setDraft] = useState<MilestoneDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')

  function save() {
    if (!draft) return
    const next: Record<string, string> = {}
    if (draft.title.trim().length < 3) next.title = 'Add a title of at least 3 characters.'
    const due = fromDateInput(draft.due)
    if (!due) next.due = 'Choose an expected completion date.'
    const budget = draft.budget.trim() ? parseRupeesToPaise(draft.budget) : undefined
    if (draft.budget.trim() && budget == null) next.budget = 'Enter an amount like 5000, or leave it empty.'
    const completed = draft.status === 'reported_complete' ? fromDateInput(draft.completed) : null
    if (draft.status === 'reported_complete' && !completed) next.completed = 'Add the date you completed this milestone.'
    setErrors(next)
    if (Object.keys(next).length > 0 || !due) return
    const existing = milestones.find((item) => item.id === draft.id)
    const now = nowIso()
    try {
      saveMilestone({
        id: draft.id ?? newId('ms'),
        campaignId: campaign.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        dueDate: due,
        plannedBudgetMinor: budget ?? undefined,
        status: draft.status,
        completedAt: completed ?? undefined,
        progressNote: draft.progressNote.trim(),
        order: existing?.order ?? milestones.length + 1,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      })
      setDraft(null)
      setNotice('Milestone saved.')
    } catch (problem) {
      setErrors({ form: problem instanceof StorageFullError ? problem.message : 'The milestone could not be saved.' })
    }
  }

  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <div className="section-head-row">
          <h2>Delivery milestones</h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDraft(toDraft())}>
            + Add milestone
          </button>
        </div>
        <p className="muted small">Completion is shown publicly as “Reported complete” — organizer-reported. Partial delivery and new dates are fine; explain them in an update.</p>
        {notice ? (
          <div className="notice success" role="status">
            {notice}
          </div>
        ) : null}
        {milestones.length === 0 ? <p className="awaiting">No milestones yet. Examples: identify recipients, purchase items, distribute, publish a final report.</p> : null}
        <ul className="ws-list">
          {milestones.map((milestone) => (
            <li key={milestone.id}>
              <div>
                <strong>{milestone.title}</strong>
                <span className="muted small">
                  {MILESTONE_LABEL[milestone.status]} · expected {formatDate(milestone.dueDate)}
                  {milestone.plannedBudgetMinor ? ` · planned ${formatMinor(milestone.plannedBudgetMinor, campaign.currency)}` : ''}
                </span>
                {isMilestoneDelayed(milestone) ? <span className="prompt-inline">This milestone is past its expected date.</span> : null}
              </div>
              <div className="inline-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(toDraft(milestone))}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm(`Delete “${milestone.title}”? Linked updates and expenses are kept.`)) deleteMilestone(milestone.id)
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
        <section className="panel ws-card wide" aria-label={draft.id ? 'Edit milestone' : 'New milestone'}>
          <h2>{draft.id ? 'Edit milestone' : 'New milestone'}</h2>
          <TextInput label="Title" value={draft.title} maxLength={120} error={errors.title} onChange={(title) => setDraft({ ...draft, title })} />
          <TextArea label="Description" optional value={draft.description} maxLength={1000} onChange={(description) => setDraft({ ...draft, description })} />
          <div className="two-col">
            <TextInput label="Expected completion date" type="date" value={draft.due} error={errors.due} onChange={(due) => setDraft({ ...draft, due })} />
            <TextInput
              label={`Planned budget (${currencySymbol(campaign.currency)})`}
              optional
              inputMode="decimal"
              value={draft.budget}
              error={errors.budget}
              help="A plan, not spending."
              onChange={(budget) => setDraft({ ...draft, budget })}
            />
          </div>
          <div className="two-col">
            <Select
              label="Status"
              value={draft.status}
              options={(Object.keys(MILESTONE_LABEL) as MilestoneStatus[]).map((value) => ({ value, label: MILESTONE_LABEL[value] }))}
              onChange={(status) => setDraft({ ...draft, status: status as MilestoneStatus, completed: status === 'reported_complete' && !draft.completed ? toDateInput(nowIso()) : draft.completed })}
            />
            {draft.status === 'reported_complete' ? (
              <TextInput label="Completion date" type="date" value={draft.completed} error={errors.completed} onChange={(completed) => setDraft({ ...draft, completed })} />
            ) : null}
          </div>
          <TextInput
            label="Progress note"
            optional
            maxLength={300}
            value={draft.progressNote}
            help="For partial delivery, e.g. “120 of 200 kits delivered”."
            onChange={(progressNote) => setDraft({ ...draft, progressNote })}
          />
          {errors.form ? <p className="error-text">{errors.form}</p> : null}
          <div className="inline-actions">
            <button type="button" className="btn btn-primary" onClick={save}>
              Save milestone
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
      <section className="panel ws-card wide">
        <h2>Public timeline preview</h2>
        <MilestoneTimeline milestones={milestones} />
        <StatusPill tone="neutral">Shown as organizer-reported</StatusPill>
      </section>
    </div>
  )
}
