import { useState, type ReactNode } from 'react'
import { formatDate, formatDateTime } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import {
  campaignMilestones,
  deliverySummary,
  EXPENSE_CATEGORY_LABEL,
  formatMinor,
  fundSummary,
  isMilestoneDelayed,
  latestUpdateDate,
  MILESTONE_LABEL,
  publicDocuments,
  publishedExpenses,
  publishedUpdates,
  UPDATE_TYPE_LABEL,
} from '../../lib/transparency.ts'
import type { Campaign, CampaignUpdate, DemoStore, Expense, ExpenseCategory, MediaItem, MediaVideo, Milestone, Organization } from '../../lib/types.ts'
import { EXPENSE_CATEGORIES } from '../../lib/records.ts'

/* Public, read-only campaign sections. Wording keeps organizer claims, attached evidence and
   (non-existent) independent verification clearly apart. */

export function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className={`image-fallback ${className ?? ''}`} role="img" aria-label={alt || 'Image unavailable'}>
        Image unavailable
      </span>
    )
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

export function MediaGallery({ items }: { items: MediaItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="media-gallery">
      {items.map((item) => (
        <figure key={item.id}>
          <SafeImage src={item.src} alt={item.alt} />
          {item.caption ? <figcaption>{item.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  )
}

/** Never autoplays. Supporters start it themselves with the native, keyboard-accessible controls. */
export function VideoBlock({ video }: { video: MediaVideo | undefined }) {
  const [failed, setFailed] = useState(false)
  if (!video) return null
  return (
    <figure className="video-block">
      {failed ? (
        <span className="image-fallback">Video unavailable</span>
      ) : (
        <video src={video.src} controls preload="metadata" playsInline onError={() => setFailed(true)} aria-label={video.caption || 'Campaign video'} />
      )}
      {video.caption ? <figcaption>{video.caption}</figcaption> : null}
    </figure>
  )
}

export function StatusPill({ tone, children }: { tone: 'neutral' | 'good' | 'progress' | 'warn' | 'demo'; children: ReactNode }) {
  return <span className={`trust-pill tone-${tone}`}>{children}</span>
}

function milestoneTone(milestone: Milestone): 'good' | 'progress' | 'warn' | 'neutral' {
  if (milestone.status === 'reported_complete') return 'good'
  if (isMilestoneDelayed(milestone)) return 'warn'
  return milestone.status === 'in_progress' ? 'progress' : 'neutral'
}

export function MilestoneTimeline({ milestones, compact = false }: { milestones: Milestone[]; compact?: boolean }) {
  if (milestones.length === 0) return <p className="muted">The organizer has not added delivery milestones yet.</p>
  return (
    <>
      {compact ? null : (
        <ul className="timeline-legend" aria-label="Timeline legend">
          <li>
            <i className="dot tone-neutral" /> Planned
          </li>
          <li>
            <i className="dot tone-progress" /> In progress
          </li>
          <li>
            <i className="dot tone-good" /> Reported complete (organizer-reported)
          </li>
          <li>
            <i className="dot tone-warn" /> Past expected date
          </li>
        </ul>
      )}
      <ol className={compact ? 'timeline compact' : 'timeline'}>
        {milestones.map((milestone) => {
          const tone = milestoneTone(milestone)
          const delayed = isMilestoneDelayed(milestone)
          return (
            <li key={milestone.id} className={tone}>
              <span className={`dot tone-${tone}`} aria-hidden="true" />
              <div>
                <div className="timeline-head">
                  <strong>{milestone.title}</strong>
                  <StatusPill tone={tone === 'warn' ? 'warn' : tone}>
                    {MILESTONE_LABEL[milestone.status]}
                    {delayed ? ' · past expected date' : ''}
                  </StatusPill>
                </div>
                <span className="muted small">
                  {milestone.status === 'reported_complete' && milestone.completedAt
                    ? `Organizer reported complete on ${formatDate(milestone.completedAt)}`
                    : `Expected by ${formatDate(milestone.dueDate)}`}
                </span>
                {!compact && milestone.description ? <p>{milestone.description}</p> : null}
                {!compact && milestone.progressNote ? <p className="progress-note">Progress: {milestone.progressNote}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export function StoryTab({ campaign, store, onShowUpdates }: { campaign: Campaign; store: DemoStore; onShowUpdates: () => void }) {
  const story = campaign.story
  const sections = [
    ['Who this helps', story?.whoItHelps],
    ['What they need', story?.whatTheyNeed],
    ['What contributions will support', story?.whatItSupports],
    ['What happens next', story?.whatHappensNext],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
  const budget = campaign.budget ?? []
  const budgetTotal = budget.reduce((sum, line) => sum + line.amountMinor, 0)
  const milestones = campaignMilestones(store, campaign.id)
  return (
    <div className="tab-body">
      <p className="story-lead">{campaign.description}</p>
      {sections.length > 0 ? (
        <div className="story-grid">
          {sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
      ) : null}
      {story?.imageStory.length ? (
        <section>
          <h3 className="section-label">In pictures</h3>
          <MediaGallery items={story.imageStory} />
        </section>
      ) : null}
      <VideoBlock video={story?.video} />
      {budget.length > 0 ? (
        <section className="budget-card">
          <h3>Planned budget</h3>
          <p className="muted small">The organizer’s plan. Planned amounts are not spending — see Fund use for reported expenses.</p>
          <table className="budget-table">
            <tbody>
              {budget.map((line) => (
                <tr key={line.id}>
                  <th scope="row">{line.label}</th>
                  <td>{formatMinor(line.amountMinor, campaign.currency)}</td>
                  <td className="budget-bar-cell" aria-hidden="true">
                    <span className="budget-bar">
                      <i style={{ width: `${budgetTotal ? Math.round((line.amountMinor / budgetTotal) * 100) : 0}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Planned total</th>
                <td>{formatMinor(budgetTotal, campaign.currency)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      ) : null}
      {campaign.impactExamples?.length ? (
        <section className="impact-examples">
          <h3>Organizer’s cost examples</h3>
          <ul>
            {campaign.impactExamples.map((item) => (
              <li key={item.id}>
                <strong>
                  {formatMinor(item.amountMinor, campaign.currency)} → {item.outcome}
                </strong>
                <span className="muted small">Cost basis provided by the organizer: {item.costBasis}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {campaign.participation.game ? (
        <section className="story-game">
          <h3>Play to build a suggestion</h3>
          <p className="muted">
            {gameMeta(campaign.gameType).name}: each game action adds to a suggested amount you review before confirming. Playing never collects money.
          </p>
        </section>
      ) : null}
      {milestones.length > 0 ? (
        <section>
          <div className="section-head-row">
            <h3>What happens with the funds</h3>
            <button type="button" className="link-button" onClick={onShowUpdates}>
              See the full timeline
            </button>
          </div>
          <MilestoneTimeline milestones={milestones.slice(0, 3)} compact />
        </section>
      ) : null}
    </div>
  )
}

function UpdateCard({ update, store, campaign }: { update: CampaignUpdate; store: DemoStore; campaign: Campaign }) {
  const milestone = update.milestoneId ? store.milestones.find((item) => item.id === update.milestoneId) : undefined
  const expenses = update.expenseIds
    .map((id) => store.expenses.find((item) => item.id === id && item.status === 'published'))
    .filter((item): item is Expense => Boolean(item))
  return (
    <article className="update-card">
      <header>
        <StatusPill tone={update.type === 'delay' ? 'warn' : 'neutral'}>{UPDATE_TYPE_LABEL[update.type]}</StatusPill>
        <time dateTime={update.date}>{formatDate(update.date)}</time>
      </header>
      <h3>{update.title}</h3>
      {update.body ? <p className="update-body">{update.body}</p> : null}
      <MediaGallery items={update.media} />
      <VideoBlock video={update.video} />
      {milestone || expenses.length ? (
        <footer>
          {milestone ? <span className="muted small">Milestone: {milestone.title}</span> : null}
          {expenses.length ? (
            <span className="muted small">
              Related organizer-reported expenses: {expenses.map((item) => `${item.description} (${formatMinor(item.amountMinor, campaign.currency)})`).join('; ')}. Counted once in Fund use.
            </span>
          ) : null}
        </footer>
      ) : null}
    </article>
  )
}

export function FinalReportCard({ campaign, store }: { campaign: Campaign; store: DemoStore }) {
  const report = campaign.finalReport
  if (!report || report.status !== 'published') return null
  const summary = fundSummary(campaign, store)
  const docs = store.supportingDocuments.filter((doc) => doc.visibility === 'public' && report.evidenceDocumentIds.includes(doc.id))
  const updates = store.campaignUpdates.filter((item) => item.status === 'published' && report.evidenceUpdateIds.includes(item.id))
  const unfinished = campaignMilestones(store, campaign.id).filter((item) => item.status !== 'reported_complete')
  return (
    <section className="final-report" aria-labelledby="final-report-title">
      <span className="eyebrow-label">Organizer’s final report · {report.publishedAt ? formatDate(report.publishedAt) : ''}</span>
      <h3 id="final-report-title">Final report</h3>
      <dl className="report-figures">
        <div>
          <dt>Simulated contributions</dt>
          <dd>{formatMinor(summary.contributedMinor, campaign.currency)}</dd>
        </div>
        <div>
          <dt>Published expenses</dt>
          <dd>{formatMinor(summary.spentMinor, campaign.currency)}</dd>
        </div>
        <div>
          <dt>Remaining (demo calculation)</dt>
          <dd>{formatMinor(summary.balanceMinor, campaign.currency)}</dd>
        </div>
        {report.outcomeFields.filter((field) => field.value.trim()).map((field) => (
          <div key={field.label}>
            <dt>{field.label} (organizer-reported)</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {report.outcomes ? <p>{report.outcomes}</p> : null}
      {report.remainingPlan ? (
        <p>
          <strong>Plan for remaining funds:</strong> {report.remainingPlan}
        </p>
      ) : null}
      {unfinished.length ? <p className="muted small">Unfinished milestones: {unfinished.map((item) => item.title).join(', ')}.</p> : null}
      {docs.length || updates.length ? (
        <p className="muted small">Evidence: {[...docs.map((doc) => doc.title), ...updates.map((item) => `Update “${item.title}”`)].join(' · ')}</p>
      ) : null}
    </section>
  )
}

export function UpdatesTab({ campaign, store, follow }: { campaign: Campaign; store: DemoStore; follow: ReactNode }) {
  const [showAll, setShowAll] = useState(false)
  const updates = publishedUpdates(store, campaign.id)
  const milestones = campaignMilestones(store, campaign.id)
  const delivery = deliverySummary(milestones)
  const shown = showAll ? updates : updates.slice(0, 3)
  return (
    <div className="tab-body">
      <FinalReportCard campaign={campaign} store={store} />
      <section>
        <div className="section-head-row">
          <h3>Delivery progress</h3>
          <span className="muted small">Organizer-reported</span>
        </div>
        <p className="muted small">
          {delivery.total > 0
            ? `${delivery.complete} of ${delivery.total} milestones reported complete${delivery.delayed ? ` · ${delivery.delayed} past expected date` : ''}. `
            : ''}
          Reaching the fundraising goal does not mean delivery is complete.
        </p>
        <MilestoneTimeline milestones={milestones} />
      </section>
      <section>
        <div className="section-head-row">
          <h3>Updates</h3>
          {follow}
        </div>
        {updates.length === 0 ? (
          <p className="awaiting">Awaiting update — the organizer has not published an update yet.</p>
        ) : (
          <div className="update-list">
            {shown.map((update) => (
              <UpdateCard key={update.id} update={update} store={store} campaign={campaign} />
            ))}
            {updates.length > 3 ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAll((value) => !value)}>
                {showAll ? 'Show latest updates only' : `Show full timeline (${updates.length} updates)`}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

export function FundUseTab({ campaign, store }: { campaign: Campaign; store: DemoStore }) {
  const summary = fundSummary(campaign, store)
  const expenses = publishedExpenses(store, campaign.id)
  const milestones = campaignMilestones(store, campaign.id)
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all')
  const [milestoneId, setMilestoneId] = useState('all')
  const visible = expenses.filter(
    (item) => (category === 'all' || item.category === category) && (milestoneId === 'all' || item.milestoneId === milestoneId),
  )
  const outstanding = milestones.filter((item) => item.status !== 'reported_complete')
  return (
    <div className="tab-body">
      <div className="fund-cards">
        <div className="fund-card">
          <span>Confirmed simulated contributions</span>
          <strong>{formatMinor(summary.contributedMinor, campaign.currency)}</strong>
        </div>
        <div className="fund-card">
          <span>Published organizer-reported expenses</span>
          <strong>{formatMinor(summary.spentMinor, campaign.currency)}</strong>
        </div>
        <div className={summary.balanceMinor < 0 ? 'fund-card negative' : 'fund-card'}>
          <span>Unallocated balance (demo calculation)</span>
          <strong>{formatMinor(summary.balanceMinor, campaign.currency)}</strong>
        </div>
        <div className="fund-card planned">
          <span>Planned spending (not yet spent)</span>
          <strong>{summary.plannedMinor > 0 ? formatMinor(summary.plannedMinor, campaign.currency) : '—'}</strong>
        </div>
      </div>
      <p className="muted small">
        Demo calculation from data in this browser: confirmed simulated contributions minus published organizer-reported expenses. It is not a bank balance or
        an audited statement. Suggested game amounts, draft expenses and planned budgets are not counted.
      </p>
      {summary.balanceMinor < 0 ? (
        <div className="notice warn">
          <div>
            <strong>Reported spending is {formatMinor(-summary.balanceMinor, campaign.currency)} more than simulated contributions.</strong>
            <p className="small">
              {campaign.fundingNote?.trim() ? `Organizer’s explanation: ${campaign.fundingNote}` : 'The organizer has not yet explained how the difference was funded.'}
            </p>
          </div>
        </div>
      ) : null}

      <section>
        <div className="section-head-row">
          <h3>Organizer-reported spending</h3>
          <span className="muted small">{expenses.length} published</span>
        </div>
        {expenses.length > 0 ? (
          <div className="expense-filters">
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value as 'all' | ExpenseCategory)}>
                <option value="all">All categories</option>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {EXPENSE_CATEGORY_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            {milestones.length > 0 ? (
              <label>
                Milestone
                <select value={milestoneId} onChange={(event) => setMilestoneId(event.target.value)}>
                  <option value="all">All milestones</option>
                  {milestones.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}
        {expenses.length === 0 ? (
          <p className="awaiting">No organizer-reported spending has been published yet.</p>
        ) : visible.length === 0 ? (
          <p className="muted">No expenses match these filters.</p>
        ) : (
          <ul className="expense-list">
            {visible.map((expense) => (
              <li key={expense.id}>
                <details>
                  <summary>
                    <span className="expense-main">
                      <strong>{expense.description}</strong>
                      <span className="muted small">
                        {EXPENSE_CATEGORY_LABEL[expense.category]} · {formatDate(expense.date)}
                        {expense.vendor ? ` · ${expense.vendor}` : ''}
                      </span>
                    </span>
                    <span className="expense-side">
                      <strong>{formatMinor(expense.amountMinor, campaign.currency)}</strong>
                      {expense.publicReceipt ? <StatusPill tone="progress">Evidence attached</StatusPill> : <StatusPill tone="neutral">No supporting evidence uploaded</StatusPill>}
                    </span>
                  </summary>
                  <div className="expense-detail">
                    {expense.milestoneId ? <p className="small">Milestone: {milestones.find((item) => item.id === expense.milestoneId)?.title}</p> : null}
                    {expense.publicNote ? <p className="small">Organizer’s note: {expense.publicNote}</p> : null}
                    {expense.publicReceipt ? (
                      <>
                        <SafeImage className="receipt-image" src={expense.publicReceipt} alt={`Redacted receipt for ${expense.description}`} />
                        <p className="muted small">Receipt published by the organizer with personal details removed. An attached receipt is not independent verification.</p>
                      </>
                    ) : (
                      <p className="muted small">No supporting evidence uploaded for this expense.</p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
      {outstanding.length > 0 ? (
        <section>
          <h3>Outstanding activities</h3>
          <ul className="plain-list">
            {outstanding.map((item) => (
              <li key={item.id}>
                {item.title} — {MILESTONE_LABEL[item.status]}, expected by {formatDate(item.dueDate)}
                {item.plannedBudgetMinor ? ` · planned ${formatMinor(item.plannedBudgetMinor, campaign.currency)}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function TrustTab({ campaign, store, org }: { campaign: Campaign; store: DemoStore; org: Organization }) {
  const documents = publicDocuments(store, campaign.id)
  const lastUpdate = latestUpdateDate(store, campaign.id)
  const rows: Array<{ label: string; value: string; state: ReactNode }> = [
    { label: 'Organizer', value: `${campaign.organizerName} · ${org.name}`, state: <StatusPill tone="neutral">Information provided</StatusPill> },
    {
      label: 'Organizer-provided contact',
      value: org.content.contactEmail || 'Not provided',
      state: org.content.contactEmail ? <StatusPill tone="neutral">Information provided</StatusPill> : <StatusPill tone="neutral">Not provided</StatusPill>,
    },
    {
      label: 'Who benefits',
      value: campaign.story?.beneficiary?.trim() || 'Not provided',
      state: campaign.story?.beneficiary?.trim() ? <StatusPill tone="neutral">Information provided</StatusPill> : <StatusPill tone="neutral">Not provided</StatusPill>,
    },
    { label: 'Campaign purpose', value: campaign.description, state: <StatusPill tone="neutral">Information provided</StatusPill> },
    {
      label: 'Supporting documents',
      value: documents.length ? `${documents.length} public document${documents.length === 1 ? '' : 's'}` : 'None yet',
      state: documents.length ? <StatusPill tone="progress">Supporting document attached</StatusPill> : <StatusPill tone="neutral">No supporting evidence uploaded</StatusPill>,
    },
    {
      label: 'Last public update',
      value: lastUpdate ? formatDateTime(lastUpdate) : 'No updates yet',
      state: lastUpdate ? <StatusPill tone="neutral">Information provided</StatusPill> : <StatusPill tone="neutral">Awaiting update</StatusPill>,
    },
    {
      label: 'Independent verification',
      value: 'This prototype has no independent review service.',
      state: <StatusPill tone="warn">Not independently verified</StatusPill>,
    },
  ]
  return (
    <div className="tab-body">
      {campaign.demoVerification ? (
        <div className="demo-verification">
          <StatusPill tone="demo">Demo verification example</StatusPill>
          <p className="small">{campaign.demoVerification.note}</p>
        </div>
      ) : null}
      <dl className="trust-list">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              <span>{row.value}</span>
              {row.state}
            </dd>
          </div>
        ))}
      </dl>
      <section>
        <h3>Supporting documents</h3>
        {documents.length === 0 ? (
          <p className="awaiting">No supporting evidence uploaded.</p>
        ) : (
          <ul className="doc-list">
            {documents.map((doc) => (
              <li key={doc.id}>
                {doc.fileSrc ? <SafeImage className="doc-thumb" src={doc.fileSrc} alt={`Preview of ${doc.title}`} /> : <span className="doc-thumb image-fallback">No file</span>}
                <div>
                  <strong>{doc.title}</strong>
                  <span className="muted small">
                    {doc.docType}
                    {doc.sample ? ' · Fictional sample' : ''} · Added {formatDate(doc.createdAt)}
                  </span>
                  {doc.description ? <p className="small">{doc.description}</p> : null}
                  <StatusPill tone="progress">Supporting document attached</StatusPill>
                  {doc.fileSrc ? (
                    <a className="link-button small" href={doc.fileSrc} target="_blank" rel="noopener noreferrer">
                      Open document<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="muted small">
        Documents are provided by the organizer. Attaching a document does not mean it has been independently checked. Identity documents, home addresses and
        private verification files are never shown on public pages; identity review would require a future secure service.
      </p>
    </div>
  )
}
