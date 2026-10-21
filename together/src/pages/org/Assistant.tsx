import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LivePreview } from '../../components/LivePreview.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { COVERS, UPLOADED_COVER_ID } from '../../data/covers.ts'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import {
  activeSteps,
  answerSummary,
  ASSISTANT_STEPS,
  firstInvalidStep,
  OPTIONAL_STEPS,
  goalIdeas,
  nextStep,
  previousStep,
  purposeIdeas,
  stepHint,
  stepQuestion,
  STEP_GROUP,
  validateStep,
  type AssistantStepId,
} from '../../lib/assistant.ts'
import { makeAccessCode } from '../../lib/campaigns.ts'
import { formCampaignForOrg, publishWithPolicy } from '../../lib/featureActions.ts'
import { ResumeDrafts, SaveIndicator, SetupIndicator } from '../../components/drafts/DraftUI.tsx'
import { DraftReviewSummary } from '../../components/campaign/DraftReviewSummary.tsx'
import { campaignNeedsApproval } from '../../lib/features.ts'
import { AiBadge } from '../../components/ai/AiUI.tsx'
import { DraftSuggestions, NotedFacts } from '../../components/ai/DraftSuggestions.tsx'
import { ReadinessPanel } from '../../components/ai/ReadinessPanel.tsx'
import { SetupSuggestions } from '../../components/ai/SetupSuggestions.tsx'
import { BudgetLines } from '../../components/story/StoryDetails.tsx'
import { parseCampaignMessage } from '../../lib/ai/parse.ts'
import { readinessFromForm, type ReadinessField } from '../../lib/ai/readiness.ts'
import { useAutosave } from '../../hooks/useAutosave.ts'
import { deleteDraft, listDrafts, newDraftId, readDraft, saveDraft } from '../../lib/drafts.ts'
import { TEMPLATES, templateFor } from '../../lib/templates.ts'
import { CURRENCIES, currencySymbol, formatDateTime, formatMoney, isCurrencyCode, setDisplayCurrency, toDatetimeLocal } from '../../lib/format.ts'
import { GAME_THUMBS, gameMeta } from '../../lib/games.ts'
import { selectableGames } from '../../lib/organizations.ts'
import { StorageFullError } from '../../lib/storage.ts'
import type { CampaignForm, Organization } from '../../lib/types.ts'
import { blankForm, gameSettingsFields, requiredChecklist, validateAll, type FormErrors, type RequiredItem } from '../../lib/wizard.ts'

type Stage = AssistantStepId | 'review'

const STEP_LABELS: Record<AssistantStepId, string> = {
  purpose: 'Purpose',
  category: 'Campaign type',
  story: 'Beneficiaries & story',
  title: 'Title',
  goal: 'Target & currency',
  budget: 'Budget basis',
  dates: 'Dates',
  access: 'Visibility',
  participation: 'Ways to give',
  game: 'Game',
  amounts: 'Amounts',
  cover: 'Cover image',
}

/** Where each readiness result sends the organizer in the conversation. */
const READINESS_STEP: Partial<Record<ReadinessField, AssistantStepId>> = {
  title: 'title',
  description: 'purpose',
  cover: 'cover',
  goal: 'goal',
  dates: 'dates',
  amounts: 'amounts',
  participation: 'participation',
  access: 'access',
  puzzle: 'game',
  beneficiary: 'story',
  whoItHelps: 'story',
  whatItSupports: 'story',
  whatHappensNext: 'story',
  budget: 'budget',
  milestones: 'category',
  impact: 'purpose',
}

interface ChatStart {
  draftId: string
  form: CampaignForm
  stage: Stage
  resumedAt?: string
}

export function AssistantPage() {
  const { org, workspace } = useOrg()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const allowedGames = selectableGames(org)
  const [start, setStart] = useState<ChatStart | null>(() => {
    const id = params.get('draftId')
    if (id) {
      const draft = readDraft(id, org.id)
      if (draft) return { draftId: id, form: draft.form, stage: asStage(draft.step), resumedAt: draft.updatedAt }
      return { draftId: id, form: blankForm(org), stage: 'purpose' }
    }
    if (params.get('new') === '1' || listDrafts(org.id).length === 0) return { draftId: newDraftId(), form: blankForm(org), stage: 'purpose' }
    return null
  })
  const [drafts, setDrafts] = useState(() => listDrafts(org.id))

  useEffect(() => {
    if (start && params.get('draftId') !== start.draftId) setParams({ draftId: start.draftId }, { replace: true })
  }, [start, params, setParams])

  if (!org.visibility.assistant) return <AssistantOff org={org} />
  if (!start) {
    return (
      <div className="container narrow page-pad">
        <ResumeDrafts
          drafts={drafts}
          progress={(draft) => {
            const items = requiredChecklist(draft.form, allowedGames)
            return { done: items.filter((item) => item.done).length, total: items.length }
          }}
          onContinue={(draft) => {
            if (draft.kind === 'form') navigate(`${workspace}/campaigns/new?draftId=${draft.id}`)
            else setStart({ draftId: draft.id, form: draft.form, stage: asStage(draft.step), resumedAt: draft.updatedAt })
          }}
          onStartAnother={() => setStart({ draftId: newDraftId(), form: blankForm(org), stage: 'purpose' })}
          onDiscard={(draft) => {
            deleteDraft(draft.id)
            const next = listDrafts(org.id)
            setDrafts(next)
            if (next.length === 0) setStart({ draftId: newDraftId(), form: blankForm(org), stage: 'purpose' })
          }}
        />
      </div>
    )
  }
  return <AssistantChat key={start.draftId} org={org} start={start} />
}

function asStage(step: string): Stage {
  return step === 'review' || (ASSISTANT_STEPS as string[]).includes(step) ? (step as Stage) : 'purpose'
}


function AssistantOff({ org }: { org: Organization }) {
  const { workspace } = useOrg()
  return (
    <div className="container narrow page-pad">
      <div className="panel empty">
        <h1>The campaign assistant is turned off</h1>
        <p className="muted">
          {org.name} has hidden the campaign creation assistant. You can still create a campaign with the full form.
        </p>
        <div className="inline-actions center">
          <Link to={`${workspace}/campaigns/new?new=1`} className="btn btn-primary">
            Open the campaign form
          </Link>
          <Link to={`${workspace}/website`} className="btn btn-outline">
            Brand settings
          </Link>
        </div>
      </div>
    </div>
  )
}

function AssistantChat({ org, start }: { org: Organization; start: ChatStart }) {
  const { workspace } = useOrg()
  const navigate = useNavigate()
  const allowedGames = selectableGames(org)
  const [form, setForm] = useState<CampaignForm>(start.form)
  const [stage, setStage] = useState<Stage>(start.stage)
  const [returnToReview, setReturnToReview] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(() =>
    start.resumedAt ? { tone: 'info', text: `Continuing the draft you last edited on ${formatDateTime(start.resumedAt)}.` } : null,
  )
  const snapshot = useMemo(() => ({ form, stage }), [form, stage])
  const autosave = useAutosave(snapshot, (value) => {
    saveDraft({ id: start.draftId, organizationId: org.id, kind: 'assistant', form: value.form, step: value.stage })
  })
  const checklist = requiredChecklist(form, allowedGames)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [goalConfirmed, setGoalConfirmed] = useState(() => start.stage === 'review' || ASSISTANT_STEPS.indexOf(start.stage as AssistantStepId) > ASSISTANT_STEPS.indexOf('goal'))
  const currentRef = useRef<HTMLDivElement>(null)

  setDisplayCurrency(form.currency)

  useEffect(() => {
    document.title = `Campaign assistant — ${org.name}`
  }, [org.name])

  useEffect(() => {
    const node = currentRef.current
    if (!node) return
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    node.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
  }, [stage])

  function update(patch: Partial<CampaignForm>) {
    setForm((current) => ({ ...current, ...patch }))
    setErrors({})
  }

  function goTo(next: Stage) {
    setErrors({})
    setStage(next)
  }

  function submitStep(step: AssistantStepId) {
    const stepErrors = validateStep(step, form, allowedGames)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) return
    let current = form
    if (step === 'purpose') {
      // Only explicit facts are picked up; the organizer confirms them on later questions.
      const parsed = parseCampaignMessage(form.description)
      const patch: Partial<CampaignForm> = {}
      // Once the organizer has answered the target question, their answer wins; mismatches are flagged instead.
      if (parsed.amount && !goalConfirmed) {
        patch.goalAmount = String(parsed.amount)
        if (parsed.currency) patch.currency = parsed.currency
      }
      current = { ...form, ...patch }
      if (parsed.category && form.category === 'other') current = { ...current, category: parsed.category }
      setForm(current)
    }
    if (returnToReview) {
      const invalid = firstInvalidStep(form, allowedGames)
      if (invalid) {
        goTo(invalid)
        return
      }
      setReturnToReview(false)
      goTo('review')
      return
    }
    if (step === 'goal') setGoalConfirmed(true)
    goTo(nextStep(step, current))
  }

  function edit(step: AssistantStepId) {
    setReturnToReview(stage === 'review' || returnToReview)
    goTo(step)
  }

  function openGroup(group: 1 | 2 | 3 | 4) {
    if (group === 4) {
      reviewCampaign()
      return
    }
    const first = activeSteps(form).find((step) => STEP_GROUP[step] === group)
    if (first) edit(first)
  }

  function back() {
    const previous = previousStep(stage, form)
    if (previous) goTo(previous)
  }

  function discard() {
    if (!window.confirm('Discard this draft? Your answers on this device will be deleted.')) return
    deleteDraft(start.draftId)
    navigate(`${workspace}/campaigns`)
  }

  function saveAndExit() {
    if (!autosave.flush()) {
      setNotice({ tone: 'error', text: 'This browser could not save your draft, so it was kept open. Free up storage and try again.' })
      return
    }
    navigate(`${workspace}/campaigns`)
  }

  function skip(step: AssistantStepId) {
    if (returnToReview) {
      setReturnToReview(false)
      goTo('review')
      return
    }
    goTo(nextStep(step, form))
  }

  function reviewCampaign() {
    const invalid = firstInvalidStep(form, allowedGames)
    if (invalid) {
      setReturnToReview(true)
      goTo(invalid)
      setErrors(validateStep(invalid, form, allowedGames))
      return
    }
    goTo('review')
  }

  function openFullForm(step = 4) {
    try {
      saveDraft({ id: start.draftId, organizationId: org.id, kind: 'form', form, step: String(step) })
    } catch {
      setNotice({ tone: 'error', text: 'This browser could not save the draft, so it was not moved to the form.' })
      return
    }
    navigate(`${workspace}/campaigns/new?draftId=${start.draftId}`)
  }

  function create() {
    if (!confirmed) {
      setNotice({ tone: 'error', text: 'Tick “I’ve reviewed this campaign” first.' })
      return
    }
    const allErrors = validateAll(form, allowedGames)
    const invalid = firstInvalidStep(form, allowedGames)
    if (invalid || Object.keys(allErrors).length > 0) {
      setReturnToReview(true)
      if (invalid) {
        goTo(invalid)
        setErrors(validateStep(invalid, form, allowedGames))
      } else {
        setErrors(allErrors)
      }
      return
    }
    const campaign = formCampaignForOrg({ ...form, organizationId: org.id }, org, { isDraft: false })
    let mode: 'published' | 'pending_review'
    try {
      mode = publishWithPolicy(campaign, form.milestonePlan).mode
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof StorageFullError ? error.message : error instanceof Error ? error.message : 'The campaign could not be saved in this browser.',
      })
      return
    }
    deleteDraft(start.draftId)
    navigate(`${workspace}/campaigns?${mode === 'pending_review' ? 'pending' : 'created'}=${campaign.id}`)
  }

  const steps = activeSteps(form)
  const answered = stage === 'review' ? steps : steps.slice(0, Math.max(0, steps.indexOf(stage)))
  const outline = stage === 'review' ? steps : steps.filter((step) => STEP_GROUP[step] === STEP_GROUP[stage])

  return (
    <div className="container page-pad assistant">
      <div className="inline-actions assistant-links">
        <Link to={`${workspace}/campaigns`} className="back-link page-back">
          ← Back to campaigns
        </Link>
        <button type="button" className="link-button" onClick={() => openFullForm(1)}>
          Prefer a form? Switch to the form
        </button>
      </div>
      <div className="assistant-head">
        <div className="assistant-title">
          <OrgLogoMark org={org} size={48} />
          <div>
            <h1>Campaign assistant</h1>
            <p className="muted">
              Create a campaign for <strong>{org.name}</strong>, one question at a time.
            </p>
          </div>
        </div>
      </div>
      <details className="assistant-note">
        <summary>
          <AiBadge />
          <span className="small">What does this mean?</span>
        </summary>
        <p className="small">
          A simulated conversation built on fixed rules. It only uses what you type and your organization’s settings — it never invents beneficiaries, costs,
          dates or impact. Nothing is published until you choose <strong>{campaignNeedsApproval(org) ? 'Submit for review' : 'Publish campaign'}</strong>.
        </p>
      </details>
      <div className="draft-bar">
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} error={autosave.error} />
        <span className="inline-actions">
          <details className="draft-menu">
            <summary className="link-button">More</summary>
            <div className="draft-menu-list">
              <Link to={`${workspace}/assistant?new=1`} reloadDocument className="link-button">
                Start another draft
              </Link>
              <button type="button" className="link-button danger" onClick={discard}>
                Discard draft
              </button>
            </div>
          </details>
          <button type="button" className="btn btn-outline btn-sm" onClick={saveAndExit}>
            Save and exit
          </button>
        </span>
      </div>
      <SetupIndicator items={checklist} current={stage === 'review' ? 4 : STEP_GROUP[stage]} onGroup={openGroup} />
      {notice ? (
        <div className={`notice ${notice.tone === 'info' ? 'warn' : notice.tone}`} role="status">
          <span>{notice.text}</span>
        </div>
      ) : null}

      <div className="assistant-mobile-toggle" role="group" aria-label="Assistant view">
        <button type="button" aria-pressed={!showPreview} className={!showPreview ? 'chip selected' : 'chip'} onClick={() => setShowPreview(false)}>
          Questions
        </button>
        <button type="button" aria-pressed={showPreview} className={showPreview ? 'chip selected' : 'chip'} onClick={() => setShowPreview(true)}>
          Draft preview
        </button>
      </div>

      <div className={showPreview ? 'assistant-grid with-steps show-preview' : 'assistant-grid with-steps'}>
        <nav className="assistant-steps panel" aria-label="Questions in this section">
          <ol>
            {outline.map((step) => {
              const done = answered.includes(step)
              const current = stage === step
              return (
                <li key={step} className={current ? 'current' : done ? 'done' : ''}>
                  {done && !current ? (
                    <button type="button" onClick={() => edit(step)}>
                      <span aria-hidden="true">✓</span> {STEP_LABELS[step]}
                      <span className="sr-only"> — edit answer</span>
                    </button>
                  ) : (
                    <span aria-current={current ? 'step' : undefined}>
                      <span aria-hidden="true">{current ? '●' : '○'}</span> {STEP_LABELS[step]}
                      {OPTIONAL_STEPS.includes(step) ? <em> optional</em> : null}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
        <section className="panel chat" aria-label="Conversation">
          <ol className="chat-log" aria-live="polite">
            <li className="chat-pair">
              <BotBubble org={org}>
                Let’s create a campaign for {org.name}. I’ve prefilled what I know: organizer name, {org.defaults.currency} as the default currency, suggested amounts and the games
                turned on for you. You can change any of it.
              </BotBubble>
            </li>
            {answered.map((step) => (
              <li key={step} className="chat-pair">
                <BotBubble org={org}>{stepQuestion(step, org)}</BotBubble>
                <div className="chat-user">
                  <p>{answerSummary(step, form)}</p>
                  <button type="button" className="chat-edit" onClick={() => edit(step)} aria-label={`Edit answer: ${stepQuestion(step, org)}`}>
                    Edit
                  </button>
                </div>
                {step === 'purpose' ? <NotedFacts form={form} org={org} /> : null}
              </li>
            ))}
          </ol>

          <div ref={currentRef} className={answered.length > 0 ? 'chat-current' : 'chat-current first'}>
            {stage === 'review' ? (
              <>
                <ReviewCard org={org} form={form} onEdit={openGroup} onChange={update} errors={errors} checklist={checklist} />
                <DraftSuggestions form={form} org={org} allowedGames={allowedGames} onChange={update} />
                <ReadinessPanel
                  input={readinessFromForm(form, org, allowedGames)}
                  onJump={(field) => {
                    if (field === 'contact' || field === 'documents') navigate(`${workspace}/website`)
                    else if (field === 'organizer') document.getElementById('a-organizer')?.focus()
                    else edit(READINESS_STEP[field] ?? 'purpose')
                  }}
                  applicable={['whatItSupports', 'whatHappensNext']}
                  onApply={(field, text) => update(field === 'whatItSupports' ? { storySupports: text } : { storyNext: text })}
                />
                <label className="check-row confirm-row">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  I’ve reviewed this campaign for {org.name}.
                </label>
              </>
            ) : (
              <>
                <BotBubble org={org}>
                  {stepQuestion(stage, org)}
                  <span className="chat-hint">{stepHint(stage, org)}</span>
                </BotBubble>
                <form
                  className="chat-answer"
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault()
                    submitStep(stage)
                  }}
                >
                  <StepInput step={stage} form={form} org={org} errors={errors} onChange={update} />
                  <div className="chat-actions">
                    {previousStep(stage, form) ? (
                      <button type="button" className="btn btn-outline" onClick={back}>
                        Back
                      </button>
                    ) : null}
                    {OPTIONAL_STEPS.includes(stage) ? (
                      <button type="button" className="btn btn-outline" onClick={() => skip(stage)}>
                        Skip for now
                      </button>
                    ) : null}
                    <button type="submit" className="btn btn-primary">
                      {returnToReview ? 'Save answer' : nextStep(stage, form) === 'review' ? 'Finish' : 'Continue'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>

        <aside className="assistant-aside">
          <LivePreview form={form} />
          <div className="aside-actions">
            {stage === 'review' ? (
              <button type="button" className="btn btn-primary" onClick={create} disabled={!confirmed}>
                {campaignNeedsApproval(org) ? 'Submit for review' : 'Publish campaign'}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={reviewCampaign}>
                Review campaign
              </button>
            )}
          </div>
          {stage === 'review' ? (
            <button type="button" className="link-button" onClick={() => openFullForm()}>
              Fine-tune in the full form (game rates, logo, auto-close)
            </button>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function BotBubble({ org, children }: { org: Organization; children: ReactNode }) {
  return (
    <div className="chat-bot">
      <OrgLogoMark org={org} size={32} />
      <p>{children}</p>
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="chat-chips" role="group" aria-label={label}>
      {children}
    </div>
  )
}

function Chip({ selected = false, onClick, children }: { selected?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={selected ? 'chip selected' : 'chip'} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  )
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p className="error-text" id={id} role="alert">
      {error}
    </p>
  ) : null
}

function StepInput({
  step,
  form,
  org,
  errors,
  onChange,
}: {
  step: AssistantStepId
  form: CampaignForm
  org: Organization
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  const allowed = selectableGames(org)
  const cover = useImagePicker((data) => onChange({ coverImageId: UPLOADED_COVER_ID, coverImageData: data }), {
    maxWidth: 1400,
    maxHeight: 900,
    type: 'image/jpeg',
    quality: 0.8,
  })
  const puzzle = useImagePicker((data) => onChange({ puzzleImageData: data }), {
    maxWidth: 1200,
    maxHeight: 1200,
    type: 'image/jpeg',
    quality: 0.82,
  })
  const [amountDraft, setAmountDraft] = useState('')

  switch (step) {
    case 'purpose':
      return (
        <>
          <ChipRow label="Ideas">
            {purposeIdeas(org.type).map((idea) => (
              <Chip
                key={idea.label}
                selected={form.description === idea.description}
                onClick={() =>
                  onChange({
                    description: idea.description,
                    title: form.title.trim() ? form.title : idea.title,
                    coverImageId: idea.coverImageId,
                  })
                }
              >
                {idea.label}
              </Chip>
            ))}
          </ChipRow>
          <label className="sr-only" htmlFor="a-purpose">
            Campaign purpose
          </label>
          <textarea
            id="a-purpose"
            data-autofocus
            rows={4}
            maxLength={1000}
            value={form.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'a-purpose-error' : undefined}
            placeholder="Who does it help, and what will the money pay for?"
            onChange={(event) => onChange({ description: event.target.value })}
          />
          <ErrorText id="a-purpose-error" error={errors.description} />
        </>
      )
    case 'category': {
      return (
        <>
          <ChipRow label="Campaign types">
            {TEMPLATES.map((template, index) => (
              <button
                key={template.id}
                type="button"
                data-autofocus={index === 0 ? true : undefined}
                className={form.category === template.id ? 'chip selected' : 'chip'}
                aria-pressed={form.category === template.id}
                onClick={() => onChange({ category: template.id })}
              >
                {template.label}
              </button>
            ))}
          </ChipRow>
          <p className="help">
            {templateFor(form.category).blurb} At review you can accept suggested milestones and a game for this type — nothing is added until you do.
          </p>
          <SetupSuggestions form={form} allowedGames={allowed} onChange={onChange} />
        </>
      )
    }
    case 'story': {
      const template = templateFor(form.category)
      return (
        <>
          <label className="field-label" htmlFor="a-who">
            Who this helps
          </label>
          <textarea id="a-who" data-autofocus rows={2} maxLength={600} value={form.storyWho} placeholder={template.prompts.who} onChange={(event) => onChange({ storyWho: event.target.value })} />
          <label className="field-label" htmlFor="a-supports">
            What contributions will pay for
          </label>
          <textarea id="a-supports" rows={2} maxLength={600} value={form.storySupports} placeholder={template.prompts.supports} onChange={(event) => onChange({ storySupports: event.target.value })} />
          <label className="field-label" htmlFor="a-next">
            What happens next
          </label>
          <textarea id="a-next" rows={2} maxLength={600} value={form.storyNext} placeholder={template.prompts.next} onChange={(event) => onChange({ storyNext: event.target.value })} />
        </>
      )
    }
    case 'title':
      return (
        <>
          <label className="sr-only" htmlFor="a-title">
            Campaign name
          </label>
          <input
            id="a-title"
            data-autofocus
            maxLength={80}
            value={form.title}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'a-title-error' : undefined}
            placeholder="Grow Our School Library"
            onChange={(event) => onChange({ title: event.target.value })}
          />
          <ErrorText id="a-title-error" error={errors.title} />
        </>
      )
    case 'goal':
      return (
        <>
          <ChipRow label="Suggested targets">
            {goalIdeas(org).map((amount) => (
              <Chip key={amount} selected={form.goalAmount === String(amount)} onClick={() => onChange({ goalAmount: String(amount) })}>
                {formatMoney(amount, form.currency)}
              </Chip>
            ))}
          </ChipRow>
          <div className="input-prefix">
            <span>{currencySymbol(form.currency)}</span>
            <label className="sr-only" htmlFor="a-goal">
              Fundraising target
            </label>
            <input
              id="a-goal"
              data-autofocus
              inputMode="numeric"
              value={form.goalAmount}
              aria-invalid={Boolean(errors.goalAmount)}
              aria-describedby={errors.goalAmount ? 'a-goal-error' : undefined}
              onChange={(event) => onChange({ goalAmount: event.target.value.replace(/[^\d]/g, '') })}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="a-currency">
              Currency
            </label>
            <select id="a-currency" value={form.currency} onChange={(event) => isCurrencyCode(event.target.value) && onChange({ currency: event.target.value })}>
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <ErrorText id="a-goal-error" error={errors.goalAmount} />
        </>
      )
    case 'budget':
      return <BudgetLines form={form} onChange={onChange} error={errors.budget} />
    case 'dates': {
      const preset = (startOffsetDays: number, durationDays: number) => {
        const opens = new Date()
        if (startOffsetDays === 0) opens.setMinutes(opens.getMinutes() - 5)
        else {
          opens.setDate(opens.getDate() + startOffsetDays)
          opens.setHours(9, 0, 0, 0)
        }
        const closes = new Date(opens)
        closes.setDate(closes.getDate() + durationDays)
        closes.setHours(18, 0, 0, 0)
        onChange({ opensAt: toDatetimeLocal(opens.toISOString()), closesAt: toDatetimeLocal(closes.toISOString()) })
      }
      return (
        <>
          <ChipRow label="Quick schedules">
            <Chip onClick={() => preset(0, org.defaults.durationDays)}>Start now · {org.defaults.durationDays} days</Chip>
            <Chip onClick={() => preset(7, 14)}>Next week · 2 weeks</Chip>
            <Chip onClick={() => preset(0, 60)}>Start now · 2 months</Chip>
          </ChipRow>
          <div className="two-col">
            <div className="field">
              <label className="field-label" htmlFor="a-opens">
                Opens
              </label>
              <input
                id="a-opens"
                data-autofocus
                type="datetime-local"
                value={form.opensAt}
                aria-invalid={Boolean(errors.opensAt)}
                onChange={(event) => onChange({ opensAt: event.target.value })}
              />
              <ErrorText id="a-opens-error" error={errors.opensAt} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="a-closes">
                Closes
              </label>
              <input
                id="a-closes"
                type="datetime-local"
                value={form.closesAt}
                aria-invalid={Boolean(errors.closesAt)}
                onChange={(event) => onChange({ closesAt: event.target.value })}
              />
              <ErrorText id="a-closes-error" error={errors.closesAt} />
            </div>
          </div>
        </>
      )
    }
    case 'access':
      return (
        <>
          <ChipRow label="Group type">
            <Chip selected={form.access === 'open'} onClick={() => onChange({ access: 'open' })}>
              Open to everyone
            </Chip>
            <Chip
              selected={form.access === 'closed'}
              onClick={() => onChange({ access: 'closed', accessCode: form.accessCode || makeAccessCode() })}
            >
              Closed group
            </Chip>
          </ChipRow>
          {form.access === 'closed' ? (
            <div className="field">
              <label className="field-label" htmlFor="a-code">
                Demo access code
              </label>
              <input
                id="a-code"
                data-autofocus
                maxLength={12}
                value={form.accessCode}
                aria-invalid={Boolean(errors.accessCode)}
                onChange={(event) => onChange({ accessCode: event.target.value.toUpperCase() })}
              />
              <ErrorText id="a-code-error" error={errors.accessCode} />
            </div>
          ) : (
            <span data-autofocus tabIndex={-1} />
          )}
        </>
      )
    case 'participation': {
      const gamesOn = allowed.length > 0
      const directOn = org.visibility.direct
      const pick = (direct: boolean, game: boolean) => {
        const gameType = game && !allowed.includes(form.gameType) ? allowed[0] : form.gameType
        onChange({ direct, game, gameType, ...(gameType !== form.gameType ? gameSettingsFields(gameType) : {}) })
      }
      return (
        <>
          <ChipRow label="Ways to take part">
            {directOn && gamesOn ? (
              <Chip selected={form.direct && form.game} onClick={() => pick(true, true)}>
                Both
              </Chip>
            ) : null}
            {directOn ? (
              <Chip selected={form.direct && !form.game} onClick={() => pick(true, false)}>
                Donate directly
              </Chip>
            ) : null}
            {gamesOn ? (
              <Chip selected={!form.direct && form.game} onClick={() => pick(false, true)}>
                Play a game
              </Chip>
            ) : null}
          </ChipRow>
          {!gamesOn ? <p className="help">Games are turned off for {org.name}, so supporters give directly.</p> : null}
          {!directOn ? <p className="help">Direct contributions are hidden for {org.name}, so supporters play a game.</p> : null}
          <span data-autofocus tabIndex={-1} />
          <ErrorText id="a-part-error" error={errors.form} />
        </>
      )
    }
    case 'game':
      return (
        <>
          <div className="chat-games" role="radiogroup" aria-label="Available games">
            {allowed.map((game, index) => (
              <button
                key={game}
                type="button"
                role="radio"
                aria-checked={form.gameType === game}
                data-autofocus={index === 0 ? true : undefined}
                className={form.gameType === game ? 'chat-game selected' : 'chat-game'}
                onClick={() => onChange({ gameType: game, ...gameSettingsFields(game) })}
              >
                <img src={game === 'puzzle' && form.puzzleImageData ? form.puzzleImageData : GAME_THUMBS[game]} alt="" />
                <strong>{gameMeta(game).name}</strong>
                <span>{gameMeta(game).blurb}</span>
              </button>
            ))}
          </div>
          {form.gameType === 'puzzle' ? (
            <div className="chat-upload">
              {puzzle.input}
              <p className="help">The Community Puzzle needs a picture for supporters to piece together.</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={puzzle.open} disabled={puzzle.busy}>
                {puzzle.busy ? 'Processing…' : form.puzzleImageData ? 'Replace puzzle image' : 'Upload puzzle image'}
              </button>
              <ErrorText id="a-puzzle-error" error={puzzle.error || errors.puzzleImageData} />
            </div>
          ) : null}
          <ErrorText id="a-game-error" error={errors.gameType} />
        </>
      )
    case 'amounts': {
      const addAmount = () => {
        const amount = Number(amountDraft)
        if (!/^\d+$/.test(amountDraft) || amount <= 0 || form.fixedAmounts.includes(amount) || form.fixedAmounts.length >= 5) return
        onChange({ fixedAmounts: [...form.fixedAmounts, amount].sort((a, b) => a - b), donationMode: 'fixed' })
        setAmountDraft('')
      }
      return (
        <>
          <ChipRow label="Amount style">
            <Chip
              selected={form.donationMode === 'fixed'}
              onClick={() =>
                onChange({ donationMode: 'fixed', fixedAmounts: form.fixedAmounts.length ? form.fixedAmounts : [...org.defaults.suggestedAmounts] })
              }
            >
              Suggested amounts
            </Chip>
            <Chip selected={form.donationMode === 'custom'} onClick={() => onChange({ donationMode: 'custom' })}>
              Let supporters choose
            </Chip>
          </ChipRow>
          {form.donationMode === 'fixed' ? (
            <div className="amount-chips">
              {form.fixedAmounts.map((amount) => (
                <span key={amount} className="amount-chip-pro">
                  {formatMoney(amount, form.currency)}
                  {form.fixedAmounts.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove ${formatMoney(amount, form.currency)}`}
                      onClick={() => onChange({ fixedAmounts: form.fixedAmounts.filter((item) => item !== amount) })}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
              <span className="amount-add">
                <input
                  data-autofocus
                  inputMode="numeric"
                  value={amountDraft}
                  placeholder={`${currencySymbol(form.currency)} Add`}
                  aria-label="New suggested amount"
                  onChange={(event) => setAmountDraft(event.target.value.replace(/[^\d]/g, ''))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && amountDraft) {
                      event.preventDefault()
                      addAmount()
                    }
                  }}
                />
                <button type="button" onClick={addAmount}>
                  Add
                </button>
              </span>
            </div>
          ) : (
            <p className="help" data-autofocus tabIndex={-1}>
              Supporters type any whole amount.
            </p>
          )}
          <ErrorText id="a-amounts-error" error={errors.fixedAmounts} />
        </>
      )
    }
    case 'cover':
      return (
        <>
          <div className="cover-grid chat-covers">
            {COVERS.map((template, index) => (
              <button
                key={template.id}
                type="button"
                data-autofocus={index === 0 ? true : undefined}
                className={form.coverImageId === template.id ? 'cover-choice selected' : 'cover-choice'}
                aria-pressed={form.coverImageId === template.id}
                onClick={() => onChange({ coverImageId: template.id })}
              >
                <img src={template.src} alt="" />
                <span>{template.label}</span>
              </button>
            ))}
            <button
              type="button"
              className={form.coverImageId === UPLOADED_COVER_ID ? 'cover-choice upload selected' : 'cover-choice upload'}
              aria-pressed={form.coverImageId === UPLOADED_COVER_ID}
              onClick={() => (form.coverImageData ? onChange({ coverImageId: UPLOADED_COVER_ID }) : cover.open())}
            >
              {form.coverImageData ? (
                <img src={form.coverImageData} alt="" />
              ) : (
                <span className="upload-copy">
                  <b>+</b>
                  {cover.busy ? 'Processing…' : 'Upload image'}
                </span>
              )}
              {form.coverImageData ? <span>Your upload</span> : null}
            </button>
          </div>
          {cover.input}
          <ErrorText id="a-cover-error" error={cover.error || errors.coverImageId} />
        </>
      )
  }
}

function ReviewCard({
  org,
  form,
  errors,
  onEdit,
  onChange,
  checklist,
}: {
  org: Organization
  form: CampaignForm
  errors: FormErrors
  onEdit: (group: 1 | 2 | 3) => void
  onChange: (patch: Partial<CampaignForm>) => void
  checklist: RequiredItem[]
}) {
  return (
    <div className="chat-review">
      <BotBubble org={org}>Here’s your campaign. Check each answer, edit anything, then create it when you’re ready.</BotBubble>
      <DraftReviewSummary form={form} items={checklist} onEdit={onEdit} />
      <div className="field">
        <label className="field-label" htmlFor="a-organizer">
          Organizer name shown to supporters
        </label>
        <input
          id="a-organizer"
          data-autofocus
          maxLength={60}
          value={form.organizerName}
          aria-invalid={Boolean(errors.organizerName)}
          onChange={(event) => onChange({ organizerName: event.target.value })}
        />
        <ErrorText id="a-organizer-error" error={errors.organizerName} />
      </div>
      <p className="help">
        The campaign will be saved under <strong>{org.name}</strong> in {form.currency}. Nothing is published until you choose {campaignNeedsApproval(org) ? 'Submit for review' : 'Publish campaign'}.
      </p>
    </div>
  )
}
