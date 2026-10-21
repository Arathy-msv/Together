import { useState, type ReactNode } from 'react'
import { formatDate, formatDateTime } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import { GAME_EXPLANATION } from '../../lib/gameContribution.ts'
import { useLowData } from '../../lib/lowData.ts'
import {
  campaignMilestones,
  deliverySummary,
  EXPENSE_CATEGORY_LABEL,
  formatMinor,
  fundSummary,
  isMilestoneDelayed,
  latestUpdateDate,
  MILESTONE_LABEL,
  milestoneRecords,
  publicDocuments,
  publishedExpenses,
  publishedUpdates,
  UPDATE_TYPE_LABEL,
} from '../../lib/transparency.ts'
import { LanguageToggle } from '../ai/Translation.tsx'
import { uiLabel, type LanguageCode } from '../../lib/ai/translations.ts'
import type { Campaign, CampaignTextKey, CampaignUpdate, DemoStore, Expense, ExpenseCategory, MediaItem, MediaVideo, Milestone, Organization } from '../../lib/types.ts'
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
  const lowData = useLowData()
  const [reveal, setReveal] = useState(false)
  if (items.length === 0) return null
  if (lowData && !reveal) {
    return (
      <p className="low-data-hold">
        <span className="muted small">
          {items.length === 1 ? '1 photo' : `${items.length} photos`} hidden to save data.
        </span>{' '}
        <button type="button" className="link-button small" onClick={() => setReveal(true)}>
          Show {items.length === 1 ? 'photo' : 'photos'}
        </button>
      </p>
    )
  }
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
  const lowData = useLowData()
  const [reveal, setReveal] = useState(false)
  if (!video) return null
  if (lowData && !reveal) {
    return (
      <p className="low-data-hold">
        <span className="muted small">Video hidden to save data{video.caption ? `: ${video.caption}` : ''}.</span>{' '}
        <button type="button" className="link-button small" onClick={() => setReveal(true)}>
          Load video
        </button>
      </p>
    )
  }
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

interface TimelineLinks {
  store: DemoStore
  currency: Campaign['currency']
  onOpenExpenses?: (milestoneId: string) => void
  onOpenUpdate?: (updateId: string) => void
}

/** Milestone → expenses → evidence → updates, as one readable chain. */
function LinkedRecords({ milestone, links }: { milestone: Milestone; links: TimelineLinks }) {
  const records = milestoneRecords(links.store, milestone)
  if (records.expenses.length === 0 && records.updates.length === 0) return <p className="muted small linked-records">No expenses or updates linked yet.</p>
  return (
    <ol className="linked-records" aria-label={`Records linked to ${milestone.title}`}>
      <li>
        <span className="linked-label">Expenses</span>
        {records.expenses.length ? (
          links.onOpenExpenses ? (
            <button type="button" className="link-button small" onClick={() => links.onOpenExpenses!(milestone.id)}>
              {records.expenses.length} · {formatMinor(records.spentMinor, links.currency)}
            </button>
          ) : (
            <span className="small">
              {records.expenses.length} · {formatMinor(records.spentMinor, links.currency)}
            </span>
          )
        ) : (
          <span className="small muted">None yet</span>
        )}
      </li>
      <li>
        <span className="linked-label">Evidence</span>
        <span className="small">{records.expenses.length ? `${records.withEvidence} of ${records.expenses.length} with a public receipt` : '—'}</span>
      </li>
      <li>
        <span className="linked-label">Updates</span>
        {records.updates.length ? (
          <span className="small linked-updates">
            {records.updates.map((update) =>
              links.onOpenUpdate ? (
                <button key={update.id} type="button" className="link-button small" onClick={() => links.onOpenUpdate!(update.id)}>
                  {update.title}
                </button>
              ) : (
                <span key={update.id}>{update.title}</span>
              ),
            )}
          </span>
        ) : (
          <span className="small muted">None yet</span>
        )}
      </li>
    </ol>
  )
}

export function MilestoneTimeline({ milestones, compact = false, links }: { milestones: Milestone[]; compact?: boolean; links?: TimelineLinks }) {
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
            <li key={milestone.id} className={`timeline-item is-${tone}`}>
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
                {!compact && links ? <LinkedRecords milestone={milestone} links={links} /> : null}
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
  const [language, setLanguage] = useState<LanguageCode>('en')
  const ml = campaign.translations?.ml
  const shown = (key: CampaignTextKey, original: string) => (language === 'ml' ? ml?.[key] : original)
  const sections = (
    [
      ['What is needed?', 'whatTheyNeed', story?.whatTheyNeed],
      ['Who will benefit?', 'whoItHelps', story?.whoItHelps],
      ['How will funds be used?', 'whatItSupports', story?.whatItSupports],
      ['What happens next?', 'whatHappensNext', story?.whatHappensNext],
    ] as Array<[string, CampaignTextKey, string | undefined]>
  ).filter((entry): entry is [string, CampaignTextKey, string] => Boolean(entry[2]?.trim()))
  const budget = campaign.budget ?? []
  const budgetTotal = budget.reduce((sum, line) => sum + line.amountMinor, 0)
  const milestones = campaignMilestones(store, campaign.id)
  return (
    <div className="tab-body" lang={language}>
      {ml ? <LanguageToggle language={language} onChange={setLanguage} /> : null}
      <TranslatedText className="story-lead" text={shown('description', campaign.description)} language={language} />
      {sections.length > 0 ? (
        <div className="story-grid">
          {sections.map(([title, key, text]) => (
            <section key={title}>
              <h3>{uiLabel(title, language)}</h3>
              <TranslatedText text={shown(key, text)} language={language} />
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
          <p className="muted small">The organizer’s plan. Planned amounts are not spending — see “How funds are used” for reported expenses.</p>
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
          <h3>Giving through {gameMeta(campaign.gameType).name}</h3>
          <p className="muted">{GAME_EXPLANATION}</p>
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

/** Shows translated text, or a clear marker when a part has not been translated — never the original as if translated. */
function TranslatedText({ text, language, className }: { text: string | undefined; language: LanguageCode; className?: string }) {
  if (text?.trim()) return <p className={className}>{text}</p>
  return (
    <p className={`${className ?? ''} not-translated`} lang="en">
      {language === 'ml' ? `${uiLabel('Not translated yet', 'ml')} · Not translated yet` : ''}
    </p>
  )
}

function UpdateCard({ update, store, campaign }: { update: CampaignUpdate; store: DemoStore; campaign: Campaign }) {
  const [language, setLanguage] = useState<LanguageCode>('en')
  const ml = update.translations?.ml
  const milestone = update.milestoneId ? store.milestones.find((item) => item.id === update.milestoneId) : undefined
  const expenses = update.expenseIds
    .map((id) => store.expenses.find((item) => item.id === id && item.status === 'published'))
    .filter((item): item is Expense => Boolean(item))
  return (
    <article className="update-card" id={`update-${update.id}`} tabIndex={-1}>
      <header>
        <StatusPill tone={update.type === 'delay' ? 'warn' : 'neutral'}>{UPDATE_TYPE_LABEL[update.type]}</StatusPill>
        <time dateTime={update.date}>{formatDate(update.date)}</time>
      </header>
      {ml ? <LanguageToggle language={language} onChange={setLanguage} /> : null}
      <h3 lang={language}>{language === 'ml' ? (ml?.title ?? 'Not translated yet') : update.title}</h3>
      {update.body ? <TranslatedText className="update-body" text={language === 'ml' ? ml?.body : update.body} language={language} /> : null}
      <MediaGallery items={update.media} />
      <VideoBlock video={update.video} />
      {milestone || expenses.length ? (
        <footer>
          {milestone ? <span className="muted small">Milestone: {milestone.title}</span> : null}
          {expenses.length ? (
            <span className="muted small">
              Related organizer-reported expenses: {expenses.map((item) => `${item.description} (${formatMinor(item.amountMinor, campaign.currency)})`).join('; ')}. Counted once under “How funds are used”.
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

export function UpdatesTab({
  campaign,
  store,
  follow,
  onOpenExpenses,
}: {
  campaign: Campaign
  store: DemoStore
  follow: ReactNode
  onOpenExpenses?: (milestoneId: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  function openUpdate(id: string) {
    setShowAll(true)
    requestAnimationFrame(() => {
      const node = document.getElementById(`update-${id}`)
      node?.scrollIntoView({ block: 'start' })
      node?.focus()
    })
  }
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
        <MilestoneTimeline milestones={milestones} links={{ store, currency: campaign.currency, onOpenExpenses, onOpenUpdate: openUpdate }} />
      </section>
      <section>
        <div className="section-head-row">
          <h3>Updates</h3>
          {follow}
        </div>
        {updates.length === 0 ? (
          <p className="awaiting">No updates yet. The organizer hasn’t posted one.</p>
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

export function FundUseTab({ campaign, store, initialMilestone }: { campaign: Campaign; store: DemoStore; initialMilestone?: string | null }) {
  const summary = fundSummary(campaign, store)
  const expenses = publishedExpenses(store, campaign.id)
  const milestones = campaignMilestones(store, campaign.id)
  const [category, setCategory] = useState<'all' | ExpenseCategory>('all')
  const [milestoneId, setMilestoneId] = useState(() => (initialMilestone && milestones.some((item) => item.id === initialMilestone) ? initialMilestone : 'all'))
  const visible = expenses.filter(
    (item) => (category === 'all' || item.category === category) && (milestoneId === 'all' || item.milestoneId === milestoneId),
  )
  const outstanding = milestones.filter((item) => item.status !== 'reported_complete')
  return (
    <div className="tab-body">
      <div className="fund-cards">
        <div className="fund-card">
          <span>Raised (simulated)</span>
          <strong>{formatMinor(summary.contributedMinor, campaign.currency)}</strong>
        </div>
        <div className="fund-card">
          <span>Organizer-reported expenses</span>
          <strong>{formatMinor(summary.spentMinor, campaign.currency)}</strong>
        </div>
        <div className={summary.balanceMinor < 0 ? 'fund-card negative' : 'fund-card'}>
          <span>Not yet spent (demo calculation)</span>
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
          <h3>Organizer-reported expenses</h3>
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
          <p className="awaiting">No expenses reported yet.</p>
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
                      {expense.publicReceipt ? <StatusPill tone="progress">Supporting document attached</StatusPill> : <StatusPill tone="neutral">No supporting evidence uploaded</StatusPill>}
                    </span>
                  </summary>
                  <div className="expense-detail">
                    {expense.milestoneId ? <p className="small">Milestone: {milestones.find((item) => item.id === expense.milestoneId)?.title}</p> : null}
                    {(() => {
                      const related = publishedUpdates(store, campaign.id).filter((item) => item.expenseIds.includes(expense.id))
                      return related.length ? <p className="small">Mentioned in updates: {related.map((item) => `“${item.title}”`).join(', ')}</p> : null
                    })()}
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
    { label: 'Organizer', value: `${campaign.organizerName} · ${org.name}`, state: null },
    {
      label: 'Organizer-provided contact',
      value: org.content.contactEmail || 'Not provided',
      state: null,
    },
    {
      label: 'Who benefits',
      value: campaign.story?.beneficiary?.trim() || 'Not provided',
      state: null,
    },
    {
      label: 'Supporting documents',
      value: documents.length ? `${documents.length} public document${documents.length === 1 ? '' : 's'}` : 'None yet',
      state: documents.length ? <StatusPill tone="progress">Supporting document attached</StatusPill> : null,
    },
    {
      label: 'Last public update',
      value: lastUpdate ? formatDateTime(lastUpdate) : 'No updates yet',
      state: null,
    },
    {
      label: 'Independent verification',
      value: 'No one outside the organizer has checked this information.',
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
