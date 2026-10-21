import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { SaveIndicator } from '../../components/drafts/DraftUI.tsx'
import { FeaturePicker } from '../../components/org/FeaturePicker.tsx'
import { BrandPreview } from '../../components/org/BrandPreview.tsx'
import { PaletteSwatches } from '../../components/org/PaletteSwatches.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { Checkbox, Select, TextArea, TextInput } from '../../components/workspace/fields.tsx'
import { useAutosave } from '../../hooks/useAutosave.ts'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { CURRENCIES, formatMoney, isCurrencyCode, setDisplayTimeZone, TIME_ZONES } from '../../lib/format.ts'
import { GAMES } from '../../lib/games.ts'
import { COMING_SOON_GAMES, IMAGE_GALLERY, ORG_TYPES, slugFollowsName, slugify, validateOrganization, validateSlug } from '../../lib/organizations.ts'
import { setActiveOrgId } from '../../lib/orgStorage.ts'
import { saveOrganizationAs } from '../../lib/orgActions.ts'
import { AccessDenied } from '../../components/identity/AccessDenied.tsx'
import { useCurrentUser } from '../../hooks/useIdentity.ts'
import { ownsSetup } from '../../lib/permissions.ts'
import {
  ALWAYS_INCLUDED,
  capabilityName,
  clampFeaturesToPlan,
  enabledFeatureLabels,
  recommendedFeatures,
  selectedCapabilities,
  voucherSelectionError,
} from '../../lib/features.ts'
import { demoPlan, optionalFeatureNames } from '../../lib/plans.ts'
import { contrastChecks, FONT_CHOICES, isHexColor } from '../../lib/theme.ts'
import type { FontChoice, GameType, Organization, OrgFeatures, OrgType, VoucherSettings } from '../../lib/types.ts'
import { previewOrganization, publicWebsiteUrl, resumeSetupStep, sampleWebsiteContent, SETUP_STEP_COUNT, websiteConfigOf, withPublishedWebsite } from '../../lib/website.ts'

const STEPS = ['Your organization', 'Website features', 'Your look and content', 'Review selections', 'Confirm and publish']
const LAST = SETUP_STEP_COUNT
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
    const slug = validateSlug(org.slug, org.id, all)
    if (slug) errors.slug = slug
  }
  if (step === 2) {
    const voucher = voucherSelectionError(org.features, org.voucherSettings)
    if (voucher) errors.vouchers = voucher
  }
  if (step === 3) {
    for (const key of ['primary', 'accent', 'background'] as const) if (!isHexColor(org.branding[key])) errors[key] = 'Use a hex colour like #123D36.'
    if (shared['defaults.suggestedAmounts']) errors.amounts = shared['defaults.suggestedAmounts']!
    if (shared['defaults.games']) errors.games = shared['defaults.games']!
    if (shared['visibility.direct']) errors.direct = shared['visibility.direct']!
  }
  return errors
}

export function OnboardingPage() {
  const { organizationId = '' } = useParams()
  const stored = useOrganizations().find((org) => org.id === organizationId)
  const user = useCurrentUser()
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
  if (!ownsSetup(user, stored.id)) return <AccessDenied reason="Only an Organization Admin of this organization can continue its setup." />
  if (stored.website.status !== 'setup' && !startedInSetup) return <Navigate to={`/workspace/${stored.id}/overview`} replace />
  return <Wizard key={stored.id} stored={stored} />
}

function Wizard({ stored }: { stored: Organization }) {
  const navigate = useNavigate()
  const all = useOrganizations()
  const [org, setOrg] = useState<Organization>(() => previewOrganization(stored))
  const [step, setStep] = useState(resumeSetupStep(stored.onboarding))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [published, setPublished] = useState<Organization | null>(null)
  const snapshot = useMemo(() => ({ org, step }), [org, step])
  const finished = useRef(false)
  const autosave = useAutosave(snapshot, (value) => {
    if (finished.current) return
    const now = new Date().toISOString()
    saveOrganizationAs('org.manageWebsite', { ...value.org, website: { status: 'setup', draft: websiteConfigOf(value.org), updatedAt: now }, onboarding: { step: value.step, updatedAt: now, flow: 5 } }, null)
  })

  useEffect(() => {
    document.title = `Set up ${org.name || 'your organization'} — Together`
  }, [org.name])

  setDisplayTimeZone(org.timezone)
  const patch = (next: Partial<Organization>) => setOrg((current) => ({ ...current, ...next }))
  const patchContent = (next: Partial<Organization['content']>) => setOrg((current) => ({ ...current, content: { ...current.content, ...next } }))
  const patchBranding = (next: Partial<Organization['branding']>) => setOrg((current) => ({ ...current, branding: { ...current.branding, ...next } }))
  const patchFeatures = (features: OrgFeatures) => setOrg((current) => ({ ...current, features: clampFeaturesToPlan(features, current.plan.id) }))
  const patchVoucherSettings = (voucherSettings: VoucherSettings) => {
    setOrg((current) => ({ ...current, voucherSettings }))
    setErrors((current) => ({ ...current, vouchers: '' }))
  }

  function goNext() {
    const next = stepErrors(step, org, all)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setStep((current) => Math.min(LAST, current + 1))
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
    for (let index = 1; index < LAST; index += 1) {
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
    finished.current = true
    try {
      saveOrganizationAs('org.manageWebsite', final, publish ? 'website.published' : 'website.saved')
    } catch {
      finished.current = false
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
          <p className="oh-eyebrow">{demoPlan(org.plan.id).name} · no payment taken</p>
          <h1>Create your website</h1>
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
      <div className={step === LAST ? 'onboarding-body review' : 'onboarding-body'}>
        <section className="panel form-panel" aria-labelledby="step-title">
          <h2 id="step-title">
            Step {step} of {LAST} · {STEPS[step - 1]}
          </h2>
          {step === 1 ? (
            <>
              <p className="muted">Tell supporters who you are, and choose the link you’ll share. Fields marked Optional can be skipped.</p>
              <TextInput label="Organization name" value={org.name} maxLength={80} error={errors.name} help="For example: Greenwood School" onChange={(name) => patch({ name, slug: slugFollowsName(org) && slugify(name) ? slugify(name) : org.slug })} />
              <Select label="Type" value={org.type} options={ORG_TYPES.filter((type) => ONBOARDING_TYPES.includes(type.id)).map((type) => ({ value: type.id, label: type.label }))} onChange={(type) => patch({ type: type as OrgType, features: recommendedFeatures(type as OrgType, org.plan.id) })} />
              <TextArea label="Short description" value={org.about} maxLength={600} error={errors.about} help="One or two sentences, e.g. “A primary school of 400 pupils with a big garden and a bigger heart.” Shown on your About page." onChange={(about) => patch({ about })} />
              <TextInput label="Public contact email" type="email" value={org.content.contactEmail} maxLength={120} error={errors.contactEmail} help="Supporters can write to this address. For example: office@greenwood.example" onChange={(contactEmail) => patchContent({ contactEmail })} />
              <TextInput label="Public location" optional value={org.content.location} maxLength={120} help="A city or area. Avoid street addresses." onChange={(location) => patchContent({ location })} />
              <TextInput
                label="Website address"
                value={org.slug}
                maxLength={40}
                error={errors.slug}
                help="This is the link you’ll share with your community. Use lowercase letters, numbers and hyphens. It can’t change after you publish."
                onChange={(slug) => {
                  patch({ slug: slug.replace(/\s+/g, '-') })
                  setErrors({})
                }}
              />
              <div className="url-preview">
                <span className="muted small">Your website will be at</span>
                <code>{url}</code>
                <span className="muted small">In this demo the link works on this device only.</span>
              </div>
              {(() => {
                const live = validateSlug(org.slug, org.id, all)
                return live ? <p className="error-text">{live}</p> : <p className="success-text">This address is available.</p>
              })()}
            </>
          ) : null}
          {step === 2 ? (
            <>
              <h3 className="feature-heading">Choose what your fundraising website needs.</h3>
              <p className="muted">Start with the essentials. You can manage optional features later.</p>
              <FeaturePicker
                features={org.features}
                voucherSettings={org.voucherSettings}
                planId={org.plan.id}
                orgType={org.type}
                onChange={patchFeatures}
                onVoucherSettingsChange={patchVoucherSettings}
                voucherError={errors.vouchers || undefined}
              />
            </>
          ) : null}
          {step === 3 ? (
            <LookAndContentStep org={org} errors={errors} patch={patch} patchBranding={patchBranding} patchContent={patchContent} />
          ) : null}
          {step === 4 ? (
            <dl className="detail-list">
              <div>
                <dt>Organization</dt>
                <dd>
                  {org.name} · {ORG_TYPES.find((type) => type.id === org.type)?.label}
                </dd>
              </div>
              <div>
                <dt>Website address</dt>
                <dd>
                  <code>{url}</code>
                </dd>
              </div>
              <div>
                <dt>Selected demo plan</dt>
                <dd>{demoPlan(org.plan.id).name} · no payment collected</dd>
              </div>
              <div>
                <dt>Selected optional features</dt>
                <dd>
                  {enabledFeatureLabels(org).filter((label) => label !== 'Give & Get Local').join(' · ') || 'None — essentials only'}
                </dd>
              </div>
              <div>
                <dt>Partner vouchers</dt>
                <dd>
                  <VoucherSelectionSummary org={org} onEdit={() => goTo(2)} />
                </dd>
              </div>
              <div>
                <dt>Always included</dt>
                <dd>{ALWAYS_INCLUDED.join(' · ')}</dd>
              </div>
              <div>
                <dt>Look</dt>
                <dd>
                  {org.content.headline.trim() || org.name || 'Your name'} · main colour {org.branding.primary}
                </dd>
              </div>
              <div>
                <dt>Configuration still needed</dt>
                <dd>
                  {org.features.partnerVouchers
                    ? 'Add partner stores and offers under Partner offers after setup. '
                    : ''}
                  Detailed settings for each feature are collected when you first use them — nothing else is required to publish.
                </dd>
              </div>
            </dl>
          ) : null}
          {step === 5 ? (
            <div className="confirm-subscribe">
              <p>
                You are about to confirm a <strong>simulated subscription</strong> to the {demoPlan(org.plan.id).name} and publish <strong>{org.name}</strong> at{' '}
                <code>{url}</code>.
              </p>
              <p className="muted small">
                No payment is collected. There is no billing, renewal or invoice. Optional features included in this plan: {optionalFeatureNames(org.plan.id).join(', ')}.
                Publishing the website does not publish any campaign drafts.
              </p>
              <p>
                <strong>Selected:</strong> {enabledFeatureLabels(org).length ? enabledFeatureLabels(org).join(', ') : 'Essentials only'}.
              </p>
              <VoucherSelectionSummary org={org} onEdit={() => goTo(2)} />
            </div>
          ) : null}
          {errors.form ? <p className="error-text">{errors.form}</p> : null}
          <div className="inline-actions onboarding-actions">
            {step > 1 ? (
              <button type="button" className="btn btn-outline" onClick={() => goTo(step - 1)}>
                Back
              </button>
            ) : null}
            {step < LAST ? (
              <button type="button" className="btn btn-primary" onClick={goNext}>
                Continue
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-outline" onClick={() => finish(false)}>
                  Save as draft website
                </button>
                <button type="button" className="btn btn-primary" onClick={() => finish(true)}>
                  Confirm simulated subscription and publish
                </button>
              </>
            )}
            <Link to="/start" className="link-button">
              Finish later
            </Link>
          </div>
          {step === LAST ? <p className="muted small">Confirming publishes your website at the address above on this device. It doesn’t publish any campaigns.</p> : null}
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

function VoucherSelectionSummary({ org, onEdit }: { org: Organization; onEdit: () => void }) {
  const capabilities = org.features.partnerVouchers ? selectedCapabilities(org.voucherSettings) : []
  return (
    <div className="voucher-summary">
      {capabilities.length > 0 ? (
        <>
          <p>
            <strong>Partner vouchers: Enabled</strong>
          </p>
          <p className="muted small">Selected capabilities:</p>
          <ul>
            {capabilities.map((capability) => (
              <li key={capability}>{capabilityName(capability)}</li>
            ))}
          </ul>
          <p className="muted small">Partner stores and offers are added after setup. Status: Included in your demo plan.</p>
        </>
      ) : (
        <p>
          <strong>Partner vouchers: Not selected</strong>
        </p>
      )}
      <button type="button" className="link-button" onClick={onEdit}>
        Edit selection
      </button>
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

function LookAndContentStep(props: {
  org: Organization
  errors: Record<string, string>
  patch: (next: Partial<Organization>) => void
  patchBranding: (next: Partial<Organization['branding']>) => void
  patchContent: (next: Partial<Organization['content']>) => void
}) {
  const { org, errors, patch, patchContent } = props
  const [sampleNote, setSampleNote] = useState(false)
  function useSample() {
    const sample = sampleWebsiteContent(org)
    patchContent({
      headline: org.content.headline.trim() || sample.headline,
      description: org.content.description.trim() || sample.description,
      footerText: org.content.footerText.trim() || sample.footerText,
    })
    if (org.about.trim().length < 10) patch({ about: sample.about })
    setSampleNote(true)
  }
  return (
    <>
      <p className="muted">Choose a colour and a photo, then write a headline. Your preview updates as you type. You can change everything later.</p>
      <PaletteSwatches branding={org.branding} onApply={(colors) => props.patchBranding(colors)} />
      <BrandingStep {...props} essentialOnly />
      <div className="sample-row">
        <button type="button" className="btn btn-outline btn-sm" onClick={useSample}>
          Use sample content
        </button>
        <span className="muted small">Fills empty text with an editable example.</span>
      </div>
      {sampleNote ? (
        <p className="notice success compact" role="status">
          Sample content added. Edit it so it describes {org.name || 'your organization'}.
        </p>
      ) : null}
      <TextInput label="Homepage headline" optional value={org.content.headline} maxLength={120} help="For example: Help Greenwood grow. If empty, we show your name." onChange={(headline) => patchContent({ headline })} />
      <TextArea label="Introduction" optional value={org.content.description} maxLength={400} help="One or two sentences under the headline." onChange={(description) => patchContent({ description })} />
      <details className="customize-more">
        <summary>Customize more (optional)</summary>
        <div className="customize-body">
          <BrandingStep {...props} />
          <TextArea label="Footer text" optional value={org.content.footerText} maxLength={240} onChange={(footerText) => patchContent({ footerText })} />
          <Checkbox label="Show an impact section on the homepage" checked={org.visibility.impactStories} onChange={(impactStories) => patch({ visibility: { ...org.visibility, impactStories } })} />
          {org.visibility.impactStories ? (
            <>
              <TextInput label="Impact title" optional value={org.content.impactTitle} maxLength={100} onChange={(impactTitle) => patchContent({ impactTitle })} />
              <TextArea label="Impact story" optional value={org.content.impactStory} maxLength={600} help="Describe what your organization has actually done." onChange={(impactStory) => patchContent({ impactStory })} />
            </>
          ) : null}
        </div>
      </details>
      <details className="customize-more" open={Boolean(errors.amounts || errors.games || errors.direct)}>
        <summary>Fundraising preferences (optional — sensible defaults are set)</summary>
        <div className="customize-body">
          <FundraisingStep org={org} errors={errors} patch={patch} />
        </div>
      </details>
    </>
  )
}

function BrandingStep({
  org,
  errors,
  patch,
  patchBranding,
  patchContent,
  essentialOnly = false,
}: {
  org: Organization
  errors: Record<string, string>
  patch: (next: Partial<Organization>) => void
  patchBranding: (next: Partial<Organization['branding']>) => void
  patchContent: (next: Partial<Organization['content']>) => void
  essentialOnly?: boolean
}) {
  const logo = useImagePicker((data) => patch({ logo: data }), { maxWidth: 256, maxHeight: 256, type: 'image/png', maxChars: 400_000 })
  const hero = useImagePicker((data) => patchContent({ heroImage: data }), { maxWidth: 1400, maxHeight: 1000, type: 'image/jpeg', quality: 0.78, maxChars: 700_000 })
  const warnings = contrastChecks(org.branding).filter((check) => !check.ok)
  const logoField = (
    <div className="field">
      <span className="field-label">
        Logo <span className="optional-tag">Optional</span>
      </span>
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
          <span className="help">Without a logo, your initials are shown.</span>
        )}
      </div>
      {logo.input}
      {logo.error ? <p className="error-text">{logo.error}</p> : null}
    </div>
  )
  if (essentialOnly) {
    return (
      <>
        <ColorInput label="Main colour" value={org.branding.primary} error={errors.primary} onChange={(primary) => patchBranding({ primary })} />
        {warnings.length ? <p className="muted small">{warnings[0].message}</p> : null}
        <fieldset className="set-fieldset">
          <legend className="field-label">Homepage photo</legend>
          <div className="image-gallery">
            {IMAGE_GALLERY.map((image) => (
              <button key={image.src} type="button" className={org.content.heroImage === image.src ? 'gallery-choice selected' : 'gallery-choice'} aria-pressed={org.content.heroImage === image.src} onClick={() => patchContent({ heroImage: image.src })}>
                <img src={image.src} alt="" />
                <span>{image.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={hero.open} disabled={hero.busy}>
            {hero.busy ? 'Processing…' : 'Upload your own photo'}
          </button>
          {hero.input}
          {hero.error ? <p className="error-text">{hero.error}</p> : null}
        </fieldset>
      </>
    )
  }
  return (
    <>
      {logoField}
      <TextInput label="Tagline" optional value={org.tagline} maxLength={120} help="A short line shown beside your name." onChange={(tagline) => patch({ tagline })} />
      <div className="colour-grid">
        <ColorInput label="Accent colour" value={org.branding.accent} error={errors.accent} onChange={(accent) => patchBranding({ accent })} />
        <ColorInput label="Background colour" value={org.branding.background} error={errors.background} onChange={(background) => patchBranding({ background })} />
      </div>
      <div className="two-col">
        <Select label="Heading font" value={org.branding.headingFont} options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))} onChange={(headingFont) => patchBranding({ headingFont: headingFont as FontChoice })} />
        <Select label="Body font" value={org.branding.bodyFont} options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))} onChange={(bodyFont) => patchBranding({ bodyFont: bodyFont as FontChoice })} />
      </div>
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
      <Select label="Timezone for date-times" value={org.timezone ?? ''} options={TIME_ZONES.map((zone) => ({ value: zone.id, label: zone.label }))} help="Shown beside date-times. Calendar-only dates keep their day." onChange={(timezone) => patch({ timezone: timezone || undefined })} />
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
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = `Your website is ready — ${org.name}`
    heading.current?.focus()
  }, [org.name])
  return (
    <div className="container narrow page-pad">
      <section className="panel resume-card published-card" aria-labelledby="published-title">
        <span className="success-pill">Demo website published</span>
        <h1 id="published-title" tabIndex={-1} ref={heading}>
          Your website is ready.
        </h1>
        <p className="muted">
          {org.name} is live at this address in this browser. Because this prototype has no server, other people can’t open it on their devices yet.
        </p>
        <code className="published-url">{url}</code>
        <p>Next, create a campaign so supporters have something to give to. Your website shows it as soon as it is published.</p>
        <div className="inline-actions">
          <Link to={`/workspace/${org.id}/campaigns/new?new=1`} className="btn btn-primary btn-lg">
            Create your first campaign
          </Link>
          <Link to={`/o/${org.slug}`} className="btn btn-outline">
            Open website
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopy('copied')
              } catch {
                setCopy('failed')
              }
            }}
          >
            {copy === 'copied' ? 'Link copied.' : 'Copy website link'}
          </button>
        </div>
        <p className={copy === 'failed' ? 'error-text small' : 'sr-only'} role="status">
          {copy === 'copied' ? 'Link copied.' : copy === 'failed' ? `Copy failed. Select the address above and copy it instead.` : ''}
        </p>
        <Link to={`/workspace/${org.id}/overview`} className="link-button">
          Go to my workspace
        </Link>
      </section>
    </div>
  )
}
