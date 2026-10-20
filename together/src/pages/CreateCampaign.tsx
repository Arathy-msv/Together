import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useImagePicker } from '../hooks/useImagePicker.tsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CampaignCover, OrgLogo } from '../components/CampaignImage.tsx'
import { RequiredProgress, ResumeDrafts, SaveIndicator } from '../components/drafts/DraftUI.tsx'
import { GamePreviewModal, GameThumb } from '../components/GamePreview.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { Icon } from '../components/illustrations.tsx'
import { LivePreview } from '../components/LivePreview.tsx'
import { COVERS, UPLOADED_COVER_ID } from '../data/covers.ts'
import { useAutosave } from '../hooks/useAutosave.ts'
import { getCampaign, publishCampaign } from '../lib/campaigns.ts'
import { deleteDraft, listDrafts, newDraftId, readDraft, saveDraft } from '../lib/drafts.ts'
import { currencySymbol, formatDateTime, formatINR, setDisplayCurrency } from '../lib/format.ts'
import { formatPaise, gameConfig } from '../lib/gameContribution.ts'
import { GAMES, gameMeta } from '../lib/games.ts'
import { COMING_SOON_GAMES, selectableGames } from '../lib/organizations.ts'
import { StorageFullError } from '../lib/storage.ts'
import type { CampaignForm, GameType, Organization } from '../lib/types.ts'
import {
  blankForm,
  campaignToForm,
  formGameSettings,
  formToCampaign,
  gameSettingsFields,
  requiredChecklist,
  validateAll,
  validateSettings,
  validateStory,
  type FormErrors,
} from '../lib/wizard.ts'
import { StoryDetails, TemplatePicker } from '../components/story/StoryDetails.tsx'
import { ReadinessPanel } from '../components/ai/ReadinessPanel.tsx'
import { SetupSuggestions } from '../components/ai/SetupSuggestions.tsx'
import { readinessFromForm, type ReadinessField } from '../lib/ai/readiness.ts'

const STEP_COPY: Record<number, { title: string; sub: string }> = {
  1: { title: 'Create a campaign', sub: 'Start with your story.' },
  2: { title: 'Campaign settings', sub: 'Choose when it runs and how people take part.' },
  3: { title: 'Review your campaign', sub: 'Check the details, then publish it in this browser.' },
}

const FIELD_TARGETS: Partial<Record<ReadinessField, { step: number; selector: string; inDetails?: boolean }>> = {
  title: { step: 1, selector: '#title' },
  description: { step: 1, selector: '#purpose' },
  impact: { step: 1, selector: '#purpose' },
  cover: { step: 1, selector: '.cover-choice' },
  organizer: { step: 1, selector: '#organizer' },
  goal: { step: 1, selector: '#goal' },
  amounts: { step: 1, selector: '.amount-add input' },
  access: { step: 1, selector: '#access-code' },
  dates: { step: 2, selector: '#opens' },
  participation: { step: 2, selector: '.option-card' },
  puzzle: { step: 2, selector: '#puzzle-image' },
  whoItHelps: { step: 1, selector: '#story-who', inDetails: true },
  beneficiary: { step: 1, selector: '#story-beneficiary', inDetails: true },
  whatItSupports: { step: 1, selector: '#story-supports', inDetails: true },
  whatHappensNext: { step: 1, selector: '#story-next', inDetails: true },
  budget: { step: 1, selector: '#budget-plan', inDetails: true },
  milestones: { step: 1, selector: '#milestone-plan', inDetails: true },
}

interface EditorStart {
  draftId: string
  form: CampaignForm
  step: number
}

export function CreateCampaignPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { org, workspace } = useOrg()
  const allowedGames = selectableGames(org)
  const [start, setStart] = useState<EditorStart | null>(() => initialStart(params, org))
  const [drafts, setDrafts] = useState(() => listDrafts(org.id))

  useEffect(() => {
    document.title = `Create a campaign — ${org.name}`
  }, [org.name])

  useEffect(() => {
    if (!start || params.get('draftId') === start.draftId) return
    setParams({ draftId: start.draftId }, { replace: true })
  }, [start, params, setParams])

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
            if (draft.kind === 'assistant') navigate(`${workspace}/assistant?draftId=${draft.id}`)
            else setStart({ draftId: draft.id, form: draft.form, step: Number(draft.step) || 1 })
          }}
          onStartAnother={() => setStart({ draftId: newDraftId(), form: blankForm(org), step: 1 })}
          onDiscard={(draft) => {
            deleteDraft(draft.id)
            const next = listDrafts(org.id)
            setDrafts(next)
            if (next.length === 0) setStart({ draftId: newDraftId(), form: blankForm(org), step: 1 })
          }}
        />
      </div>
    )
  }
  return <CreateCampaignEditor key={start.draftId} start={start} />
}

/** Decides what the create page opens: a specific draft, a fresh draft, or the resume prompt. */
function initialStart(params: URLSearchParams, org: Organization): EditorStart | null {
  const draftId = params.get('draftId')
  if (draftId) {
    const draft = readDraft(draftId, org.id)
    if (draft && draft.kind === 'form') return { draftId, form: draft.form, step: Number(draft.step) || 1 }
    if (!draft) return { draftId, form: blankForm(org), step: 1 }
  }
  const campaignId = params.get('draft')
  if (campaignId) {
    const existing = getCampaign(campaignId)
    if (existing && existing.organizationId === org.id) {
      const id = `draft_from_${campaignId}`
      const saved = readDraft(id, org.id)
      return saved ? { draftId: id, form: saved.form, step: Number(saved.step) || 1 } : { draftId: id, form: campaignToForm(existing), step: 1 }
    }
  }
  if (params.get('new') === '1') return { draftId: newDraftId(), form: blankForm(org), step: 1 }
  return listDrafts(org.id).length > 0 ? null : { draftId: newDraftId(), form: blankForm(org), step: 1 }
}

function CreateCampaignEditor({ start }: { start: EditorStart }) {
  const navigate = useNavigate()
  const { org, workspace } = useOrg()
  const allowedGames = selectableGames(org)
  const [form, setForm] = useState<CampaignForm>(start.form)
  const [step, setStep] = useState(start.step)
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

  /** Opens the step that holds a readiness result's field and focuses it. */
  function jumpTo(field: ReadinessField) {
    if (field === 'contact' || field === 'documents') {
      navigate(`${workspace}/website`)
      return
    }
    const target = FIELD_TARGETS[field]
    if (!target) return
    setStep(target.step)
    window.setTimeout(() => {
      const details = document.querySelector<HTMLDetailsElement>('.story-details')
      if (target.inDetails && details) details.open = true
      const element = document.querySelector<HTMLElement>(target.selector)
      element?.scrollIntoView({ block: 'center' })
      element?.focus()
    }, 60)
  }

  function discard() {
    if (!window.confirm('Discard this draft? Your answers on this device will be deleted.')) return
    deleteDraft(start.draftId)
    navigate(`${workspace}/campaigns`)
  }

  function continueNext() {
    const nextErrors = step === 1 ? validateStory(form) : validateSettings(form, allowedGames)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep((current) => Math.min(3, current + 1))
  }

  function publish() {
    const nextErrors = validateAll(form, allowedGames)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStep(Object.keys(validateStory(form)).length > 0 ? 1 : 2)
      return
    }
    const existing = form.id ? getCampaign(form.id) : undefined
    const campaign = formToCampaign(form, { isDraft: false, existing })
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
    navigate(`${workspace}/campaigns?created=${campaign.id}`)
  }

  const copy = STEP_COPY[step]
  setDisplayCurrency(form.currency)

  return (
    <div className="container page-pad create">
      <div className="create-head">
        <div>
          <h1>{copy.title}</h1>
          <p className="lead-sm">{copy.sub}</p>
        </div>
        <Stepper step={step} onStep={setStep} />
      </div>
      <div className="draft-bar">
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} error={autosave.error} />
        <button type="button" className="link-button danger" onClick={discard}>
          Discard draft
        </button>
      </div>
      <RequiredProgress items={checklist} onJump={step === 3 ? (item) => setStep(item.step) : undefined} />
      {notice ? (
        <div className={`notice ${notice.tone}`} role="status">
          {notice.text}
        </div>
      ) : null}
      {errors.form ? <div className="notice error">{errors.form}</div> : null}
      <div className={step === 3 ? 'create-grid single' : 'create-grid'}>
        <div>
          {step === 1 ? <StoryStep form={form} errors={errors} onChange={update} org={org} /> : null}
          {step === 2 ? <SettingsStep form={form} errors={errors} onChange={update} org={org} /> : null}
          {step === 3 ? <ReviewStep form={form} onEdit={setStep} /> : null}
          {step === 3 ? (
            <ReadinessPanel
              input={readinessFromForm(form, org, allowedGames)}
              onJump={jumpTo}
              applicable={['whatItSupports', 'whatHappensNext']}
              onApply={(field, text) => update(field === 'whatItSupports' ? { storySupports: text } : { storyNext: text })}
            />
          ) : null}
        </div>
        {step < 3 ? (
          <div className="create-aside">
            <LivePreview form={form} />
            <div className="aside-actions">
              {step > 1 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStep((current) => current - 1)}>
                  Back
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={continueNext}>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="review-actions">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={publish} disabled={checklist.some((item) => !item.done)}>
              Create campaign
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Stepper({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const labels = ['Story', 'Settings', 'Review']
  return (
    <ol className="steps">
      {labels.map((label, index) => {
        const number = index + 1
        const state = number === step ? 'current' : number < step ? 'done' : 'todo'
        return (
          <li key={label} className={state}>
            {number < step ? (
              <button type="button" onClick={() => onStep(number)} aria-label={`Back to ${label}`}>
                <Icon name="check" size={14} />
              </button>
            ) : (
              <span>{number}</span>
            )}
            <em>{label}</em>
          </li>
        )
      })}
    </ol>
  )
}

function StoryStep({
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

  return (
    <div className="panel form-panel">
      <SetupSuggestions form={form} allowedGames={selectableGames(org)} onChange={onChange} />
      <TemplatePicker form={form} allowedGames={selectableGames(org)} onChange={onChange} />
      <Field label="Campaign title" htmlFor="title" error={errors.title} counter={`${form.title.trim().length}/80`}>
        <input
          id="title"
          maxLength={80}
          value={form.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Grow Our School Library"
        />
      </Field>

      <Field label="Short summary" htmlFor="purpose" error={errors.description} counter={`${form.description.trim().length}/1,000`}>
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

      <StoryDetails form={form} errors={errors} onChange={onChange} />

      <div className="field">
        <span className="field-label">Campaign cover</span>
        <p className="help">Pick a template or upload your own image (JPG, PNG or WebP, up to 8 MB).</p>
        <div className="cover-grid">
          {COVERS.map((template) => {
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
                {selected ? (
                  <i className="cover-tick">
                    <Icon name="check" size={13} />
                  </i>
                ) : null}
              </button>
            )
          })}
          <button
            type="button"
            className={form.coverImageId === UPLOADED_COVER_ID ? 'cover-choice upload selected' : 'cover-choice upload'}
            aria-pressed={form.coverImageId === UPLOADED_COVER_ID}
            onClick={() => (form.coverImageData ? onChange({ coverImageId: UPLOADED_COVER_ID }) : cover.open())}
          >
            {form.coverImageData ? (
              <img src={form.coverImageData} alt="Your uploaded cover" />
            ) : (
              <span className="upload-copy">
                <b>+</b>
                {cover.busy ? 'Processing…' : 'Upload image'}
              </span>
            )}
            {form.coverImageData ? <span>Your upload</span> : null}
            {form.coverImageId === UPLOADED_COVER_ID ? (
              <i className="cover-tick">
                <Icon name="check" size={13} />
              </i>
            ) : null}
          </button>
        </div>
        {form.coverImageData ? (
          <div className="inline-actions small">
            <button type="button" className="link-button" onClick={cover.open}>
              Replace upload
            </button>
            <button
              type="button"
              className="link-button danger"
              onClick={() =>
                onChange({
                  coverImageData: '',
                  coverImageId: form.coverImageId === UPLOADED_COVER_ID ? 'library' : form.coverImageId,
                })
              }
            >
              Remove upload
            </button>
          </div>
        ) : null}
        {cover.input}
        {cover.error || errors.coverImageId ? <p className="error-text">{cover.error || errors.coverImageId}</p> : null}
      </div>

      <div className="two-col">
        <Field label="Organiser name" htmlFor="organizer" error={errors.organizerName}>
          <input
            id="organizer"
            maxLength={60}
            value={form.organizerName}
            aria-invalid={Boolean(errors.organizerName)}
            onChange={(event) => onChange({ organizerName: event.target.value })}
          />
        </Field>
        <div className="field">
          <span className="field-label">Organisation logo</span>
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
      </div>

      <div className="divider" />

      <div className="two-col">
        <Field label="Fundraising goal" htmlFor="goal" error={errors.goalAmount}>
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
          <span className="field-label">Suggested donation amounts</span>
          {form.donationMode === 'fixed' ? (
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
          ) : (
            <p className="help">Supporters enter their own amount. Change this in Settings.</p>
          )}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Group type</span>
        <div className="radio-stack">
          <RadioCard
            checked={form.access === 'open'}
            title="Open group"
            text="Anyone can find and support this campaign."
            onSelect={() => onChange({ access: 'open' })}
          />
          <RadioCard
            checked={form.access === 'closed'}
            title="Private group"
            text="People join with a demo code and their name. The group keeps a leadership board and referrals."
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
              A demo code only — not secure access control. Players keep their names, get a referral, and earn points when someone contributes through it.
            </p>
            {errors.accessCode ? <p className="error-text">{errors.accessCode}</p> : null}
          </div>
        ) : null}
      </div>

      <GameGallery form={form} errors={errors} onChange={onChange} org={org} />
    </div>
  )
}

function Field({
  label,
  htmlFor,
  error,
  counter,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  counter?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error || counter ? (
        <div className="field-foot">
          <span className="error-text">{error}</span>
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
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
  org: Organization
}) {
  const gamesAllowed = selectableGames(org).length > 0
  return (
    <div className="settings-stack">
      <section className="panel form-panel">
        <h2>Direct donation amounts</h2>
        <p className="help">Applies to direct donations. Game-based giving uses the game-calculated amount set below.</p>
        <div className="two-col">
          <RadioCard
            checked={form.donationMode === 'fixed'}
            title="Suggested amounts"
            text="Supporters choose from the amounts you set."
            onSelect={() => onChange({ donationMode: 'fixed' })}
          />
          <RadioCard
            checked={form.donationMode === 'custom'}
            title="Custom amount"
            text="Supporters enter any whole amount."
            onSelect={() => onChange({ donationMode: 'custom' })}
          />
        </div>
      </section>

      <section className="panel form-panel">
        <h2>Campaign dates</h2>
        <div className="two-col">
          <Field label="Opens" htmlFor="opens" error={errors.opensAt}>
            <input
              id="opens"
              type="datetime-local"
              value={form.opensAt}
              aria-invalid={Boolean(errors.opensAt)}
              onChange={(event) => onChange({ opensAt: event.target.value })}
            />
          </Field>
          <Field label="Closes" htmlFor="closes" error={errors.closesAt}>
            <input
              id="closes"
              type="datetime-local"
              value={form.closesAt}
              aria-invalid={Boolean(errors.closesAt)}
              onChange={(event) => onChange({ closesAt: event.target.value })}
            />
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
            <strong>Close automatically when the goal is reached</strong>
            <em>The campaign stops accepting contributions once it hits the target.</em>
          </span>
        </label>
      </section>

      <section className="panel form-panel">
        <h2>Participation</h2>
        <div className="option-grid">
          <OptionCard
            checked={form.direct}
            title="Direct donation"
            text={org.visibility.direct ? 'A simple simulated contribution.' : `Direct contributions are hidden for ${org.name}.`}
            disabled={!org.visibility.direct && !form.direct}
            onToggle={() => onChange({ direct: !form.direct })}
          />
          <OptionCard
            checked={form.game}
            title="Game-based giving"
            text={
              !gamesAllowed
                ? `Games are turned off for ${org.name}.`
                : form.game
                  ? gameMeta(form.gameType).name
                  : 'Turn giving into a short game.'
            }
            disabled={!gamesAllowed && !form.game}
            onToggle={() => onChange({ game: !form.game })}
          />
          <div className="option-card disabled">
            <div className="option-top">
              <strong>Voucher rewards</strong>
              <span className="soon-pill">Coming soon</span>
            </div>
            <span className="muted small">Thank-you vouchers from local partners.</span>
          </div>
        </div>
        {form.game ? <GameGallery form={form} errors={errors} onChange={onChange} org={org} /> : null}
        {form.game ? <GameContributionSettingsPanel form={form} errors={errors} onChange={onChange} /> : null}
      </section>
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
                    : { game: true, gameType: game.id, ...gameSettingsFields(game.id) },
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
        {COMING_SOON_GAMES.map((game) => (
          <div key={game.id} className="game-choice soon-choice" aria-disabled="true">
            <span className="soon-art" aria-hidden="true">
              <Icon name="spark" size={26} />
            </span>
            <strong>{game.name}</strong>
            <span className="soon-pill">Coming soon</span>
          </div>
        ))}
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
  return (
    <div className="game-settings">
      <div className="game-settings-head">
        <h3>Game contribution settings</h3>
        <p className="help">
          Contribution mode for games: <strong>Game-calculated amount</strong>. Each completed {config.noun} adds the rate below to
          the supporter’s suggestion. Direct donations keep the amount rules above.
        </p>
      </div>
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
    </div>
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

function safeStamp(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return formatDateTime(date.toISOString())
}

function ReviewStep({ form, onEdit }: { form: CampaignForm; onEdit: (step: number) => void }) {
  const goal = Number(form.goalAmount)
  const rows: Array<[string, string]> = [
    ['Organiser', form.organizerName],
    ['Goal', Number.isFinite(goal) ? formatINR(goal, form.currency) : '—'],
    ['Group type', form.access === 'open' ? 'Open group' : `Private · code ${form.accessCode}`],
    [
      'Amounts',
      form.donationMode === 'custom' ? 'Supporter chooses' : form.fixedAmounts.map((amount) => formatINR(amount, form.currency)).join(', '),
    ],
    ['Opens', safeStamp(form.opensAt)],
    ['Closes', safeStamp(form.closesAt)],
    ['Auto-close', form.autoCloseOnGoal ? 'When the goal is reached' : 'Off'],
    [
      'Participation',
      [form.direct ? 'Direct donation' : null, form.game ? gameMeta(form.gameType).name : null].filter(Boolean).join(' · ') ||
        'None selected',
    ],
  ]
  if (form.game) {
    const settings = formGameSettings(form)
    const config = gameConfig(form.gameType)
    rows.push([
      'Game contribution',
      `${formatPaise(settings.ratePaise)} per ${config.noun}${settings.capPaise ? ` · cap ${formatPaise(settings.capPaise)}` : ''} · ${
        settings.allowCustom ? 'supporters can edit the total' : 'game-calculated amount only'
      }`,
    ])
    if (form.gameType === 'puzzle') {
      rows.push(['Puzzle image', form.puzzleImageData ? 'Uploaded by you' : 'Still needed'])
    }
  }
  return (
    <div className="review-grid">
      <article className="panel review-card">
        <CampaignCover campaign={form} />
        <div className="review-body">
          <div className="org-line">
            <OrgLogo name={form.organizerName} logoData={form.logoData} size={36} />
            <span className="muted">{form.organizerName}</span>
          </div>
          <h2>{form.title.trim() || 'Untitled campaign'}</h2>
          <p className="muted">{form.description.trim()}</p>
          {form.game && form.gameType === 'puzzle' && form.puzzleImageData ? (
            <img className="puzzle-review-art" src={form.puzzleImageData} alt="Community Puzzle artwork" />
          ) : null}
          <button type="button" className="link-button" onClick={() => onEdit(1)}>
            Edit story
          </button>
        </div>
      </article>
      <article className="panel form-panel">
        <h2>Details</h2>
        <dl className="detail-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="link-button" onClick={() => onEdit(2)}>
          Edit settings
        </button>
      </article>
    </div>
  )
}
