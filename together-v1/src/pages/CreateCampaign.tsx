import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useImagePicker } from '../hooks/useImagePicker.tsx'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { OrgLogo } from '../components/CampaignImage.tsx'
import { ResumeDrafts, SaveIndicator, SetupIndicator } from '../components/drafts/DraftUI.tsx'
import { DraftReviewSummary } from '../components/campaign/DraftReviewSummary.tsx'
import { GamePreviewModal, GameThumb } from '../components/GamePreview.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { Icon } from '../components/illustrations.tsx'
import { LivePreview } from '../components/LivePreview.tsx'
import { COVERS, UPLOADED_COVER_ID, coverTemplate } from '../data/covers.ts'
import { useAutosave } from '../hooks/useAutosave.ts'
import { getCampaign } from '../lib/campaigns.ts'
import { canUseFeature, campaignNeedsApproval } from '../lib/features.ts'
import { canCurrent } from '../lib/permissions.ts'
import { currentActorId } from '../lib/identity.ts'
import { eligibleReviewers, formCampaignForOrg, NO_REVIEWER_MESSAGE, publishWithPolicy } from '../lib/featureActions.ts'
import { PartnerOfferChooser } from '../components/campaign/PartnerOfferChooser.tsx'
import { deleteDraft, listDrafts, newDraftId, readDraft, saveDraft } from '../lib/drafts.ts'
import { currencySymbol, formatINR, setDisplayCurrency } from '../lib/format.ts'
import { formatPaise, gameConfig } from '../lib/gameContribution.ts'
import { GAMES, gameMeta } from '../lib/games.ts'
import { selectableGames } from '../lib/organizations.ts'
import { StorageFullError } from '../lib/storage.ts'
import type { CampaignForm, GameType, Organization } from '../lib/types.ts'
import {
  blankForm,
  campaignToForm,
  formGameSettings,
  gameSettingsFields,
  requiredChecklist,
  validateAll,
  type FormErrors,
} from '../lib/wizard.ts'
import { StoryDetails, TemplatePicker } from '../components/story/StoryDetails.tsx'
import { AiBadge, SparkIcon } from '../components/ai/AiUI.tsx'
import { SetupSuggestions } from '../components/ai/SetupSuggestions.tsx'
import { fillCampaignFromPurpose } from '../lib/ai/fillFromPurpose.ts'
import { purposeIdeas, type PurposeIdea } from '../lib/assistant.ts'
import { useAiRequest } from '../hooks/useAiRequest.ts'
import { AiCancelledError } from '../lib/ai/types.ts'

const LAST_STEP = 2
const STEP_LABEL: Record<number, string> = {
  1: 'What and goal',
  2: 'Review and publish',
}

/** Which form fields each step owns, so validation errors point to the right step. */
const STEP_KEYS: Record<number, string[]> = {
  1: [
    'title',
    'description',
    'coverImageId',
    'organizerName',
    'budget',
    'goalAmount',
    'opensAt',
    'closesAt',
    'fixedAmounts',
    'accessCode',
    'form',
    'gameType',
    'gameRate',
    'gameRoundSize',
    'gameCap',
    'puzzleImageData',
  ],
  2: [],
}

function errorsForStep(step: number, form: CampaignForm, allowedGames: GameType[]): FormErrors {
  const all = validateAll(form, allowedGames)
  return Object.fromEntries(Object.entries(all).filter(([key]) => STEP_KEYS[step]?.includes(key))) as FormErrors
}

interface EditorStart {
  draftId: string
  form: CampaignForm
  step: number
}

function clampStep(step: number): number {
  if (!Number.isFinite(step) || step < 1) return 1
  return Math.min(LAST_STEP, Math.max(1, Math.round(step)))
}

export function CreateCampaignPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { org, base } = useOrg()
  const allowedGames = selectableGames(org)
  const [start, setStart] = useState<EditorStart | null>(() => initialStart(params, org))
  const [drafts, setDrafts] = useState(() => listDrafts(org.id))
  const [pickingPath, setPickingPath] = useState(() => !initialStart(params, org) && (params.get('new') === '1' || listDrafts(org.id).length === 0))
  const [aiPrompting, setAiPrompting] = useState(false)

  useEffect(() => {
    document.title = `Create a campaign — ${org.name}`
  }, [org.name])

  useEffect(() => {
    if (!start || params.get('draftId') === start.draftId) return
    setParams({ draftId: start.draftId }, { replace: true })
  }, [start, params, setParams])

  function startForm() {
    const draftId = newDraftId()
    const form = blankForm(org)
    saveDraft({ id: draftId, organizationId: org.id, kind: 'form', form, step: '1' })
    setPickingPath(false)
    setAiPrompting(false)
    setStart({ draftId, form, step: 1 })
  }

  function startWithAi() {
    setPickingPath(false)
    setAiPrompting(true)
  }

  function openAiDraft(form: CampaignForm) {
    const draftId = newDraftId()
    saveDraft({ id: draftId, organizationId: org.id, kind: 'form', form, step: '1' })
    setAiPrompting(false)
    setStart({ draftId, form, step: 1 })
  }

  if (!canCurrent('campaign.create', { organizationId: org.id })) {
    return (
      <div className="container narrow page-pad">
        <Link to={`${base}/campaigns`} className="back-link">
          ← Back to campaigns
        </Link>
        <div className="panel empty">
          <h1>You can’t create a campaign here</h1>
          <p className="muted">Switch to an Organization Admin or Campaign Organizer for {org.name} from the Demo control.</p>
        </div>
      </div>
    )
  }

  if (!start && !pickingPath && drafts.length > 0) {
    return (
      <div className="container narrow page-pad">
        <ResumeDrafts
          drafts={drafts}
          progress={(draft) => {
            const items = requiredChecklist(draft.form, allowedGames)
            return { done: items.filter((item) => item.done).length, total: items.length }
          }}
          onContinue={(draft) => {
            if (draft.kind === 'assistant') navigate(`${base}/assistant?draftId=${draft.id}`)
            else setStart({ draftId: draft.id, form: draft.form, step: clampStep(Number(draft.step) || 1) })
          }}
          onStartAnother={() => {
            setAiPrompting(false)
            setPickingPath(true)
          }}
          onDiscard={(draft) => {
            deleteDraft(draft.id)
            const next = listDrafts(org.id)
            setDrafts(next)
            if (next.length === 0) {
              setAiPrompting(false)
              setPickingPath(true)
            }
          }}
        />
      </div>
    )
  }

  if (aiPrompting) {
    return (
      <AiCreatePrompt
        org={org}
        base={base}
        allowedGames={allowedGames}
        onBack={() => {
          setAiPrompting(false)
          setPickingPath(true)
        }}
        onDrafted={openAiDraft}
      />
    )
  }

  if (!start) {
    return <CreatePathChoice org={org} base={base} onForm={startForm} onAi={startWithAi} />
  }
  return <CreateCampaignEditor key={start.draftId} start={start} />
}

/** Opens an existing draft or reused campaign. New campaigns start on the path choice. */
function initialStart(params: URLSearchParams, org: Organization): EditorStart | null {
  const draftId = params.get('draftId')
  if (draftId) {
    const draft = readDraft(draftId, org.id)
    if (draft && draft.kind === 'form') return { draftId, form: draft.form, step: clampStep(Number(draft.step) || 1) }
    if (draft && draft.kind === 'assistant') return null
  }
  const campaignId = params.get('draft')
  if (campaignId) {
    const existing = getCampaign(campaignId)
    if (existing && existing.organizationId === org.id && canCurrent('campaign.edit', { campaign: existing, organization: org })) {
      const id = `draft_from_${campaignId}`
      const saved = readDraft(id, org.id)
      return saved
        ? { draftId: id, form: saved.form, step: clampStep(Number(saved.step) || 1) }
        : { draftId: id, form: campaignToForm(existing), step: 1 }
    }
  }
  return null
}

function CreatePathChoice({
  org,
  base,
  onForm,
  onAi,
}: {
  org: Organization
  base: string
  onForm: () => void
  onAi: () => void
}) {
  const aiOn = org.visibility.assistant
  return (
    <div className="container page-pad create-entry">
      <Link to={`${base}/campaigns`} className="back-link">
        ← Back to campaigns
      </Link>
      <div className="create-path create-path-choice">
        <header className="create-path-head">
          <h1>Create a campaign</h1>
          <p className="lead-sm">Pick how you want to start. You can edit everything before publishing.</p>
        </header>
        <div className="create-path-options">
          <button type="button" className="create-path-card create-path-card-ai" onClick={onAi} disabled={!aiOn}>
            <span className="create-path-icon" aria-hidden="true">
              <SparkIcon size={24} />
            </span>
            <strong>Create with AI</strong>
            <span className="muted">One sentence about the cause. AI drafts the title, goal, cover and story.</span>
            <AiBadge />
            {!aiOn ? <span className="muted small">Turned off for {org.name}.</span> : null}
            <span className="create-path-cta">{aiOn ? 'Start with AI →' : 'Unavailable'}</span>
          </button>
          <button type="button" className="create-path-card" onClick={onForm}>
            <span className="create-path-icon form" aria-hidden="true">
              ▤
            </span>
            <strong>Fill the form</strong>
            <span className="muted">Enter each field yourself on a short two-step form.</span>
            <span className="create-path-cta">Open the form →</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** One purpose prompt → simulated draft → same editor as the form path. */
function AiCreatePrompt({
  org,
  base,
  allowedGames,
  onBack,
  onDrafted,
}: {
  org: Organization
  base: string
  allowedGames: GameType[]
  onBack: () => void
  onDrafted: (form: CampaignForm) => void
}) {
  const [purpose, setPurpose] = useState('')
  const [idea, setIdea] = useState<PurposeIdea | null>(null)
  const [error, setError] = useState('')
  const request = useAiRequest<{ form: CampaignForm }>()
  const ideas = purposeIdeas(org.type)
  const drafting = request.status === 'loading'

  function applyIdea(next: PurposeIdea) {
    setPurpose(next.description)
    setIdea(next)
    setError('')
  }

  function draft() {
    const text = purpose.trim()
    if (text.length < 12) {
      setError('Add a short sentence about what you are raising funds for.')
      return
    }
    setError('')
    const picked = idea && idea.description === text ? idea : null
    void request
      .run(async (signal) => {
        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => resolve(), 450)
          signal.addEventListener('abort', () => {
            window.clearTimeout(timer)
            reject(new AiCancelledError())
          })
        })
        let form = fillCampaignFromPurpose(blankForm(org), org, text, allowedGames)
        if (picked) form = { ...form, title: picked.title, coverImageId: picked.coverImageId, description: picked.description }
        return { form }
      })
      .then((value) => {
        if (value) onDrafted(value.form)
      })
  }

  return (
    <div className="container page-pad create-entry">
      <button type="button" className="back-link link-button" onClick={onBack}>
        ← Back
      </button>
      <div className={`ai-create-panel${drafting ? ' is-drafting' : ''}`}>
        <header className="ai-create-head">
          <span className="ai-create-mark" aria-hidden="true">
            <SparkIcon size={28} />
          </span>
          <div>
            <div className="ai-create-title-row">
              <h1>Create with AI</h1>
              <AiBadge />
            </div>
            <p className="lead-sm">Describe the cause in one sentence. AI drafts the title, goal, cover and story — then you edit and publish.</p>
          </div>
        </header>

        <section className="ai-create-ideas" aria-label="Try an idea">
          <p className="ai-create-section-label">Try an idea</p>
          <div className="ai-idea-grid">
            {ideas.map((entry) => {
              const cover = coverTemplate(entry.coverImageId)
              const selected = purpose === entry.description
              return (
                <button
                  key={entry.label}
                  type="button"
                  className={selected ? 'ai-idea-card selected' : 'ai-idea-card'}
                  aria-pressed={selected}
                  onClick={() => applyIdea(entry)}
                >
                  <img src={cover.src} alt="" />
                  <span>
                    <strong>{entry.label}</strong>
                    <em>{entry.title}</em>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <label className="ai-create-field field">
          <span className="field-label">What are you raising funds for?</span>
          <textarea
            id="ai-purpose"
            rows={4}
            maxLength={1000}
            value={purpose}
            placeholder="For example: We want to raise $60,000 for school supplies for every classroom."
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setPurpose(event.target.value)
              setIdea(null)
              setError('')
            }}
          />
          {error ? <span className="error-text">{error}</span> : null}
          {request.error ? <span className="error-text">{request.error}</span> : null}
        </label>

        <p className="ai-create-outcome muted small">Drafts for you: title · fundraising goal · cover image · story wording</p>

        <div className="ai-create-actions">
          <button type="button" className="btn btn-primary" onClick={draft} disabled={drafting}>
            <SparkIcon size={16} />
            {drafting ? 'Drafting…' : 'Draft campaign'}
          </button>
          <Link to={`${base}/campaigns`} className="btn btn-outline">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

function CreateCampaignEditor({ start }: { start: EditorStart }) {
  const navigate = useNavigate()
  const { org, base, workspace } = useOrg()
  const allowedGames = selectableGames(org)
  const [form, setForm] = useState<CampaignForm>(start.form)
  const [step, setStep] = useState(clampStep(start.step))
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const snapshot = useMemo(() => ({ form, step }), [form, step])
  const autosave = useAutosave(snapshot, (value) => {
    saveDraft({ id: start.draftId, organizationId: org.id, kind: 'form', form: value.form, step: String(value.step) })
  })
  const checklist = requiredChecklist(form, allowedGames)

  function update(patch: Partial<CampaignForm>) {
    setForm((current) => ({ ...current, ...patch }))
    setNotice(null)
  }

  function discard() {
    if (!window.confirm('Discard this draft? Your answers on this device will be deleted.')) return
    deleteDraft(start.draftId)
    navigate(`${base}/campaigns`)
  }

  function goToStep(next: number) {
    setStep(next)
    window.scrollTo(0, 0)
  }

  function continueNext() {
    const nextErrors = errorsForStep(step, form, allowedGames)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 30)
      return
    }
    goToStep(Math.min(LAST_STEP, step + 1))
  }

  function saveNow() {
    setNotice(autosave.flush() ? { tone: 'success', text: 'Draft saved on this device. Find it later under Campaigns.' } : { tone: 'error', text: 'This browser could not save your draft. Your answers are still here.' })
  }

  function publish() {
    const nextErrors = validateAll(form, allowedGames)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      goToStep(1)
      return
    }
    const existing = form.id ? getCampaign(form.id) : undefined
    const campaign = formCampaignForOrg(form, org, { isDraft: false, existing })
    try {
      const result = publishWithPolicy(campaign, form.milestonePlan)
      deleteDraft(start.draftId)
      navigate(
        result.mode === 'pending_review'
          ? `${workspace}/campaigns?pending=${campaign.id}`
          : `${base}/campaigns/${campaign.id}`,
      )
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof StorageFullError ? error.message : error instanceof Error ? error.message : 'The campaign could not be saved in this browser.',
      })
    }
  }

  setDisplayCurrency(form.currency)

  return (
    <div className="container page-pad create">
      <Link to={`${base}/campaigns`} className="back-link">
        ← Back to campaigns
      </Link>
      <h1 className="sr-only">{STEP_LABEL[step]}</h1>
      <SetupIndicator items={checklist} current={step as 1 | 2} onGroup={goToStep} />
      <div className="draft-bar">
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} error={autosave.error} />
        <button type="button" className="link-button danger" onClick={discard}>
          Discard draft
        </button>
      </div>
      {notice ? (
        <div className={`notice ${notice.tone}`} role="status">
          {notice.text}
        </div>
      ) : null}
      <div className={step === LAST_STEP ? 'create-grid review' : 'create-grid'}>
        <div>
          {step === 1 ? <EssentialsStep form={form} errors={errors} onChange={update} org={org} /> : null}
          {step === LAST_STEP ? <DraftReviewSummary form={form} items={checklist} onEdit={goToStep} /> : null}
        </div>
        {step < LAST_STEP ? (
          <div className="create-aside">
            <LivePreview form={form} />
            <div className="aside-actions">
              <button type="button" className="btn btn-outline" onClick={saveNow}>
                Save draft
              </button>
              <button type="button" className="btn btn-primary" onClick={continueNext}>
                Continue to review
              </button>
            </div>
          </div>
        ) : (
          <div className="create-aside" id="campaign-preview" tabIndex={-1} aria-label="Public preview">
            <span className="eyebrow-label">Preview — how supporters will see it</span>
            <LivePreview form={form} />
            <div className="publish-box">
              <p className="small">
                {campaignNeedsApproval(org)
                  ? 'An Organization Admin who didn’t author this revision must approve it before supporters see it.'
                  : 'Publishing makes this campaign visible on your organization’s website.'}
              </p>
              {campaignNeedsApproval(org) && eligibleReviewers(org.id, currentActorId()).length === 0 ? (
                <p className="notice warn compact">{NO_REVIEWER_MESSAGE}</p>
              ) : null}
              <div className="aside-actions">
                <button type="button" className="btn btn-outline" onClick={() => goToStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn-outline" onClick={saveNow}>
                  Save draft
                </button>
                <button type="button" className="btn btn-primary" onClick={publish} disabled={checklist.some((item) => !item.done)}>
                  {campaignNeedsApproval(org) ? 'Submit for review' : 'Publish campaign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EssentialsStep({
  form,
  errors,
  onChange,
  org,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
  org: Organization
}) {
  const cover = useImagePicker((data) => onChange({ coverImageId: UPLOADED_COVER_ID, coverImageData: data }), {
    maxWidth: 1400,
    maxHeight: 900,
    type: 'image/jpeg',
    quality: 0.8,
  })
  const advancedOpen =
    Boolean(errors.opensAt || errors.closesAt || errors.form || errors.gameType || errors.fixedAmounts || errors.accessCode || errors.puzzleImageData)

  return (
    <div className="settings-stack">
      <section className="panel form-panel">
        <Field label="Campaign title" htmlFor="title" error={errors.title} counter={`${form.title.trim().length}/80`}>
          <input
            id="title"
            maxLength={80}
            value={form.title}
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="School supplies for every pupil"
          />
        </Field>
        <Field label="What are you raising money for?" htmlFor="purpose" error={errors.description} counter={`${form.description.trim().length}/1,000`}>
          <textarea
            id="purpose"
            maxLength={1000}
            rows={4}
            value={form.description}
            aria-invalid={Boolean(errors.description)}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="One or two sentences: what you are raising money for and who it helps."
          />
        </Field>
        <Field
          label="How much do you want to raise?"
          htmlFor="goal"
          error={errors.goalAmount}
          hint={`In ${form.currency}. Dates, games and amounts use your organization defaults until you change them in Advanced.`}
        >
          <div className="input-prefix">
            <span>{currencySymbol(form.currency)}</span>
            <input
              id="goal"
              inputMode="numeric"
              value={form.goalAmount}
              aria-invalid={Boolean(errors.goalAmount)}
              onChange={(event) => onChange({ goalAmount: event.target.value.replace(/[^\d]/g, '') })}
            />
          </div>
        </Field>
        <div className="field">
          <span className="field-label">
            Campaign cover <span className="optional-tag">Optional</span>
          </span>
          <p className="help">A cover is already selected. Change it only if you want.</p>
          <div className="cover-grid cover-grid-compact">
            {COVERS.slice(0, 4).map((template) => {
              const selected = form.coverImageId === template.id
              return (
                <button
                  key={template.id}
                  type="button"
                  className={selected ? 'cover-choice selected' : 'cover-choice'}
                  aria-pressed={selected}
                  onClick={() => onChange({ coverImageId: template.id })}
                >
                  <img src={template.src} alt={template.alt} />
                  <span>{template.label}</span>
                </button>
              )
            })}
            <button
              type="button"
              className={form.coverImageId === UPLOADED_COVER_ID ? 'cover-choice upload selected' : 'cover-choice upload'}
              aria-pressed={form.coverImageId === UPLOADED_COVER_ID}
              onClick={() => (form.coverImageData ? onChange({ coverImageId: UPLOADED_COVER_ID }) : cover.open())}
            >
              {form.coverImageData ? <img src={form.coverImageData} alt="Your uploaded cover" /> : <span className="upload-copy">{cover.busy ? 'Processing…' : 'Upload'}</span>}
            </button>
          </div>
          {cover.input}
          {cover.error || errors.coverImageId ? <p className="error-text">{cover.error || errors.coverImageId}</p> : null}
        </div>
      </section>

      <details className="customize-more create-advanced" {...(advancedOpen ? { open: true } : {})}>
        <summary>Advanced (dates, games, amounts, and more)</summary>
        <div className="customize-body">
          <SettingsStep form={form} errors={errors} onChange={onChange} org={org} section="goal" />
          <SettingsStep form={form} errors={errors} onChange={onChange} org={org} section="contribute" />
          <StoryStep form={form} errors={errors} onChange={onChange} org={org} section="contribute" />
          <details className="customize-more">
            <summary>Optional story details</summary>
            <div className="customize-body">
              <StoryStep form={form} errors={errors} onChange={onChange} org={org} section="extras" />
            </div>
          </details>
        </div>
      </details>
    </div>
  )
}

function StoryStep({
  form,
  errors,
  onChange,
  org,
  section,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
  org: Organization
  section: 'contribute' | 'extras'
}) {
  const logo = useImagePicker((data) => onChange({ logoData: data }), {
    maxWidth: 256,
    maxHeight: 256,
    type: 'image/png',
  })
  const [draftAmount, setDraftAmount] = useState('')
  const [amountError, setAmountError] = useState('')

  function addAmount() {
    const amount = Number(draftAmount)
    if (!/^\d+$/.test(draftAmount) || amount <= 0) {
      setAmountError('Enter a whole amount greater than zero.')
      return
    }
    if (form.fixedAmounts.includes(amount)) {
      setAmountError('That amount is already listed.')
      return
    }
    if (form.fixedAmounts.length >= 5) {
      setAmountError('You can suggest up to 5 amounts.')
      return
    }
    onChange({ fixedAmounts: [...form.fixedAmounts, amount].sort((a, b) => a - b), donationMode: 'fixed' })
    setDraftAmount('')
    setAmountError('')
  }

  const amountChips = (
    <>
      <div className="amount-chips">
        {form.fixedAmounts.map((amount) => (
          <span key={amount} className="amount-chip-pro">
            {formatINR(amount, form.currency)}
            {form.fixedAmounts.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove ${formatINR(amount, form.currency)}`}
                onClick={() => onChange({ fixedAmounts: form.fixedAmounts.filter((item) => item !== amount) })}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        <span className="amount-add">
          <input
            inputMode="numeric"
            value={draftAmount}
            placeholder={`${currencySymbol(form.currency)} Add`}
            aria-label="New suggested amount"
            onChange={(event) => setDraftAmount(event.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
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
      {amountError || errors.fixedAmounts ? <p className="error-text">{amountError || errors.fixedAmounts}</p> : null}
    </>
  )
  const accessChooser = (
    <>
        <div className="radio-stack">
          <RadioCard
            checked={form.access === 'open'}
            title="Anyone with the link"
            text="The campaign appears on your website and anyone can contribute."
            onSelect={() => onChange({ access: 'open' })}
          />
          <RadioCard
            checked={form.access === 'closed'}
            title="Invited group only — demo access code"
            text="People join with a code you share and their name. The group sees a friendly leaderboard."
            onSelect={() => onChange({ access: 'closed' })}
          />
        </div>
        {form.access === 'closed' ? (
          <div className="code-field">
            <label htmlFor="access-code">Demo access code</label>
            <input
              id="access-code"
              value={form.accessCode}
              maxLength={12}
              aria-invalid={Boolean(errors.accessCode)}
              onChange={(event) => onChange({ accessCode: event.target.value.toUpperCase() })}
            />
            <p className="help">
              Share this code with your group. It’s a demo code, not real security.
            </p>
            {errors.accessCode ? <p className="error-text">{errors.accessCode}</p> : null}
          </div>
        ) : null}
    </>
  )
  const logoField = (
        <div className="field">
          <span className="field-label">Organization logo</span>
          <div className="logo-row">
            <OrgLogo name={form.organizerName || 'Together'} logoData={form.logoData} size={48} />
            <button type="button" className="btn btn-outline btn-sm" onClick={logo.open}>
              {logo.busy ? 'Processing…' : form.logoData ? 'Replace logo' : 'Upload logo'}
            </button>
            {form.logoData ? (
              <button type="button" className="link-button danger" onClick={() => onChange({ logoData: '' })}>
                Remove
              </button>
            ) : (
              <span className="help">Optional. Square images work best.</span>
            )}
          </div>
          {logo.input}
          {logo.error ? <p className="error-text">{logo.error}</p> : null}
        </div>
  )

  if (section === 'contribute') {
    return (
      <div className="settings-stack">
        {form.direct ? (
          <section className="panel form-panel">
            <h2>Amounts for direct giving</h2>
            <div className="two-col">
              <RadioCard checked={form.donationMode === 'fixed'} title="Suggest amounts" text="Recommended. Supporters pick one of your amounts." onSelect={() => onChange({ donationMode: 'fixed' })} />
              <RadioCard checked={form.donationMode === 'custom'} title="Any amount" text="Supporters type their own whole amount." onSelect={() => onChange({ donationMode: 'custom' })} />
            </div>
            {form.donationMode === 'fixed' ? (
              <div className="field">
                <span className="field-label">Suggested amounts</span>
                {amountChips}
              </div>
            ) : null}
          </section>
        ) : null}
        <section className="panel form-panel">
          <h2>Who can see and join?</h2>
          {accessChooser}
        </section>
      </div>
    )
  }

  return (
    <div className="panel form-panel">
      <Field label="Who will benefit?" htmlFor="story-who" optional hint="Describe the group, not individuals. For example: “Grade 4 students at our school”.">
        <textarea id="story-who" rows={2} maxLength={600} value={form.storyWho} onChange={(event) => onChange({ storyWho: event.target.value })} />
      </Field>
      <div className="two-col">
        <Field label="Organizer name" htmlFor="organizer" error={errors.organizerName}>
          <input
            id="organizer"
            maxLength={60}
            value={form.organizerName}
            aria-invalid={Boolean(errors.organizerName)}
            onChange={(event) => onChange({ organizerName: event.target.value })}
          />
        </Field>
      </div>
      {logoField}
      <SetupSuggestions form={form} allowedGames={selectableGames(org)} onChange={onChange} />
      <TemplatePicker form={form} allowedGames={selectableGames(org)} onChange={onChange} />
      <StoryDetails form={form} errors={errors} onChange={onChange} hideWho />
    </div>
  )
}

function Field({
  label,
  htmlFor,
  error,
  counter,
  hint,
  optional = false,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  counter?: string
  hint?: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label} {optional ? <span className="optional-tag">Optional</span> : <span className="required-tag">Required</span>}
      </label>
      {hint ? (
        <p className="help" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error || counter ? (
        <div className="field-foot">
          <span className="error-text" id={`${htmlFor}-error`}>{error}</span>
          {counter ? <span className="help">{counter}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

function RadioCard({
  checked,
  title,
  text,
  onSelect,
}: {
  checked: boolean
  title: string
  text: string
  onSelect: () => void
}) {
  return (
    <button type="button" role="radio" aria-checked={checked} className={checked ? 'radio-card checked' : 'radio-card'} onClick={onSelect}>
      <i />
      <span>
        <strong>{title}</strong>
        <em>{text}</em>
      </span>
    </button>
  )
}

function SettingsStep({
  form,
  errors,
  onChange,
  org,
  section,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
  org: Organization
  section: 'goal' | 'contribute'
}) {
  const gamesAllowed = selectableGames(org).length > 0
  if (section === 'goal') {
    return (
      <div className="settings-stack">
        <section className="panel form-panel">
          <h2>When should the campaign run?</h2>
          <div className="two-col">
            <Field label="Opens" htmlFor="opens" error={errors.opensAt}>
              <input id="opens" type="datetime-local" value={form.opensAt} aria-invalid={Boolean(errors.opensAt)} onChange={(event) => onChange({ opensAt: event.target.value })} />
            </Field>
            <Field label="Closes" htmlFor="closes" error={errors.closesAt}>
              <input id="closes" type="datetime-local" value={form.closesAt} aria-invalid={Boolean(errors.closesAt)} onChange={(event) => onChange({ closesAt: event.target.value })} />
            </Field>
          </div>
          <label className="toggle-row">
            <button
              type="button"
              role="switch"
              aria-checked={form.autoCloseOnGoal}
              className={form.autoCloseOnGoal ? 'switch on' : 'switch'}
              onClick={() => onChange({ autoCloseOnGoal: !form.autoCloseOnGoal })}
            >
              <span />
            </button>
            <span>
              <strong>Stop accepting contributions when the goal is reached</strong>
              <em>Recommended. You can still post updates afterwards.</em>
            </span>
          </label>
        </section>
        {canUseFeature(org, 'updateCommitments') ? (
          <section className="panel form-panel">
            <Field
              label="When will you post the next update?"
              htmlFor="next-update"
              optional
              hint="Supporters see this date on the campaign. You can change it later."
            >
              <input
                id="next-update"
                type="date"
                value={form.nextUpdateAt}
                onChange={(event) => onChange({ nextUpdateAt: event.target.value })}
              />
            </Field>
          </section>
        ) : null}
      </div>
    )
  }
  return (
    <div className="settings-stack">
      <section className="panel form-panel">
        <h2>How can people contribute?</h2>
        <p className="help">Choose one or both. Every contribution in this demo is simulated — no payment is taken.</p>
        <div className="option-grid two">
          <OptionCard
            checked={form.direct}
            title="Give directly"
            text={org.visibility.direct ? 'Supporters choose an amount and confirm it.' : `Direct contributions are turned off for ${org.name}.`}
            disabled={!org.visibility.direct && !form.direct}
            onToggle={() => onChange({ direct: !form.direct })}
          />
          <OptionCard
            checked={form.game}
            title="Play a short game"
            text={
              !gamesAllowed
                ? `Games are turned off for ${org.name}.`
                : 'Each game action adds a small amount to a suggestion. Supporters review it before confirming — playing never takes money.'
            }
            disabled={!gamesAllowed && !form.game}
            onToggle={() => onChange({ game: !form.game })}
          />
        </div>
        {errors.form ? <p className="error-text">{errors.form}</p> : null}
        {canUseFeature(org, 'sponsorPlay') && form.game && form.gameType === 'memory' && !canCurrent('org.manageSponsors', { organization: org }) ? (
          <p className="muted small">
            Sponsor-funded play {form.sponsorEnabled ? 'is confirmed for this campaign' : 'is off for this campaign'}. An Organization Admin confirms sponsors.
          </p>
        ) : null}
        {canUseFeature(org, 'sponsorPlay') && form.game && form.gameType !== 'memory' ? (
          <p className="muted small">Sponsor-funded play is only available for Memory Match. This game stays a personal contribution.</p>
        ) : null}
        {canUseFeature(org, 'sponsorPlay') && form.game && form.gameType === 'memory' && canCurrent('org.manageSponsors', { organization: org }) ? (
          <label className="toggle-row">
            <button
              type="button"
              role="switch"
              aria-checked={form.sponsorEnabled}
              className={form.sponsorEnabled ? 'switch on' : 'switch'}
              onClick={() => onChange({ sponsorEnabled: !form.sponsorEnabled })}
            >
              <span />
            </button>
            <span>
              <strong>Sponsor-funded play for this campaign</strong>
              <em>Shows sponsor-funded play. An Organization Admin adds the pledge, caps and rewards under Sponsors. Sponsor rewards are not part of a supporter’s own checkout.</em>
            </span>
          </label>
        ) : null}
        {form.game ? <GameGallery form={form} errors={errors} onChange={onChange} org={org} /> : null}
        {form.game ? <GameContributionSettingsPanel form={form} errors={errors} onChange={onChange} /> : null}
      </section>
      {canUseFeature(org, 'partnerVouchers') ? (
        <PartnerOfferChooser org={org} currency={form.currency} selected={form.partnerOfferIds} onChange={(partnerOfferIds) => onChange({ partnerOfferIds })} />
      ) : null}
    </div>
  )
}

function GameGallery({
  form,
  errors,
  onChange,
  org,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
  org: Organization
}) {
  const allowed = selectableGames(org)
  const games = GAMES.filter((game) => allowed.includes(game.id))
  const [previewGame, setPreviewGame] = useState<GameType | null>(null)
  const puzzle = useImagePicker((data) => onChange({ puzzleImageData: data }), {
    maxWidth: 1200,
    maxHeight: 1200,
    type: 'image/jpeg',
    quality: 0.82,
  })

  return (
    <div className="field game-gallery">
      <div className="field-label-row">
        <label className="field-label" id="game-gallery-label">
          Choose a game
        </label>
        <p className="help">
          {allowed.length === 0
            ? `Games are turned off for ${org.name}, so supporters give directly.`
            : form.game
              ? `${gameMeta(form.gameType).name} is the only game supporters will see. ${org.name} offers ${allowed.length === 1 ? 'this game' : `${allowed.length} games`}.`
              : 'Supporters will only see direct giving.'}
        </p>
      </div>
      {errors.gameType ? <p className="error-text">{errors.gameType}</p> : null}
      <div className="game-chooser" role="radiogroup" aria-labelledby="game-gallery-label">
        {games.map((game) => (
          <div
            key={game.id}
            className={form.game && form.gameType === game.id ? 'game-choice selected' : 'game-choice'}
          >
            <button
              type="button"
              role="radio"
              aria-checked={form.game && form.gameType === game.id}
              className="game-choice-main"
              onClick={() =>
                onChange(
                  form.gameType === game.id && form.game
                    ? { game: true }
                    : { game: true, gameType: game.id, sponsorEnabled: game.id === 'memory' ? form.sponsorEnabled : false, ...gameSettingsFields(game.id) },
                )
              }
            >
              <GameThumb
                gameType={game.id}
                customSrc={game.id === 'puzzle' && form.puzzleImageData ? form.puzzleImageData : undefined}
              />
              <strong>{game.name}</strong>
              <span>{game.blurb}</span>
            </button>
            <button type="button" className="game-preview-btn" onClick={() => setPreviewGame(game.id)}>
              Preview
            </button>
          </div>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={!form.game}
          className={!form.game ? 'game-choice selected none-choice' : 'game-choice none-choice'}
          onClick={() => onChange({ game: false })}
        >
          <span className="none-art" aria-hidden="true">
            <svg viewBox="0 0 160 100" className="none-scene">
              <circle cx="118" cy="22" r="16" fill="#f6e2a8" />
              <circle cx="28" cy="78" r="18" fill="#d7eadc" />
              <rect x="46" y="22" width="68" height="56" rx="14" fill="#fffdf8" />
              <rect x="46" y="22" width="68" height="56" rx="14" fill="none" stroke="#17493b" strokeWidth="1.5" />
              <text x="80" y="58" textAnchor="middle" fill="#17493b" fontSize="26" fontWeight="700" fontFamily="Georgia, serif">
                {currencySymbol(form.currency)}
              </text>
              <path d="M122 70c6-8 14-10 18-8-6 8-12 14-18 14-4 0-6-2-6-6 0 0 2 2 6 0Z" fill="#8FCB6A" />
              <path d="M126 76c-2 6-1 12 2 16" fill="none" stroke="#e6b84b" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="none-copy">
            <strong>No game</strong>
            <span>Direct giving only</span>
          </span>
          <span className="none-foot">A simple contribution</span>
        </button>
      </div>

      {form.game && form.gameType === 'puzzle' ? (
        <div className={errors.puzzleImageData ? 'puzzle-upload is-error' : 'puzzle-upload'} id="puzzle-image">
          {puzzle.input}
          <div className="puzzle-upload-row">
            <div>
              <strong>
                Puzzle image <span className="required-mark">Required</span>
              </strong>
              <p className="help">
                Upload the picture supporters will piece together. JPG, PNG, WebP or GIF, up to 8 MB. It is saved with this campaign.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={puzzle.open} disabled={puzzle.busy}>
              {puzzle.busy ? 'Uploading…' : form.puzzleImageData ? 'Replace image' : 'Upload image'}
            </button>
          </div>
          {form.puzzleImageData ? (
            <div className="puzzle-upload-preview">
              <img src={form.puzzleImageData} alt="Uploaded puzzle artwork" />
            </div>
          ) : (
            <button type="button" className="puzzle-upload-empty" onClick={puzzle.open} disabled={puzzle.busy}>
              Choose a picture for the Community Puzzle
            </button>
          )}
          {puzzle.error || errors.puzzleImageData ? (
            <p className="error-text">{puzzle.error || errors.puzzleImageData}</p>
          ) : null}
        </div>
      ) : null}

      {previewGame ? (
        <GamePreviewModal form={form} gameType={previewGame} onClose={() => setPreviewGame(null)} />
      ) : null}
    </div>
  )
}

function GameContributionSettingsPanel({
  form,
  errors,
  onChange,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  const config = gameConfig(form.gameType)
  const fixedRound = config.roundSize.min === config.roundSize.max
  const settings = formGameSettings(form)
  const hasErrors = Boolean(errors.gameRate || errors.gameRoundSize || errors.gameCap)
  return (
    <details className="game-settings customize-more" open={hasErrors}>
      <summary>
        <span>
          <strong>Contribution rules</strong> — recommended: {formatPaise(settings.ratePaise)} per {config.noun}
          {settings.capPaise ? `, up to ${formatPaise(settings.capPaise)}` : ''}, supporters {settings.allowCustom ? 'can' : 'can’t'} change the total.
        </span>
        <span className="muted small"> Edit</span>
      </summary>
      <p className="help">Each completed {config.noun} adds this amount to the supporter’s suggestion. Direct giving uses its own amounts.</p>
      <div className="game-settings-grid">
        <Field label={`Rate per ${config.noun}`} htmlFor="game-rate" error={errors.gameRate}>
          <div className="input-prefix">
            <span>{currencySymbol(form.currency)}</span>
            <input
              id="game-rate"
              inputMode="decimal"
              value={form.gameRate}
              aria-invalid={Boolean(errors.gameRate)}
              onChange={(event) => onChange({ gameRate: event.target.value })}
            />
          </div>
        </Field>
        <Field label={config.roundSizeLabel} htmlFor="game-round" error={errors.gameRoundSize}>
          <input
            id="game-round"
            type="number"
            min={config.roundSize.min}
            max={config.roundSize.max}
            value={form.gameRoundSize}
            readOnly={fixedRound}
            aria-invalid={Boolean(errors.gameRoundSize)}
            aria-describedby={fixedRound ? 'game-round-help' : undefined}
            onChange={(event) => onChange({ gameRoundSize: event.target.value })}
          />
          {fixedRound ? (
            <span id="game-round-help" className="help">
              Fixed by this game’s design.
            </span>
          ) : null}
        </Field>
        <Field label="Suggested-total cap (optional)" htmlFor="game-cap" error={errors.gameCap}>
          <div className="input-prefix">
            <span>{currencySymbol(form.currency)}</span>
            <input
              id="game-cap"
              inputMode="decimal"
              placeholder="No cap"
              value={form.gameCap}
              aria-invalid={Boolean(errors.gameCap)}
              onChange={(event) => onChange({ gameCap: event.target.value })}
            />
          </div>
        </Field>
      </div>
      <label className="toggle-row">
        <button
          type="button"
          role="switch"
          aria-checked={form.gameAllowCustom}
          aria-label="Allow custom total"
          className={form.gameAllowCustom ? 'switch on' : 'switch'}
          onClick={() => onChange({ gameAllowCustom: !form.gameAllowCustom })}
        >
          <span />
        </button>
        <span>
          <strong>Allow custom total</strong>
          <em>Supporters can raise or lower the game suggestion before paying.</em>
        </span>
      </label>
    </details>
  )
}

function OptionCard({
  checked,
  title,
  text,
  onToggle,
  disabled = false,
}: {
  checked: boolean
  title: string
  text: string
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className={checked ? 'option-card checked' : disabled ? 'option-card disabled' : 'option-card'}
      aria-pressed={checked}
      disabled={disabled}
      onClick={onToggle}
    >
      <div className="option-top">
        <strong>{title}</strong>
        <i className="checkbox">{checked ? <Icon name="check" size={13} /> : null}</i>
      </div>
      <span className="muted small">{text}</span>
    </button>
  )
}

