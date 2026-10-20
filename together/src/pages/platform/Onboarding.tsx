import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { SaveIndicator } from '../../components/drafts/DraftUI.tsx'
import { BrandPreview } from '../../components/org/BrandPreview.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { Checkbox, Select, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { useAutosave } from '../../hooks/useAutosave.ts'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { CURRENCIES, formatMoney, isCurrencyCode } from '../../lib/format.ts'
import { GAMES } from '../../lib/games.ts'
import { COMING_SOON_GAMES, IMAGE_GALLERY, ORG_TYPES, slugify, validateOrganization, validateSlug } from '../../lib/organizations.ts'
import { saveOrganization, setActiveOrgId } from '../../lib/orgStorage.ts'
import { demoPlan } from '../../lib/plans.ts'
import { contrastChecks, FONT_CHOICES, isHexColor } from '../../lib/theme.ts'
import type { FontChoice, GameType, Organization, OrgType } from '../../lib/types.ts'
import { previewOrganization, publicWebsiteUrl, websiteConfigOf, withPublishedWebsite } from '../../lib/website.ts'

const STEPS = ['Organization details', 'Website address', 'Branding', 'Website content', 'Fundraising preferences', 'Review & publish']
const ONBOARDING_TYPES: OrgType[] = ['company', 'school', 'nonprofit', 'club', 'other']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Errors that block leaving a step. Uses the same rules as organization settings. */
function stepErrors(step: number, org: Organization, all: Organization[]): Record<string, string> {
  const errors: Record<string, string> = {}
  const shared = validateOrganization(org, all)
  if (step === 1) {
    if (!org.name.trim()) errors.name = 'Add your organization’s name.'
    if (org.about.trim().length < 10) errors.about = 'Add a short description (at least 10 characters).'
    if (!EMAIL.test(org.content.contactEmail.trim())) errors.contactEmail = 'Enter a public contact email like hello@example.org.'
  }
  if (step === 2) {
    const slug = validateSlug(org.slug, org.id, all)
    if (slug) errors.slug = slug
  }
  if (step === 3) {
    for (const key of ['primary', 'accent', 'background'] as const) if (!isHexColor(org.branding[key])) errors[key] = 'Use a hex colour like #123D36.'
  }
  if (step === 4) {
    if (org.content.headline.trim().length < 3) errors.headline = 'Add a homepage headline.'
    if (org.content.description.trim().length < 10) errors.description = 'Add a short introduction (at least 10 characters).'
  }
  if (step === 5) {
    if (shared['defaults.suggestedAmounts']) errors.amounts = shared['defaults.suggestedAmounts']!
    if (shared['defaults.games']) errors.games = shared['defaults.games']!
    if (shared['visibility.direct']) errors.direct = shared['visibility.direct']!
  }
  return errors
}

export function OnboardingPage() {
  const { organizationId = '' } = useParams()
  const stored = useOrganizations().find((org) => org.id === organizationId)
  // Publishing changes the status mid-session; keep the wizard mounted so it can show the result.
  const [startedInSetup] = useState(stored?.website.status === 'setup')
  if (!stored) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>We couldn’t find that setup</h1>
          <p className="muted">It may have been discarded, or it was started in another browser.</p>
          <Link to="/plans" className="btn btn-primary">
            Start a new website
          </Link>
        </div>
      </div>
    )
  }
  if (stored.website.status !== 'setup' && !startedInSetup) return <Navigate to={`/workspace/${stored.id}/overview`} replace />
  return <Wizard key={stored.id} stored={stored} />
}

function Wizard({ stored }: { stored: Organization }) {
  const navigate = useNavigate()
  const all = useOrganizations()
  const [org, setOrg] = useState<Organization>(() => previewOrganization(stored))
  const [step, setStep] = useState(stored.onboarding?.step ?? 1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [published, setPublished] = useState<Organization | null>(null)
  const snapshot = useMemo(() => ({ org, step }), [org, step])
  const autosave = useAutosave(snapshot, (value) => {
    const now = new Date().toISOString()
    saveOrganization({ ...value.org, website: { status: 'setup', draft: websiteConfigOf(value.org), updatedAt: now }, onboarding: { step: value.step, updatedAt: now } })
  })

  useEffect(() => {
    document.title = `Set up ${org.name || 'your organization'} — Together`
  }, [org.name])

  const patch = (next: Partial<Organization>) => setOrg((current) => ({ ...current, ...next }))
  const patchContent = (next: Partial<Organization['content']>) => setOrg((current) => ({ ...current, content: { ...current.content, ...next } }))
  const patchBranding = (next: Partial<Organization['branding']>) => setOrg((current) => ({ ...current, branding: { ...current.branding, ...next } }))

  function goNext() {
    const next = stepErrors(step, org, all)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setStep((current) => Math.min(6, current + 1))
    window.scrollTo(0, 0)
  }

  function goTo(target: number) {
    // Earlier steps are always reachable; later ones only after the current step is valid.
    if (target > step) {
      for (let index = step; index < target; index += 1) {
        const problems = stepErrors(index, org, all)
        if (Object.keys(problems).length > 0) {
          setStep(index)
          setErrors(problems)
          return
        }
      }
    }
    setErrors({})
    setStep(target)
  }

  function finish(publish: boolean) {
    for (let index = 1; index <= 5; index += 1) {
      const problems = stepErrors(index, org, all)
      if (Object.keys(problems).length > 0) {
        setStep(index)
        setErrors(problems)
        return
      }
    }
    const now = new Date().toISOString()
    const base: Organization = { ...org, website: { status: 'draft', draft: websiteConfigOf(org), updatedAt: now }, onboarding: undefined }
    const final = publish ? withPublishedWebsite(base) : { ...base, onboarding: undefined }
    try {
      saveOrganization(final)
    } catch {
      setErrors({ form: 'This browser could not save your website. Free up storage and try again.' })
      return
    }
    setActiveOrgId(final.id)
    if (publish) setPublished(final)
    else navigate(`/workspace/${final.id}/overview`)
  }

  if (published) return <PublishedScreen org={published} />

  const url = publicWebsiteUrl(org)
  return (
    <div className="container page-pad onboarding">
      <header className="onboarding-head">
        <div>
          <p className="oh-eyebrow">{demoPlan(org.plan.id).name} · simulated, no payment collected</p>
          <h1>Set up your organization website</h1>
        </div>
        <SaveIndicator status={autosave.status} savedAt={autosave.savedAt} error={autosave.error} />
      </header>
      <ol className="onboarding-steps" aria-label="Setup steps">
        {STEPS.map((label, index) => {
          const number = index + 1
          return (
            <li key={label} className={number === step ? 'current' : number < step ? 'done' : ''}>
              <button type="button" onClick={() => goTo(number)} aria-current={number === step ? 'step' : undefined}>
                <span>{number < step ? '✓' : number}</span> {label}
              </button>
            </li>
          )
        })}
      </ol>
      <div className={step === 6 ? 'onboarding-body review' : 'onboarding-body'}>
        <section className="panel form-panel" aria-labelledby="step-title">
          <h2 id="step-title">
            Step {step} of 6 · {STEPS[step - 1]}
          </h2>
          {step === 1 ? (
            <>
              <TextInput label="Organization name" value={org.name} maxLength={80} error={errors.name} onChange={(name) => patch({ name, slug: org.slug.startsWith('new-') && name ? slugify(name) : org.slug })} />
              <Select label="Type" value={org.type} options={ORG_TYPES.filter((type) => ONBOARDING_TYPES.includes(type.id)).map((type) => ({ value: type.id, label: type.label }))} onChange={(type) => patch({ type: type as OrgType })} />
              <TextArea label="Short description" value={org.about} maxLength={600} error={errors.about} help="Shown on your About page. You can expand it later." onChange={(about) => patch({ about })} />
              <TextInput label="Public contact email" type="email" value={org.content.contactEmail} maxLength={120} error={errors.contactEmail} onChange={(contactEmail) => patchContent({ contactEmail })} />
              <TextInput label="Public location" optional value={org.content.location} maxLength={120} help="A city or area. Avoid street addresses." onChange={(location) => patchContent({ location })} />
            </>
          ) : null}
          {step === 2 ? (
            <>
              <TextInput
                label="Website address"
                value={org.slug}
                maxLength={40}
                error={errors.slug}
                help="Lowercase letters, numbers and hyphens. It can’t change after you publish."
                onChange={(slug) => {
                  patch({ slug: slug.replace(/\s+/g, '-') })
                  setErrors({})
                }}
              />
              <div className="url-preview">
                <span className="muted small">Your website will be at</span>
                <code>{url}</code>
                <span className="muted small">
                  Example: together.example/o/{org.slug || 'greenwood-school'}. In this prototype the address works in this browser only.
                </span>
              </div>
              {(() => {
                const live = validateSlug(org.slug, org.id, all)
                return live ? <p className="error-text">{live}</p> : <p className="success-text">This address is available.</p>
              })()}
            </>
          ) : null}
          {step === 3 ? <BrandingStep org={org} errors={errors} patch={patch} patchBranding={patchBranding} patchContent={patchContent} /> : null}
          {step === 4 ? (
            <>
              <TextInput label="Homepage headline" value={org.content.headline} maxLength={120} error={errors.headline} onChange={(headline) => patchContent({ headline })} />
              <TextArea label="Introduction" value={org.content.description} maxLength={400} error={errors.description} onChange={(description) => patchContent({ description })} />
              <TextArea label="About section" value={org.about} maxLength={600} onChange={(about) => patch({ about })} />
              <TextInput label="Contact email" type="email" value={org.content.contactEmail} maxLength={120} onChange={(contactEmail) => patchContent({ contactEmail })} />
              <TextArea label="Footer text" optional value={org.content.footerText} maxLength={240} onChange={(footerText) => patchContent({ footerText })} />
              <Checkbox label="Show an impact section on the homepage" checked={org.visibility.impactStories} onChange={(impactStories) => patch({ visibility: { ...org.visibility, impactStories } })} />
              {org.visibility.impactStories ? (
                <>
                  <TextInput label="Impact title" optional value={org.content.impactTitle} maxLength={100} onChange={(impactTitle) => patchContent({ impactTitle })} />
                  <TextArea label="Impact story" optional value={org.content.impactStory} maxLength={600} help="Describe what your organization has actually done. Leave empty to hide the section." onChange={(impactStory) => patchContent({ impactStory })} />
                </>
              ) : null}
            </>
          ) : null}
          {step === 5 ? <FundraisingStep org={org} errors={errors} patch={patch} /> : null}
          {step === 6 ? (
            <dl className="detail-list">
              <div>
                <dt>Demo plan</dt>
                <dd>
                  {demoPlan(org.plan.id).name} · no payment collected
                </dd>
              </div>
              <div>
                <dt>Website address</dt>
                <dd>
                  <code>{url}</code>
                </dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>
                  {org.name} · {ORG_TYPES.find((type) => type.id === org.type)?.label}
                </dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{[org.content.contactEmail, org.content.location].filter(Boolean).join(' · ')}</dd>
              </div>
              <div>
                <dt>Fonts</dt>
                <dd>
                  {FONT_CHOICES.find((font) => font.id === org.branding.headingFont)?.label} / {FONT_CHOICES.find((font) => font.id === org.branding.bodyFont)?.label}
                </dd>
              </div>
              <div>
                <dt>Fundraising</dt>
                <dd>
                  {org.defaults.currency} · amounts {org.defaults.suggestedAmounts.map((amount) => formatMoney(amount, org.defaults.currency)).join(', ')} ·{' '}
                  {org.visibility.games ? `${org.defaults.games.length} game${org.defaults.games.length === 1 ? '' : 's'}` : 'no games'}
                  {org.visibility.direct ? ' · direct giving' : ''}
                  {org.visibility.assistant ? ' · campaign assistant' : ''}
                </dd>
              </div>
            </dl>
          ) : null}
          {errors.form ? <p className="error-text">{errors.form}</p> : null}
          <div className="inline-actions onboarding-actions">
            {step > 1 ? (
              <button type="button" className="btn btn-outline" onClick={() => goTo(step - 1)}>
                Back
              </button>
            ) : null}
            {step < 6 ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-outline" onClick={() => finish(false)}>
                  Save as draft website
                </button>
                <button type="button" className="btn btn-primary" onClick={() => finish(true)}>
                  Publish demo website
                </button>
              </>
            )}
            <Link to="/start" className="link-button">
              Finish later
            </Link>
          </div>
          {step === 6 ? <p className="muted small">Publishing makes the website available at the address above in this browser. It does not publish any campaigns.</p> : null}
        </section>
        <aside className="onboarding-preview" aria-label="Website preview">
          <div className="preview-toolbar">
            <strong>Preview</strong>
            <div className="segmented small" role="group" aria-label="Preview size">
              <button type="button" className={device === 'desktop' ? 'selected' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
                Desktop
              </button>
              <button type="button" className={device === 'mobile' ? 'selected' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
                Mobile
              </button>
            </div>
          </div>
          <div className="preview-window">
            <BrandPreview org={org} views={[]} device={device} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function ColorInput({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div className={error ? 'colour-field invalid' : 'colour-field'}>
      <span className="field-label">{label}</span>
      <div className="colour-row">
        <input type="color" aria-label={`${label} picker`} value={isHexColor(value) && value.length === 7 ? value : '#000000'} onChange={(event) => onChange(event.target.value)} />
        <input aria-label={`${label} hex value`} value={value} maxLength={7} onChange={(event) => onChange(event.target.value.trim())} />
      </div>
      {error ? <span className="error-text">{error}</span> : null}
    </div>
  )
}

function BrandingStep({
  org,
  errors,
  patch,
  patchBranding,
  patchContent,
}: {
  org: Organization
  errors: Record<string, string>
  patch: (next: Partial<Organization>) => void
  patchBranding: (next: Partial<Organization['branding']>) => void
  patchContent: (next: Partial<Organization['content']>) => void
}) {
  const logo = useImagePicker((data) => patch({ logo: data }), { maxWidth: 256, maxHeight: 256, type: 'image/png', maxChars: 400_000 })
  const hero = useImagePicker((data) => patchContent({ heroImage: data }), { maxWidth: 1400, maxHeight: 1000, type: 'image/jpeg', quality: 0.78, maxChars: 700_000 })
  const warnings = contrastChecks(org.branding).filter((check) => !check.ok)
  return (
    <>
      <div className="field">
        <span className="field-label">Logo</span>
        <div className="image-row">
          <OrgLogoMark org={org} size={56} />
          <button type="button" className="btn btn-outline btn-sm" onClick={logo.open} disabled={logo.busy}>
            {logo.busy ? 'Processing…' : org.logo ? 'Replace logo' : 'Upload logo'}
          </button>
          {org.logo ? (
            <button type="button" className="link-button danger" onClick={() => patch({ logo: '' })}>
              Remove
            </button>
          ) : (
            <span className="help">Optional — your initials are shown without one.</span>
          )}
        </div>
        {logo.input}
        {logo.error ? <p className="error-text">{logo.error}</p> : null}
      </div>
      <TextInput label="Tagline" optional value={org.tagline} maxLength={120} onChange={(tagline) => patch({ tagline })} />
      <div className="colour-grid">
        <ColorInput label="Primary colour" value={org.branding.primary} error={errors.primary} onChange={(primary) => patchBranding({ primary })} />
        <ColorInput label="Accent colour" value={org.branding.accent} error={errors.accent} onChange={(accent) => patchBranding({ accent })} />
        <ColorInput label="Background colour" value={org.branding.background} error={errors.background} onChange={(background) => patchBranding({ background })} />
      </div>
      {warnings.length ? (
        <ul className="contrast-list">
          {warnings.map((check) => (
            <li key={check.id} className="warn">
              <span className="contrast-icon" aria-hidden="true">
                !
              </span>
              <div>
                <strong>{check.label}</strong>
                <span>{check.message}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="two-col">
        <Select label="Heading font" value={org.branding.headingFont} options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))} onChange={(headingFont) => patchBranding({ headingFont: headingFont as FontChoice })} />
        <Select label="Body font" value={org.branding.bodyFont} options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))} onChange={(bodyFont) => patchBranding({ bodyFont: bodyFont as FontChoice })} />
      </div>
      <fieldset className="set-fieldset">
        <legend className="field-label">Hero image</legend>
        <div className="image-gallery">
          {IMAGE_GALLERY.map((image) => (
            <button key={image.src} type="button" className={org.content.heroImage === image.src ? 'gallery-choice selected' : 'gallery-choice'} aria-pressed={org.content.heroImage === image.src} onClick={() => patchContent({ heroImage: image.src })}>
              <img src={image.src} alt="" />
              <span>{image.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={hero.open} disabled={hero.busy}>
          {hero.busy ? 'Processing…' : 'Upload your own'}
        </button>
        {hero.input}
        {hero.error ? <p className="error-text">{hero.error}</p> : null}
      </fieldset>
    </>
  )
}

function FundraisingStep({ org, errors, patch }: { org: Organization; errors: Record<string, string>; patch: (next: Partial<Organization>) => void }) {
  const [amount, setAmount] = useState('')
  const defaults = org.defaults
  const setDefaults = (next: Partial<Organization['defaults']>) => patch({ defaults: { ...defaults, ...next } })
  const setVisibility = (next: Partial<Organization['visibility']>) => patch({ visibility: { ...org.visibility, ...next } })
  return (
    <>
      <Select label="Default currency" value={defaults.currency} options={CURRENCIES.map((item) => ({ value: item.code, label: item.label }))} help="Used for new campaigns. Each campaign keeps its own currency." onChange={(currency) => isCurrencyCode(currency) && setDefaults({ currency })} />
      <Checkbox label="Allow direct contributions" checked={org.visibility.direct} onChange={(direct) => setVisibility({ direct })} />
      {errors.direct ? <p className="error-text">{errors.direct}</p> : null}
      <Checkbox label="Offer games" checked={org.visibility.games} onChange={(games) => setVisibility({ games })} />
      <fieldset className="set-fieldset" disabled={!org.visibility.games}>
        <legend className="field-label">Available games</legend>
        <div className="set-games">
          {GAMES.map((game) => {
            const on = defaults.games.includes(game.id)
            return (
              <label key={game.id} className={on ? 'set-game on' : 'set-game'}>
                <input type="checkbox" checked={on} onChange={() => setDefaults({ games: on ? defaults.games.filter((item) => item !== game.id) : [...defaults.games, game.id as GameType] })} />
                <span>
                  <strong>{game.name}</strong>
                  <em>{game.blurb}</em>
                </span>
              </label>
            )
          })}
          {COMING_SOON_GAMES.map((game) => (
            <div key={game.id} className="set-game soon" aria-disabled="true">
              <span>
                <strong>{game.name}</strong>
                <em>Coming soon</em>
              </span>
            </div>
          ))}
        </div>
        {errors.games ? <p className="error-text">{errors.games}</p> : null}
      </fieldset>
      <div className="field">
        <span className="field-label">Default suggested amounts</span>
        <div className="amount-chips">
          {defaults.suggestedAmounts.map((value) => (
            <span key={value} className="amount-chip-pro">
              {formatMoney(value, defaults.currency)}
              <button type="button" aria-label={`Remove ${formatMoney(value, defaults.currency)}`} onClick={() => setDefaults({ suggestedAmounts: defaults.suggestedAmounts.filter((item) => item !== value) })}>
                ×
              </button>
            </span>
          ))}
          <span className="amount-add">
            <input inputMode="numeric" aria-label="New suggested amount" value={amount} placeholder="Add" onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))} />
            <button
              type="button"
              onClick={() => {
                const value = Number(amount)
                if (value > 0 && !defaults.suggestedAmounts.includes(value) && defaults.suggestedAmounts.length < 5) setDefaults({ suggestedAmounts: [...defaults.suggestedAmounts, value].sort((a, b) => a - b) })
                setAmount('')
              }}
            >
              Add
            </button>
          </span>
        </div>
        {errors.amounts ? <p className="error-text">{errors.amounts}</p> : null}
      </div>
      <Checkbox label="Turn on the campaign creation assistant (AI preview · Simulated)" checked={org.visibility.assistant} onChange={(assistant) => setVisibility({ assistant })} />
    </>
  )
}

function PublishedScreen({ org }: { org: Organization }) {
  const url = publicWebsiteUrl(org)
  const [copied, setCopied] = useState(false)
  return (
    <div className="container narrow page-pad">
      <section className="panel resume-card published-card" aria-labelledby="published-title">
        <span className="success-pill">Demo website published</span>
        <h1 id="published-title">{org.name} is live in this browser</h1>
        <p className="muted">Your website works at this address on this device. Because this prototype has no server, other people can’t see it on their devices.</p>
        <code className="published-url">{url}</code>
        <div className="inline-actions">
          <Link to={`/o/${org.slug}`} className="btn btn-primary">
            Open website
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            {copied ? 'Link copied' : 'Copy website link'}
          </button>
          <Link to={`/workspace/${org.id}/campaigns/new?new=1`} className="btn btn-outline">
            Create your first campaign
          </Link>
          <Link to={`/workspace/${org.id}/overview`} className="link-button">
            Go to workspace
          </Link>
        </div>
      </section>
    </div>
  )
}
