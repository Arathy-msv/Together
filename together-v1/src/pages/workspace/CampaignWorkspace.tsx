import { useEffect, useState } from 'react'
import { DELIVERY_LABEL, FUNDRAISING_LABEL, PUBLICATION_LABEL, deliveryState, fundraisingState, publicationState, revisionState } from '../../lib/lifecycle.ts'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { ReadinessPanel } from '../../components/ai/ReadinessPanel.tsx'
import { SparkIcon } from '../../components/ai/AiUI.tsx'
import { readinessFromCampaign, type ReadinessField } from '../../lib/ai/readiness.ts'
import { CampaignCover } from '../../components/CampaignImage.tsx'
import { MilestoneTimeline, StatusPill } from '../../components/campaign/PublicSections.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { Select, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { useCampaignView, useDemoStore } from '../../hooks/useDemoStore.ts'
import { campaignDetailsPath, campaignSharePath, closeCampaign } from '../../lib/campaigns.ts'
import { ShareKit } from '../../components/sharing/ShareKit.tsx'
import { RevisionReview } from '../../components/campaign/RevisionReview.tsx'
import { AccessDenied } from '../../components/identity/AccessDenied.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { can } from '../../lib/permissions.ts'
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
  saveCampaignFields,
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
  { id: 'referrals', label: 'Sharing pages' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'updates', label: 'Updates' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'trust', label: 'Documents' },
  { id: 'report', label: 'Final report' },
] as const

const REPORT_TASKS = [
  { id: 'updates', label: 'Post an update', hint: 'Tell supporters what has happened and what comes next.' },
  { id: 'expenses', label: 'Add an expense', hint: 'Show supporters how the money has been used.' },
  { id: 'milestones', label: 'Update a milestone', hint: 'Mark progress on what you promised to deliver.' },
  { id: 'report', label: 'Prepare final report', hint: 'Summarize what the campaign achieved once the work is done.' },
] as const

export interface WorkspaceProps {
  campaign: Campaign
  view: CampaignView
  store: DemoStore
}

/** Organizer workspace for one campaign, inside the existing organizer area. */
export function CampaignWorkspacePage() {
  const { campaignId = '', tab = 'overview' } = useParams()
  const { base, workspace, org } = useOrg()
  const view = useCampaignView(campaignId)
  const store = useDemoStore()
  const user = useCurrentUser()

  useEffect(() => {
    if (view) document.title = `Manage ${view.campaign.title}`
  }, [view])

  if (!view || view.campaign.organizationId !== org.id) return <OrgNotFound kind="campaign" />
  if (!can(user, 'campaign.view', { campaign: view.campaign, organization: org })) {
    return <AccessDenied reason="This campaign isn’t assigned to your demo identity. An Organization Admin can assign it to you under Members." />
  }
  const campaign = view.campaign
  const reportsAllowed = can(user, 'org.viewReports', { organization: org })
  const tabs = WORKSPACE_TABS.filter((item) => item.id !== 'report' || reportsAllowed)
  const props: WorkspaceProps = { campaign, view, store }
  const root = `${workspace}/campaigns/${campaign.id}`

  return (
    <div className="container page-pad workspace">
      <Link to={`${workspace}/campaigns`} className="back-link page-back">
        ← Back to campaigns
      </Link>
      <header className="workspace-head">
        <CampaignCover campaign={campaign} />
        <div>
          <h1>{campaign.title}</h1>
          <p className="muted small">
            Organized by {campaign.organizerName} · amounts in {campaign.currency}
          </p>
        </div>
        <Link to={campaignDetailsPath(campaign.id, base)} className="btn btn-outline btn-sm">
          View public page
        </Link>
      </header>
      <nav className="workspace-tabs" aria-label="Campaign workspace">
        {tabs.map((item) => (
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
        {tab === 'report' && reportsAllowed ? <FinalReportEditor {...props} /> : null}
        {tab === 'report' && !reportsAllowed ? <AccessDenied reason="Final reports are prepared by an Organization Admin." /> : null}
        {!WORKSPACE_TABS.some((item) => item.id === tab) ? <OrgNotFound kind="page" /> : null}
      </div>
    </div>
  )
}

/** Where a readiness result points inside the workspace. */
function workspaceTarget(field: ReadinessField, root: string, workspace: string): string {
  switch (field) {
    case 'milestones':
      return `${root}/milestones`
    case 'documents':
      return `${root}/trust`
    case 'updates':
      return `${root}/updates`
    case 'contact':
      return `${workspace}/website#set-footer`
    default:
      return `${root}/story`
  }
}

function Overview({ campaign, view, store }: WorkspaceProps) {
  const { workspace, org } = useOrg()
  const user = useCurrentUser()
  const canClose = can(user, 'campaign.close', { campaign, organization: org })
  const reportsAllowed = can(user, 'org.viewReports', { organization: org })
  const navigate = useNavigate()
  const summary = fundSummary(campaign, store)
  const delivery = deliverySummary(campaignMilestones(store, campaign.id))
  const prompts = workspacePrompts(campaign, store)
  const referrals = store.referrals.filter((item) => item.campaignId === campaign.id)
  const credited = store.contributions.filter((item) => item.campaignId === campaign.id && item.referralId).reduce((sum, item) => sum + item.amount, 0)
  const root = `${workspace}/campaigns/${campaign.id}`
  const fundraisingOpen = !campaign.manualClosedAt && (view.status === 'active' || view.status === 'scheduled')
  return (
    <div className="workspace-grid">
      <RevisionReview campaign={campaign} />

      <section className="panel ws-card wide" aria-labelledby="report-tasks-title">
        <h2 id="report-tasks-title">Keep supporters informed</h2>
        <ul className="status-lines">
          <li>
            <strong>Publication:</strong> {PUBLICATION_LABEL[publicationState(campaign)]}
            {revisionState(campaign) ? ` · Proposed changes: ${PUBLICATION_LABEL[revisionState(campaign)!]}` : ''}
          </li>
          <li>
            <strong>Fundraising:</strong> {FUNDRAISING_LABEL[fundraisingState(view)]}
            {campaign.isDraft ? '' : ` — ${view.percent}% of the goal raised.`}
          </li>
          <li>
            <strong>{DELIVERY_LABEL[deliveryState(campaignMilestones(store, campaign.id))]}</strong>
            {delivery.total === 0
              ? ' — no activities planned yet.'
              : ` — ${delivery.complete} of ${delivery.total} activities marked complete by you. Supporters see this as organizer-reported.`}
          </li>
          <li>
            <strong>Final report:</strong> {campaign.finalReport?.status === 'published' ? 'Published.' : campaign.finalReport ? 'Draft saved.' : 'Not started.'}
          </li>
        </ul>
        <ul className="task-list">
          {REPORT_TASKS.filter((task) => task.id !== 'report' || reportsAllowed).map((task) => (
            <li key={task.id}>
              <div>
                <strong>{task.label}</strong>
                <span className="muted small">{task.hint}</span>
              </div>
              <Link to={`${root}/${task.id}`} className="btn btn-outline btn-sm">
                {task.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
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
        {fundraisingOpen && canClose ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (window.confirm('Close fundraising? Supporters will no longer be able to contribute. Delivery reporting continues.')) closeCampaign(campaign.id)
            }}
          >
            Close fundraising
          </button>
        ) : fundraisingOpen ? (
          <p className="small muted">An Organization Admin can close fundraising.</p>
        ) : (
          <p className="small">
            {FUNDRAISING_LABEL[fundraisingState(view)]}. Contributions have stopped; delivery is reported separately, and publishing a final report is another step.
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
            <dt>Not yet spent (demo calculation)</dt>
            <dd className={summary.balanceMinor < 0 ? 'negative-text' : ''}>{formatMinor(summary.balanceMinor, campaign.currency)}</dd>
          </div>
        </dl>
      </section>
      <div className="wide">
        <ReadinessPanel
          input={readinessFromCampaign(campaign, store, org)}
          onJump={(field) => navigate(workspaceTarget(field, root, workspace))}
          applicable={['whatItSupports', 'whatHappensNext']}
          onApply={(field, text) => {
            const story = campaign.story ?? { whoItHelps: '', whatTheyNeed: '', whatItSupports: '', whatHappensNext: '', beneficiary: '', imageStory: [] }
            saveCampaignFields(campaign.id, { story: field === 'whatItSupports' ? { ...story, whatItSupports: text } : { ...story, whatHappensNext: text } })
          }}
        />
      </div>
      <section className="panel ws-card wide">
        <h2>Reminders</h2>
        {prompts.length === 0 ? (
          <p className="muted">Nothing outstanding. Keep supporters informed as delivery continues.</p>
        ) : (
          <ul className="prompt-list">
            {prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ReferralsPanel({ campaign, store }: WorkspaceProps) {
  const { base, org } = useOrg()
  const referrals = store.referrals.filter((item) => item.campaignId === campaign.id)
  const campaignUrl = `${window.location.origin}${campaignSharePath(campaign.id, base)}`
  return (
    <>
      <div id="campaign-share-kit">
        <ShareKit org={org} campaign={campaign} url={campaignUrl} mode="campaign" title="Share this campaign" defaultOpen={false} />
      </div>
      <section className="panel ws-card wide">
        <h2>Sharing pages</h2>
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
    </>
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
  const { workspace } = useOrg()
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
            Add a milestone
          </button>
        </div>
        <p className="muted small">Mark progress on what you promised to deliver. Supporters see completed milestones as “Reported complete” by you. Partial delivery and new dates are fine — explain them in an update.</p>
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
                <Link to={`${workspace}/campaigns/${campaign.id}/updates?assist=1&milestone=${milestone.id}`} className="ai-button">
                  <SparkIcon size={15} /> Help write an update
                </Link>
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
