import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CampaignCover, OrgLogo } from '../components/CampaignImage.tsx'
import { GamePreviewModal, GameThumb } from '../components/GamePreview.tsx'
import { Icon } from '../components/illustrations.tsx'
import { LivePreview } from '../components/LivePreview.tsx'
import { COVERS, UPLOADED_COVER_ID } from '../data/covers.ts'
import { getCampaign, upsertCampaign } from '../lib/campaigns.ts'
import { formatDateTime, formatINR } from '../lib/format.ts'
import { GAMES, gameMeta } from '../lib/games.ts'
import { IMAGE_ACCEPT, readImageFile } from '../lib/image.ts'
import { StorageFullError } from '../lib/storage.ts'
import type { CampaignForm, GameType } from '../lib/types.ts'
import {
  blankForm,
  campaignToForm,
  clearWizard,
  formToCampaign,
  readWizard,
  validateAll,
  validateSettings,
  validateStory,
  writeWizard,
  type FormErrors,
} from '../lib/wizard.ts'

const STEP_COPY: Record<number, { title: string; sub: string }> = {
  1: { title: 'Create a campaign', sub: 'Start with your story.' },
  2: { title: 'Campaign settings', sub: 'Choose when it runs and how people take part.' },
  3: { title: 'Review your campaign', sub: 'Check the details, then publish it in this browser.' },
}

export function CreateCampaignPage() {
  const [params] = useSearchParams()
  const fresh = params.get('new')
  const draft = params.get('draft')
  const key = fresh ? `new-${fresh}` : draft ? `draft-${draft}` : 'resume'
  return <CreateCampaignEditor key={key} />
}

function CreateCampaignEditor() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [snapshot] = useState(() => initialSnapshot(params))
  const [form, setForm] = useState<CampaignForm>(snapshot.form)
  const [step, setStep] = useState(snapshot.step)
  const [errors, setErrors] = useState<FormErrors>({})
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    document.title = 'Create a campaign — Together'
  }, [])

  useEffect(() => {
    writeWizard({ form, step })
  }, [form, step])

  useEffect(() => {
    if (params.get('new') !== '1') return
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }, [params, setParams])

  function update(patch: Partial<CampaignForm>) {
    setForm((current) => ({ ...current, ...patch }))
    setNotice(null)
  }

  function persist(isDraft: boolean): string | null {
    const existing = form.id ? getCampaign(form.id) : undefined
    const campaign = formToCampaign(form, { isDraft, existing })
    try {
      upsertCampaign(campaign)
      return campaign.id
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof StorageFullError ? error.message : 'The campaign could not be saved in this browser.',
      })
      return null
    }
  }

  function saveDraft() {
    if (form.title.trim().length < 3) {
      setErrors({ title: 'Add a title of at least 3 characters before saving a draft.' })
      setStep(1)
      return
    }
    const id = persist(true)
    if (!id) return
    setForm((current) => ({ ...current, id }))
    setNotice({ tone: 'success', text: 'Draft saved in this browser.' })
  }

  function continueNext() {
    const nextErrors = step === 1 ? validateStory(form) : validateSettings(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep((current) => Math.min(3, current + 1))
  }

  function publish() {
    const nextErrors = validateAll(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStep(Object.keys(validateStory(form)).length > 0 ? 1 : 2)
      return
    }
    const id = persist(false)
    if (!id) return
    clearWizard()
    navigate(`/dashboard?created=${id}`)
  }

  const copy = STEP_COPY[step]

  return (
    <div className="container page-pad create">
      <div className="create-head">
        <div>
          <h1>{copy.title}</h1>
          <p className="lead-sm">{copy.sub}</p>
        </div>
        <Stepper step={step} onStep={setStep} />
      </div>
      {notice ? (
        <div className={`notice ${notice.tone}`} role="status">
          {notice.text}
        </div>
      ) : null}
      {errors.form ? <div className="notice error">{errors.form}</div> : null}
      <div className={step === 3 ? 'create-grid single' : 'create-grid'}>
        <div>
          {step === 1 ? <StoryStep form={form} errors={errors} onChange={update} /> : null}
          {step === 2 ? <SettingsStep form={form} errors={errors} onChange={update} /> : null}
          {step === 3 ? <ReviewStep form={form} onEdit={setStep} /> : null}
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
              <button type="button" className="btn btn-outline" onClick={saveDraft}>
                Save draft
              </button>
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
            <button type="button" className="btn btn-outline" onClick={saveDraft}>
              Save draft
            </button>
            <button type="button" className="btn btn-primary" onClick={publish}>
              Create campaign
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function initialSnapshot(params: URLSearchParams): { form: CampaignForm; step: number } {
  const draftId = params.get('draft')
  if (draftId) {
    const existing = getCampaign(draftId)
    if (existing) return { form: campaignToForm(existing), step: 1 }
  }
  if (params.get('new') === '1') {
    clearWizard()
    return { form: blankForm(), step: 1 }
  }
  return readWizard() ?? { form: blankForm(), step: 1 }
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

function useImagePicker(onPicked: (dataUrl: string) => void, options: Parameters<typeof readImageFile>[1]) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onPicked(await readImageFile(file, options))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That image could not be used.')
    } finally {
      setBusy(false)
    }
  }

  const input = (
    <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} hidden onChange={(event) => void onChange(event)} />
  )
  return { input, open: () => inputRef.current?.click(), busy, error }
}

function StoryStep({
  form,
  errors,
  onChange,
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
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

      <Field label="Description" htmlFor="purpose" error={errors.description} counter={`${form.description.trim().length}/1,000`}>
        <textarea
          id="purpose"
          maxLength={1000}
          rows={4}
          value={form.description}
          aria-invalid={Boolean(errors.description)}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Explain what you are raising money for and who it helps."
        />
      </Field>

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
            <span>₹</span>
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
                    {formatINR(amount)}
                    {form.fixedAmounts.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Remove ${formatINR(amount)}`}
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
                    placeholder="₹ Add"
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
            text="Only people with the demo access code can open it."
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
            <p className="help">A demo code only — not secure access control.</p>
            {errors.accessCode ? <p className="error-text">{errors.accessCode}</p> : null}
          </div>
        ) : null}
      </div>

      <GameGallery form={form} onChange={onChange} />
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
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  return (
    <div className="settings-stack">
      <section className="panel form-panel">
        <h2>Donation amounts</h2>
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
            text="Supporters enter any whole-rupee amount."
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
            text="A simple simulated contribution."
            onToggle={() => onChange({ direct: !form.direct })}
          />
          <OptionCard
            checked={form.game}
            title="Game-based giving"
            text={form.game ? gameMeta(form.gameType).name : 'Turn giving into a short game.'}
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
        {form.game ? <GameGallery form={form} onChange={onChange} /> : null}
      </section>
    </div>
  )
}

function GameGallery({
  form,
  onChange,
}: {
  form: CampaignForm
  onChange: (patch: Partial<CampaignForm>) => void
}) {
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
          {form.game
            ? `${gameMeta(form.gameType).blurb} Preview any game before publishing.`
            : 'Supporters will only see direct giving.'}
        </p>
      </div>
      <div className="game-chooser" role="radiogroup" aria-labelledby="game-gallery-label">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={form.game && form.gameType === game.id ? 'game-choice selected' : 'game-choice'}
          >
            <button
              type="button"
              role="radio"
              aria-checked={form.game && form.gameType === game.id}
              className="game-choice-main"
              onClick={() => onChange({ game: true, gameType: game.id })}
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
          <strong>No game</strong>
          <span>Direct giving only</span>
        </button>
      </div>

      {form.game && form.gameType === 'puzzle' ? (
        <div className="puzzle-upload">
          {puzzle.input}
          <div className="puzzle-upload-row">
            <div>
              <strong>Puzzle image</strong>
              <p className="help">Upload a custom image, or keep the default artwork.</p>
            </div>
            <div className="inline-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={puzzle.open} disabled={puzzle.busy}>
                {puzzle.busy ? 'Uploading…' : form.puzzleImageData ? 'Replace image' : 'Upload image'}
              </button>
              {form.puzzleImageData ? (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange({ puzzleImageData: '' })}>
                  Use default
                </button>
              ) : null}
            </div>
          </div>
          <div className="puzzle-upload-preview">
            <img src={form.puzzleImageData || '/games/puzzle-art.jpg'} alt="Puzzle artwork preview" />
          </div>
          {puzzle.error ? <p className="error-text">{puzzle.error}</p> : null}
        </div>
      ) : null}

      {previewGame ? (
        <GamePreviewModal form={form} gameType={previewGame} onClose={() => setPreviewGame(null)} />
      ) : null}
    </div>
  )
}

function OptionCard({
  checked,
  title,
  text,
  onToggle,
}: {
  checked: boolean
  title: string
  text: string
  onToggle: () => void
}) {
  return (
    <button type="button" className={checked ? 'option-card checked' : 'option-card'} aria-pressed={checked} onClick={onToggle}>
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
    ['Goal', Number.isFinite(goal) ? formatINR(goal) : '—'],
    ['Group type', form.access === 'open' ? 'Open group' : `Private · code ${form.accessCode}`],
    [
      'Amounts',
      form.donationMode === 'custom' ? 'Supporter chooses' : form.fixedAmounts.map((amount) => formatINR(amount)).join(', '),
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
