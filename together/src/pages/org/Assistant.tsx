import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/illustrations.tsx'
import { LivePreview } from '../../components/LivePreview.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { COVERS, UPLOADED_COVER_ID } from '../../data/covers.ts'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import {
  activeSteps,
  answerSummary,
  firstInvalidStep,
  OPTIONAL_STEPS,
  goalIdeas,
  nextStep,
  previousStep,
  purposeIdeas,
  stepHint,
  stepQuestion,
  validateStep,
  type AssistantStepId,
} from '../../lib/assistant.ts'
import { makeAccessCode, publishCampaign } from '../../lib/campaigns.ts'
import { RequiredProgress, ResumeDrafts, SaveIndicator } from '../../components/drafts/DraftUI.tsx'
import { useAutosave } from '../../hooks/useAutosave.ts'
import { deleteDraft, listDrafts, newDraftId, readDraft, saveDraft } from '../../lib/drafts.ts'
import { applyTemplate, TEMPLATES, templateFor } from '../../lib/templates.ts'
import { currencySymbol, formatDateTime, formatMoney, setDisplayCurrency, toDatetimeLocal } from '../../lib/format.ts'
import { GAME_THUMBS, gameMeta } from '../../lib/games.ts'
import { selectableGames } from '../../lib/organizations.ts'
import { StorageFullError } from '../../lib/storage.ts'
import type { CampaignForm, Organization } from '../../lib/types.ts'
import { blankForm, formToCampaign, gameSettingsFields, requiredChecklist, validateAll, type FormErrors } from '../../lib/wizard.ts'

type Stage = AssistantStepId | 'review'

interface ChatStart {
  draftId: string
  form: CampaignForm
  stage: Stage
  resumedAt?: string
}

export function AssistantPage() {
  const { org, base } = useOrg()
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
            if (draft.kind === 'form') navigate(`${base}/create?draftId=${draft.id}`)
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
  return step === 'review' || (ASSISTANT_STEP_IDS as string[]).includes(step) ? (step as Stage) : 'purpose'
}

const ASSISTANT_STEP_IDS: AssistantStepId[] = ['purpose', 'category', 'story', 'title', 'goal', 'dates', 'access', 'participation', 'game', 'amounts', 'cover']

function AssistantOff({ org }: { org: Organization }) {
  const { base } = useOrg()
  return (
    <div className="container narrow page-pad">
      <div className="panel empty">
        <h1>The campaign assistant is turned off</h1>
        <p className="muted">
          {org.name} has hidden the campaign creation assistant. You can still create a campaign with the full form.
        </p>
        <div className="inline-actions center">
          <Link to={`${base}/create?new=1`} className="btn btn-primary">
            Open the campaign form
          </Link>
          <Link to={`${base}/settings`} className="btn btn-outline">
            Brand settings
          </Link>
        </div>
      </div>
    </div>
  )
}

function AssistantChat({ org, start }: { org: Organization; start: ChatStart }) {
  const { base } = useOrg()
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
    goTo(nextStep(step, form))
  }

  function edit(step: AssistantStepId) {
    setReturnToReview(stage === 'review' || returnToReview)
    goTo(step)
  }

  function back() {
    const previous = previousStep(stage, form)
    if (previous) goTo(previous)
  }

  function discard() {
    if (!window.confirm('Discard this draft? Your answers on this device will be deleted.')) return
    deleteDraft(start.draftId)
    navigate(`${base}/dashboard`)
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

  function openFullForm() {
    try {
      saveDraft({ id: start.draftId, organizationId: org.id, kind: 'form', form, step: '3' })
    } catch {
      setNotice({ tone: 'error', text: 'This browser could not save the draft, so it was not moved to the form.' })
      return
    }
    navigate(`${base}/create?draftId=${start.draftId}`)
  }

  function create() {
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
    const campaign = formToCampaign({ ...form, organizationId: org.id }, { isDraft: false })
    try {
      publishCampaign(campaign, form.milestonePlan)
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof StorageFullError ? error.message : 'The campaign could not be saved in this browser.',
      })
      return
    }
    deleteDraft(start.draftId)
    navigate(`${base}/dashboard?created=${campaign.id}`)
  }

  const steps = activeSteps(form)
  const answered = stage === 'review' ? steps : steps.slice(0, Math.max(0, steps.indexOf(stage)))
  const position = stage === 'review' ? steps.length : steps.indexOf(stage) + 1

  return (
    <div className="container page-pad assistant">
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
        <div className="assistant-progress" aria-label={`Question ${Math.min(position, steps.length)} of ${steps.length}`}>
          <span>{stage === 'review' ? 'Ready to review' : `Question ${position} of ${steps.length}`}</span>
          <span className="assistant-bar" aria-hidden="true">
            <i style={{ width: `${Math.round((Math.min(position - (stage === 'review' ? 0 : 1), steps.length) / steps.length) * 100)}%` }} />
          </span>
        </div>
      </div>
      <p className="assistant-note">
        <Icon name="info" size={16} />
        <span>
          Scripted demo assistant — no AI service is connected. Answers stay in this browser and nothing is published until you choose{' '}
          <strong>Create campaign</strong>.
        </span>
      </p>
      <div className="draft-bar">
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} error={autosave.error} />
        <span className="inline-actions">
          <Link to={`${base}/assistant?new=1`} reloadDocument className="link-button">
            Start another draft
          </Link>
          <button type="button" className="link-button danger" onClick={discard}>
            Discard draft
          </button>
        </span>
      </div>
      <RequiredProgress items={checklist} />
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

      <div className={showPreview ? 'assistant-grid show-preview' : 'assistant-grid'}>
        <section className="panel chat" aria-label="Conversation">
          <ol className="chat-log" aria-live="polite">
            {answered.map((step) => (
              <li key={step} className="chat-pair">
                <BotBubble org={org}>{stepQuestion(step, org)}</BotBubble>
                <div className="chat-user">
                  <p>{answerSummary(step, form)}</p>
                  <button type="button" className="chat-edit" onClick={() => edit(step)} aria-label={`Edit answer: ${stepQuestion(step, org)}`}>
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div ref={currentRef} className={answered.length > 0 ? 'chat-current' : 'chat-current first'}>
            {stage === 'review' ? (
              <ReviewCard org={org} form={form} onEdit={edit} onChange={update} errors={errors} />
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
              <button type="button" className="btn btn-primary" onClick={create}>
                Create campaign
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={reviewCampaign}>
                Review campaign
              </button>
            )}
          </div>
          {stage === 'review' ? (
            <button type="button" className="link-button" onClick={openFullForm}>
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
      const changes = applyTemplate(form, templateFor(form.category), { replaceLists: false, useGame: null }).changes.filter((change) => change.kind === 'add')
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
                onClick={() => onChange(applyTemplate(form, template, { replaceLists: false, useGame: null }).form)}
              >
                {template.label}
              </button>
            ))}
          </ChipRow>
          <p className="help">
            {templateFor(form.category).blurb} Templates only fill empty milestone and budget lists — your answers are kept.
            {changes.length === 0 && form.milestonePlan.length > 0 ? ` Milestone plan: ${form.milestonePlan.map((item) => item.title).join(', ')}.` : ''}
          </p>
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
          <ErrorText id="a-goal-error" error={errors.goalAmount} />
        </>
      )
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
}: {
  org: Organization
  form: CampaignForm
  errors: FormErrors
  onEdit: (step: AssistantStepId) => void
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  const labels: Record<AssistantStepId, string> = {
    purpose: 'Purpose',
    category: 'Campaign type',
    story: 'Story details',
    title: 'Name',
    goal: 'Target',
    dates: 'Dates',
    access: 'Group',
    participation: 'Taking part',
    game: 'Game',
    amounts: 'Amounts',
    cover: 'Cover',
  }
  return (
    <div className="chat-review">
      <BotBubble org={org}>Here’s your campaign. Check each answer, edit anything, then create it when you’re ready.</BotBubble>
      <dl className="detail-list review-list">
        {activeSteps(form).map((step) => (
          <div key={step}>
            <dt>{labels[step]}</dt>
            <dd>
              <span>{answerSummary(step, form)}</span>
              <button type="button" className="link-button" onClick={() => onEdit(step)} aria-label={`Edit ${labels[step].toLowerCase()}`}>
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <div className="field">
        <label className="field-label" htmlFor="a-organizer">
          Organiser name shown to supporters
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
        The campaign will be saved under <strong>{org.name}</strong> in {form.currency}. Nothing is published until you choose Create campaign.
      </p>
    </div>
  )
}
