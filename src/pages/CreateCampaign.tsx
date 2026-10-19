import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CoverArt, Icon } from '../components/illustrations.tsx'
import { COVERS } from '../data/covers.ts'
import { LivePreview } from '../components/LivePreview.tsx'
import { getCampaign, upsertCampaign } from '../lib/campaigns.ts'
import { formatDateTime, formatINR } from '../lib/format.ts'
import type { CampaignForm } from '../lib/types.ts'
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
  const [notice, setNotice] = useState('')

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
    setNotice('')
  }

  function saveDraft() {
    if (form.title.trim().length < 3) {
      setErrors({ title: 'Add a title of at least 3 characters before saving a draft.' })
      setStep(1)
      return
    }
    const existing = form.id ? getCampaign(form.id) : undefined
    const campaign = formToCampaign(form, { isDraft: true, existing })
    upsertCampaign(campaign)
    setForm((current) => ({ ...current, id: campaign.id }))
    setNotice('Draft saved in this browser.')
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
      if (nextErrors.title || nextErrors.description || nextErrors.coverImageId || nextErrors.organizerName) setStep(1)
      else setStep(2)
      return
    }
    const existing = form.id ? getCampaign(form.id) : undefined
    const campaign = formToCampaign(form, { isDraft: false, existing })
    upsertCampaign(campaign)
    clearWizard()
    navigate(`/dashboard?created=${campaign.id}`)
  }

  return (
    <div className="page create-page">
      <div className="create-intro">
        <h1>{step === 2 ? 'Make the campaign yours' : step === 3 ? 'Review and publish' : 'Bring your cause to life'}</h1>
        <p>
          {step === 2
            ? 'Set your campaign details and how people can participate.'
            : step === 3
              ? 'Check the details, then save the campaign in this browser.'
              : 'Create a campaign to rally support, make an impact and show what’s possible together.'}
        </p>
        <Stepper step={step} onStep={setStep} />
      </div>
      {notice ? <div className="banner success">{notice}</div> : null}
      {errors.form ? <div className="banner error">{errors.form}</div> : null}
      <div className={step === 3 ? 'create-layout single' : 'create-layout'}>
        <div className="create-main">
          {step === 1 ? <StoryStep form={form} errors={errors} onChange={update} /> : null}
          {step === 2 ? <SettingsStep form={form} errors={errors} onChange={update} /> : null}
          {step === 3 ? <ReviewStep form={form} onEdit={setStep} /> : null}
          <div className="wizard-actions">
            {step === 1 ? (
              <button type="button" className="btn btn-secondary" onClick={saveDraft}>
                Save draft
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => setStep((current) => current - 1)}>
                <Icon name="back" size={16} />
                Back
              </button>
            )}
            <div className="wizard-actions-right">
              {step < 3 ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={continueNext}>
                    {step === 1 ? 'Continue to settings' : 'Review campaign'}
                    <Icon name="arrow" size={16} />
                  </button>
                  {step === 1 ? (
                    <span className="soon-inline">
                      Invite co-organisers
                      <span className="coming-badge">Coming soon</span>
                    </span>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={saveDraft}>
                      Save draft
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={publish}>
                  Create campaign
                  <Icon name="arrow" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        {step < 3 ? <LivePreview form={form} /> : null}
      </div>
      <p className="fine-print">
        Publishing stores this campaign locally in your browser. <Link to="/dashboard">My demo campaigns</Link>
      </p>
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
    <ol className="stepper">
      {labels.map((label, index) => {
        const number = index + 1
        const state = number === step ? 'current' : number < step ? 'done' : 'todo'
        return (
          <li key={label} className={`step ${state}`}>
            {number < step ? (
              <button type="button" onClick={() => onStep(number)}>
                {number}
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
}: {
  form: CampaignForm
  errors: FormErrors
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  return (
    <div className="form-card">
      <label htmlFor="title">
        Campaign title
        <input
          id="title"
          maxLength={80}
          value={form.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="Grow Our School Library"
        />
      </label>
      <div className="field-meta">
        <span>{errors.title ? <em className="field-error">{errors.title}</em> : 'Keep it clear and inspiring. This will be the headline for your campaign.'}</span>
        <span>{form.title.trim().length}/80</span>
      </div>
      <label htmlFor="organizer">
        Organiser
        <input
          id="organizer"
          maxLength={60}
          value={form.organizerName}
          aria-invalid={Boolean(errors.organizerName)}
          onChange={(event) => onChange({ organizerName: event.target.value })}
        />
      </label>
      {errors.organizerName ? <p className="field-error">{errors.organizerName}</p> : <p className="hint">Shown on the campaign page. A sample name is fine.</p>}
      <label htmlFor="purpose">
        Purpose
        <textarea
          id="purpose"
          maxLength={1000}
          rows={6}
          value={form.description}
          aria-invalid={Boolean(errors.description)}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Tell the story. Why does this matter? Who will it help?"
        />
      </label>
      <div className="field-meta">
        <span>
          {errors.description ? (
            <em className="field-error">{errors.description}</em>
          ) : (
            'A genuine, personal story helps people connect with your cause.'
          )}
        </span>
        <span>{form.description.trim().length}/1,000</span>
      </div>
      <fieldset>
        <legend>Cover image</legend>
        <p className="hint">Choose an image that represents your campaign. You can change it later.</p>
        <div className="cover-picker">
          {COVERS.map((cover) => (
            <button
              key={cover.id}
              type="button"
              className={form.coverImageId === cover.id ? 'cover-option selected' : 'cover-option'}
              onClick={() => onChange({ coverImageId: cover.id })}
              aria-pressed={form.coverImageId === cover.id}
            >
              <CoverArt id={cover.id} label={cover.alt} />
              <span>{cover.label}</span>
              {form.coverImageId === cover.id ? <i className="cover-check">✓</i> : null}
            </button>
          ))}
        </div>
        {errors.coverImageId ? <p className="field-error">{errors.coverImageId}</p> : null}
      </fieldset>
    </div>
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
  const [draftAmount, setDraftAmount] = useState('')
  const [amountError, setAmountError] = useState('')

  function addAmount() {
    const amount = Number(draftAmount)
    if (!/^\d+$/.test(draftAmount) || !Number.isInteger(amount) || amount <= 0) {
      setAmountError('Enter a whole amount greater than zero.')
      return
    }
    if (form.fixedAmounts.includes(amount)) {
      setAmountError('That amount is already listed.')
      return
    }
    if (form.fixedAmounts.length >= 6) {
      setAmountError('You can suggest up to 6 amounts.')
      return
    }
    onChange({ fixedAmounts: [...form.fixedAmounts, amount].sort((a, b) => a - b) })
    setDraftAmount('')
    setAmountError('')
  }

  return (
    <div className="settings-grid">
      <section className="form-card">
        <h2>Access</h2>
        <p className="hint">Who can view and support this campaign.</p>
        <div className="choice-grid">
          <button
            type="button"
            className={form.access === 'open' ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ access: 'open' })}
          >
            <strong>Open</strong>
            <span>Anyone can find and support this campaign.</span>
          </button>
          <button
            type="button"
            className={form.access === 'closed' ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ access: 'closed' })}
          >
            <strong>Closed</strong>
            <span>Only people with a demo code can access.</span>
          </button>
        </div>
        {form.access === 'closed' ? (
          <label htmlFor="access-code">
            Demo access code
            <input
              id="access-code"
              value={form.accessCode}
              maxLength={12}
              aria-invalid={Boolean(errors.accessCode)}
              onChange={(event) => onChange({ accessCode: event.target.value.toUpperCase() })}
            />
          </label>
        ) : null}
        <p className="hint">Closed uses a demo code, not secure access control.</p>
        {errors.accessCode ? <p className="field-error">{errors.accessCode}</p> : null}
      </section>

      <section className="form-card">
        <h2>Goal amount</h2>
        <p className="hint">Set a fundraising goal for your campaign.</p>
        <label htmlFor="goal" className="rupee-field">
          <span>₹</span>
          <input
            id="goal"
            inputMode="numeric"
            value={form.goalAmount}
            aria-invalid={Boolean(errors.goalAmount)}
            onChange={(event) => onChange({ goalAmount: event.target.value.replace(/[^\d]/g, '') })}
          />
        </label>
        {errors.goalAmount ? <p className="field-error">{errors.goalAmount}</p> : <p className="hint">This helps supporters understand your target.</p>}
      </section>

      <section className="form-card">
        <h2>Donation amounts</h2>
        <p className="hint">Choose how supporters can give.</p>
        <div className="choice-grid">
          <button
            type="button"
            className={form.donationMode === 'fixed' ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ donationMode: 'fixed' })}
          >
            <strong>Fixed amounts</strong>
            <span>Suggest a few amounts for quick giving.</span>
          </button>
          <button
            type="button"
            className={form.donationMode === 'custom' ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ donationMode: 'custom' })}
          >
            <strong>Custom amount</strong>
            <span>Let supporters choose any amount.</span>
          </button>
        </div>
        {form.donationMode === 'fixed' ? (
          <>
            <div className="amount-editor">
              {form.fixedAmounts.map((amount) => (
                <span key={amount} className="amount-chip">
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
              <span className="add-amount">
                <input
                  inputMode="numeric"
                  value={draftAmount}
                  placeholder="Add"
                  aria-label="New suggested amount"
                  onChange={(event) => setDraftAmount(event.target.value.replace(/[^\d]/g, ''))}
                />
                <button type="button" onClick={addAmount}>
                  Add amount
                </button>
              </span>
            </div>
            {amountError || errors.fixedAmounts ? <p className="field-error">{amountError || errors.fixedAmounts}</p> : null}
            <p className="hint">Optional suggestion only — the supporter confirms the amount.</p>
          </>
        ) : (
          <p className="hint">Supporters enter their own whole-rupee amount on the campaign page.</p>
        )}
      </section>

      <section className="form-card">
        <h2>Campaign dates</h2>
        <p className="hint">Set when your campaign will be live.</p>
        <div className="date-grid">
          <label htmlFor="opens">
            Open date and time
            <input
              id="opens"
              type="datetime-local"
              value={form.opensAt}
              aria-invalid={Boolean(errors.opensAt)}
              onChange={(event) => onChange({ opensAt: event.target.value })}
            />
          </label>
          <label htmlFor="closes">
            Close date and time
            <input
              id="closes"
              type="datetime-local"
              value={form.closesAt}
              aria-invalid={Boolean(errors.closesAt)}
              onChange={(event) => onChange({ closesAt: event.target.value })}
            />
          </label>
        </div>
        {errors.opensAt ? <p className="field-error">{errors.opensAt}</p> : null}
        {errors.closesAt ? <p className="field-error">{errors.closesAt}</p> : null}
        <label className="switch-row">
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
            <strong>Close automatically when goal reached</strong>
            <em>The campaign ends early if the goal is achieved.</em>
          </span>
        </label>
      </section>

      <section className="form-card span-2">
        <h2>Participation options</h2>
        <p className="hint">Choose how people can take part in your campaign.</p>
        <div className="participate-grid">
          <button
            type="button"
            className={form.direct ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ direct: !form.direct })}
            aria-pressed={form.direct}
          >
            <strong>Direct donation</strong>
            <span>People can support with a simple simulated donation.</span>
          </button>
          <button
            type="button"
            className={form.game ? 'choice-card selected' : 'choice-card'}
            onClick={() => onChange({ game: !form.game })}
            aria-pressed={form.game}
          >
            <strong>Game-based giving</strong>
            <span>Turn giving into a short planting moment.</span>
            <em className="game-name">Grow Our Garden</em>
          </button>
          <div className="choice-card disabled">
            <div className="coming-row">
              <strong>Voucher rewards</strong>
              <span className="coming-badge">Coming soon</span>
            </div>
            <span>Reward supporters with special vouchers from partners.</span>
            <p className="hint">Voucher rewards will be available in a future update.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function safeStamp(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return formatDateTime(date.toISOString())
}

function ReviewStep({ form, onEdit }: { form: CampaignForm; onEdit: (step: number) => void }) {
  const goal = Number(form.goalAmount)
  return (
    <div className="review-layout">
      <article className="form-card review-story">
        <CoverArt id={form.coverImageId} />
        <h2>{form.title.trim() || 'Untitled campaign'}</h2>
        <p className="organizer">{form.organizerName}</p>
        <p>{form.description.trim()}</p>
        <button type="button" className="text-button" onClick={() => onEdit(1)}>
          Edit story
        </button>
      </article>
      <article className="form-card">
        <h2>Settings</h2>
        <dl className="review-list">
          <div>
            <dt>Access</dt>
            <dd>{form.access === 'open' ? 'Open' : `Closed · demo code ${form.accessCode}`}</dd>
          </div>
          <div>
            <dt>Goal</dt>
            <dd>{Number.isFinite(goal) ? formatINR(goal) : '—'}</dd>
          </div>
          <div>
            <dt>Amounts</dt>
            <dd>
              {form.donationMode === 'custom'
                ? 'Supporter chooses an amount'
                : form.fixedAmounts.map((amount) => formatINR(amount)).join(', ')}
            </dd>
          </div>
          <div>
            <dt>Opens</dt>
            <dd>{safeStamp(form.opensAt)}</dd>
          </div>
          <div>
            <dt>Closes</dt>
            <dd>{safeStamp(form.closesAt)}</dd>
          </div>
          <div>
            <dt>Auto-close</dt>
            <dd>{form.autoCloseOnGoal ? 'Yes, when the goal is reached' : 'No'}</dd>
          </div>
          <div>
            <dt>Participation</dt>
            <dd>
              {[form.direct ? 'Direct donation' : null, form.game ? 'Grow Our Garden' : null].filter(Boolean).join(' · ') ||
                'None selected'}
            </dd>
          </div>
        </dl>
        {form.access === 'closed' ? (
          <p className="hint">Share the demo code with supporters. It is not production-grade access control.</p>
        ) : null}
        <button type="button" className="text-button" onClick={() => onEdit(2)}>
          Edit settings
        </button>
      </article>
    </div>
  )
}
