import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/illustrations.tsx'
import { BrandPreview } from '../../components/org/BrandPreview.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { toView } from '../../lib/campaigns.ts'
import { CURRENCIES, currencySymbol, formatMoney, isCurrencyCode } from '../../lib/format.ts'
import { GAME_THUMBS, GAMES } from '../../lib/games.ts'
import {
  COMING_SOON_GAMES,
  effectiveParticipation,
  IMAGE_GALLERY,
  ORG_TYPES,
  orgBase,
  slugify,
  validateOrganization,
} from '../../lib/organizations.ts'
import { saveOrganization } from '../../lib/orgStorage.ts'
import { StorageFullError } from '../../lib/storage.ts'
import { BUTTON_STYLES, contrastChecks, DEFAULT_BRANDING, FONT_CHOICES, isHexColor } from '../../lib/theme.ts'
import type { GameType, OrgBranding, OrgContent, OrgDefaults, OrgType, OrgVisibility, Organization } from '../../lib/types.ts'

const SECTIONS = [
  { id: 'identity', label: 'Identity' },
  { id: 'colours', label: 'Colours & typography' },
  { id: 'homepage', label: 'Homepage content' },
  { id: 'games', label: 'Games & participation' },
  { id: 'footer', label: 'Footer & links' },
] as const

/** Survives the remount that follows a save, so the confirmation is still shown. */
const SAVED_FLAG = 'together.settingsSaved'

type Notice = { tone: 'success' | 'error'; text: string } | null

export function OrgSettingsPage() {
  const { org } = useOrg()
  return <SettingsEditor key={`${org.id}-${org.updatedAt}`} saved={org} />
}

function SettingsEditor({ saved }: { saved: Organization }) {
  const navigate = useNavigate()
  const organizations = useOrganizations()
  const store = useDemoStore()
  const [draft, setDraft] = useState<Organization>(saved)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [notice, setNotice] = useState<Notice>(() =>
    window.sessionStorage.getItem(SAVED_FLAG) === saved.id ? { tone: 'success', text: 'Settings saved. The live site now uses this branding.' } : null,
  )
  const [attempted, setAttempted] = useState(false)

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const errors = useMemo(() => validateOrganization(draft, organizations), [draft, organizations])
  const errorCount = Object.keys(errors).length
  const checks = useMemo(() => contrastChecks(draft.branding), [draft.branding])
  const usedGames = useMemo(
    () => new Set(store.campaigns.filter((campaign) => campaign.organizationId === saved.id && campaign.participation.game).map((campaign) => campaign.gameType)),
    [store, saved.id],
  )
  const previewViews = useMemo(
    () =>
      store.campaigns
        .filter((campaign) => campaign.organizationId === saved.id)
        .map((campaign) => toView({ ...campaign, participation: effectiveParticipation(campaign, draft) }, store.contributions)),
    [store, saved.id, draft],
  )

  useEffect(() => {
    document.title = `Brand settings — ${saved.name}`
  }, [saved.name])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function patch(next: Partial<Organization>) {
    setDraft((current) => ({ ...current, ...next }))
    setNotice(null)
  }
  const patchBranding = (next: Partial<OrgBranding>) => setDraft((current) => ({ ...current, branding: { ...current.branding, ...next } }))
  const patchContent = (next: Partial<OrgContent>) => setDraft((current) => ({ ...current, content: { ...current.content, ...next } }))
  const patchDefaults = (next: Partial<OrgDefaults>) => setDraft((current) => ({ ...current, defaults: { ...current.defaults, ...next } }))
  const patchVisibility = (next: Partial<OrgVisibility>) => setDraft((current) => ({ ...current, visibility: { ...current.visibility, ...next } }))

  const shownError = (key: string) => (attempted || key.startsWith('branding') || key === 'slug' ? errors[key] : undefined)

  function save() {
    setAttempted(true)
    if (errorCount > 0) {
      setNotice({ tone: 'error', text: `Fix ${errorCount === 1 ? 'the highlighted field' : `${errorCount} highlighted fields`} before saving.` })
      return
    }
    const clean: Organization = {
      ...draft,
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      content: {
        ...draft.content,
        contactEmail: draft.content.contactEmail.trim(),
        website: draft.content.website.trim(),
        socialLinks: draft.content.socialLinks.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
      },
    }
    try {
      saveOrganization(clean)
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof StorageFullError
            ? 'Browser storage is full, so nothing was saved. Use a gallery image or a smaller upload, then try again.'
            : 'Settings could not be saved in this browser.',
      })
      return
    }
    if (clean.slug !== saved.slug) navigate(`${orgBase(clean.slug)}/settings`, { replace: true })
    window.sessionStorage.setItem(SAVED_FLAG, clean.id)
  }

  useEffect(() => {
    window.sessionStorage.removeItem(SAVED_FLAG)
  }, [])

  return (
    <div className="settings-page">
      <div className="settings-head container-wide">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo control</span> Not secure tenant administration
          </p>
          <h1>Brand settings</h1>
          <p className="muted">Changes appear in the preview straight away and only go live when you save.</p>
        </div>
        <div className="settings-actions">
          <span className={dirty ? 'save-state dirty' : 'save-state'} role="status">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              patchBranding({ ...DEFAULT_BRANDING })
              setNotice({ tone: 'success', text: 'Together default branding applied to the preview. Save to keep it.' })
            }}
          >
            Restore default branding
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!dirty}
            onClick={() => {
              setDraft(saved)
              setAttempted(false)
              setNotice(null)
            }}
          >
            Discard changes
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
            Save changes
          </button>
        </div>
      </div>
      {notice ? (
        <div className="container-wide">
          <div className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
            <Icon name={notice.tone === 'error' ? 'info' : 'check'} size={18} />
            {notice.text}
          </div>
        </div>
      ) : null}

      <div className="settings-mobile-toggle container-wide" role="group" aria-label="Settings view">
        <button type="button" className={mobileView === 'edit' ? 'chip selected' : 'chip'} aria-pressed={mobileView === 'edit'} onClick={() => setMobileView('edit')}>
          Edit settings
        </button>
        <button
          type="button"
          className={mobileView === 'preview' ? 'chip selected' : 'chip'}
          aria-pressed={mobileView === 'preview'}
          onClick={() => setMobileView('preview')}
        >
          Show preview
        </button>
      </div>

      <div className={`settings-grid container-wide ${mobileView === 'preview' ? 'show-preview' : ''}`}>
        <div className="settings-controls">
          <nav className="settings-jump" aria-label="Settings sections">
            {SECTIONS.map((section) => (
              <a key={section.id} href={`#set-${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>

          <Section id="identity" title="Identity" text="How the organization is named and recognised.">
            <TextField label="Organization name" value={draft.name} maxLength={80} error={shownError('name')} onChange={(name) => patch({ name })} />
            <div className="two-col">
              <TextField
                label="URL slug"
                value={draft.slug}
                maxLength={40}
                prefix="/o/"
                error={shownError('slug')}
                help={draft.slug !== saved.slug ? 'Old links to this organization stop working after you save.' : undefined}
                onChange={(slug) => patch({ slug: slug.toLowerCase().replace(/\s+/g, '-') })}
                action={
                  <button type="button" className="link-button" onClick={() => patch({ slug: slugify(draft.name) })}>
                    Use name
                  </button>
                }
              />
              <SelectField
                label="Organization type"
                value={draft.type}
                options={ORG_TYPES.map((type) => ({ value: type.id, label: type.label }))}
                onChange={(type) => patch({ type: type as OrgType })}
              />
            </div>
            <TextField label="Tagline" value={draft.tagline} maxLength={120} error={shownError('tagline')} help="Optional. Shown beside the logo and above the headline." onChange={(tagline) => patch({ tagline })} />
            <TextArea label="About" value={draft.about} maxLength={600} help="Optional. A short paragraph shown on the homepage." onChange={(about) => patch({ about })} />
            <ImageField
              label="Logo"
              help="Square PNG, JPG or WebP up to 8 MB. Resized to 256 px. Without a logo, initials are shown."
              value={draft.logo}
              preview={<OrgLogoMark org={draft} size={56} />}
              options={{ maxWidth: 256, maxHeight: 256, type: 'image/png', maxChars: 400_000 }}
              onChange={(logo) => patch({ logo })}
            />
            <ImageField
              label="Favicon (optional)"
              help="Shown in the browser tab. Falls back to the logo."
              value={draft.favicon}
              preview={draft.favicon ? <img className="favicon-preview" src={draft.favicon} alt="" /> : <span className="muted small">Using logo</span>}
              options={{ maxWidth: 64, maxHeight: 64, type: 'image/png', maxChars: 60_000 }}
              onChange={(favicon) => patch({ favicon })}
            />
          </Section>

          <Section id="colours" title="Colours & typography" text="Text colours are picked automatically for readability.">
            <div className="colour-grid">
              <ColorField label="Primary" help="Buttons, links, header accents" value={draft.branding.primary} error={shownError('branding.primary')} onChange={(primary) => patchBranding({ primary })} />
              <ColorField label="Secondary" help="Soft panels and highlights" value={draft.branding.secondary} error={shownError('branding.secondary')} onChange={(secondary) => patchBranding({ secondary })} />
              <ColorField label="Accent" help="Badges and progress" value={draft.branding.accent} error={shownError('branding.accent')} onChange={(accent) => patchBranding({ accent })} />
              <ColorField label="Page background" help="Behind every page" value={draft.branding.background} error={shownError('branding.background')} onChange={(background) => patchBranding({ background })} />
            </div>
            <ul className="contrast-list" aria-label="Contrast checks">
              {checks.map((check) => (
                <li key={check.id} className={check.ok ? 'ok' : 'warn'}>
                  <span className="contrast-icon" aria-hidden="true">
                    {check.ok ? '✓' : '!'}
                  </span>
                  <div>
                    <strong>
                      {check.label} <em>{check.ratio.toFixed(1)}:1</em>
                    </strong>
                    <span>{check.message}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="two-col">
              <SelectField
                label="Heading font"
                value={draft.branding.headingFont}
                options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))}
                onChange={(headingFont) => patchBranding({ headingFont: headingFont as OrgBranding['headingFont'] })}
              />
              <SelectField
                label="Body font"
                value={draft.branding.bodyFont}
                options={FONT_CHOICES.map((font) => ({ value: font.id, label: font.label }))}
                onChange={(bodyFont) => patchBranding({ bodyFont: bodyFont as OrgBranding['bodyFont'] })}
              />
            </div>
            <fieldset className="set-fieldset">
              <legend className="field-label">Button style</legend>
              <div className="segmented">
                {BUTTON_STYLES.map((style) => (
                  <label key={style.id} className={draft.branding.buttonStyle === style.id ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="button-style"
                      value={style.id}
                      checked={draft.branding.buttonStyle === style.id}
                      onChange={() => patchBranding({ buttonStyle: style.id })}
                    />
                    <span className={`style-sample ${style.id}`} aria-hidden="true" />
                    {style.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section id="homepage" title="Homepage content" text="Empty fields fall back to sensible defaults.">
            <TextField label="Headline" value={draft.content.headline} maxLength={120} error={shownError('content.headline')} onChange={(headline) => patchContent({ headline })} />
            <TextArea label="Description" value={draft.content.description} maxLength={400} onChange={(description) => patchContent({ description })} />
            <TextField
              label="Primary button label"
              value={draft.content.ctaLabel}
              maxLength={40}
              placeholder="Explore campaigns"
              error={shownError('content.ctaLabel')}
              onChange={(ctaLabel) => patchContent({ ctaLabel })}
            />
            <ImageField
              label="Hero image"
              help="JPG, PNG or WebP up to 8 MB. Resized and compressed for this demo."
              value={draft.content.heroImage}
              preview={<img className="hero-thumb" src={draft.content.heroImage || '/covers/hero-library.jpg'} alt="" />}
              options={{ maxWidth: 1400, maxHeight: 1000, type: 'image/jpeg', quality: 0.78, maxChars: 700_000 }}
              onChange={(heroImage) => patchContent({ heroImage })}
              gallery
              removable={false}
            />
            <TextField label="Supporter word" value={draft.content.supporterNoun} maxLength={30} help="How you refer to people who give, e.g. colleagues, families, supporters." onChange={(supporterNoun) => patchContent({ supporterNoun })} />
            <TextField label="Impact story title" value={draft.content.impactTitle} maxLength={100} onChange={(impactTitle) => patchContent({ impactTitle })} />
            <TextArea label="Impact story" value={draft.content.impactStory} maxLength={600} help="Leave empty to hide the impact story section." onChange={(impactStory) => patchContent({ impactStory })} />
          </Section>

          <Section id="games" title="Games & participation" text="What supporters can do, and the defaults for new campaigns.">
            <div className="toggle-list">
              <Toggle label="Show games" text="Supporters can play games on campaigns that use them." checked={draft.visibility.games} onChange={(games) => patchVisibility({ games })} />
              <Toggle label="Show direct contributions" text="Supporters can give an amount without playing." checked={draft.visibility.direct} onChange={(direct) => patchVisibility({ direct })} error={shownError('visibility.direct')} />
              <Toggle label="Show impact stories" text="Adds the impact story section to the homepage." checked={draft.visibility.impactStories} onChange={(impactStories) => patchVisibility({ impactStories })} />
              <Toggle label="Show campaign creation assistant" text="Organizers can create campaigns through guided questions." checked={draft.visibility.assistant} onChange={(assistant) => patchVisibility({ assistant })} />
            </div>

            <fieldset className="set-fieldset" disabled={!draft.visibility.games}>
              <legend className="field-label">Available games</legend>
              <p className="help">
                Turning a game off stops new campaigns from choosing it. Campaigns that already use it keep working for supporters.
              </p>
              <div className="set-games">
                {GAMES.map((game) => {
                  const on = draft.defaults.games.includes(game.id)
                  return (
                    <label key={game.id} className={on ? 'set-game on' : 'set-game'}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          patchDefaults({
                            games: on ? draft.defaults.games.filter((item) => item !== game.id) : [...draft.defaults.games, game.id as GameType],
                          })
                        }
                      />
                      <img src={GAME_THUMBS[game.id]} alt="" />
                      <span>
                        <strong>{game.name}</strong>
                        {!on && usedGames.has(game.id) ? <em>Still used by existing campaigns</em> : <em>{game.blurb}</em>}
                      </span>
                    </label>
                  )
                })}
                {COMING_SOON_GAMES.map((game) => (
                  <div key={game.id} className="set-game soon" aria-disabled="true">
                    <span className="soon-art" aria-hidden="true">
                      <Icon name="spark" size={20} />
                    </span>
                    <span>
                      <strong>{game.name}</strong>
                      <em>Coming soon</em>
                    </span>
                  </div>
                ))}
              </div>
              {shownError('defaults.games') ? <p className="error-text">{shownError('defaults.games')}</p> : null}
            </fieldset>
            {!draft.visibility.games ? (
              <p className="help">Games are hidden. Game campaigns switch to direct giving where it is available.</p>
            ) : null}

            <h3 className="set-subhead">New campaign defaults</h3>
            <div className="two-col">
              <SelectField
                label="Default currency"
                value={draft.defaults.currency}
                options={CURRENCIES.map((currency) => ({ value: currency.code, label: currency.label }))}
                help="Used for new campaigns only. Existing campaigns keep their own currency."
                onChange={(currency) => isCurrencyCode(currency) && patchDefaults({ currency })}
              />
              <TextField
                label="Default duration (days)"
                value={String(draft.defaults.durationDays)}
                inputMode="numeric"
                maxLength={3}
                error={shownError('defaults.durationDays')}
                onChange={(value) => patchDefaults({ durationDays: Number(value.replace(/[^\d]/g, '')) || 0 })}
              />
            </div>
            <AmountsField
              currency={draft.defaults.currency}
              amounts={draft.defaults.suggestedAmounts}
              error={shownError('defaults.suggestedAmounts')}
              onChange={(suggestedAmounts) => patchDefaults({ suggestedAmounts })}
            />
            <fieldset className="set-fieldset">
              <legend className="field-label">Default campaign visibility</legend>
              <div className="segmented">
                {(['open', 'closed'] as const).map((value) => (
                  <label key={value} className={draft.defaults.visibility === value ? 'selected' : ''}>
                    <input type="radio" name="default-visibility" checked={draft.defaults.visibility === value} onChange={() => patchDefaults({ visibility: value })} />
                    {value === 'open' ? 'Open to everyone' : 'Closed group'}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section id="footer" title="Footer & links" text="Contact details and links shown at the bottom of every page.">
            <TextField label="Contact email" type="email" value={draft.content.contactEmail} maxLength={120} error={shownError('content.contactEmail')} onChange={(contactEmail) => patchContent({ contactEmail })} />
            <TextArea label="Footer text" value={draft.content.footerText} maxLength={240} onChange={(footerText) => patchContent({ footerText })} />
            <TextField label="Website" type="url" placeholder="https://" value={draft.content.website} maxLength={300} error={shownError('content.website')} onChange={(website) => patchContent({ website })} />
            <div className="field">
              <span className="field-label">Social links</span>
              {draft.content.socialLinks.map((link, index) => (
                <div key={index} className="social-row">
                  <input
                    aria-label={`Link ${index + 1} label`}
                    value={link.label}
                    maxLength={40}
                    placeholder="Instagram"
                    onChange={(event) =>
                      patchContent({ socialLinks: draft.content.socialLinks.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)) })
                    }
                  />
                  <input
                    aria-label={`Link ${index + 1} address`}
                    type="url"
                    value={link.url}
                    maxLength={300}
                    placeholder="https://"
                    aria-invalid={Boolean(shownError(`content.socialLinks.${index}`))}
                    onChange={(event) =>
                      patchContent({ socialLinks: draft.content.socialLinks.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)) })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm icon-only"
                    aria-label={`Remove link ${index + 1}`}
                    onClick={() => patchContent({ socialLinks: draft.content.socialLinks.filter((_, i) => i !== index) })}
                  >
                    ×
                  </button>
                  {shownError(`content.socialLinks.${index}`) ? <p className="error-text">{shownError(`content.socialLinks.${index}`)}</p> : null}
                </div>
              ))}
              {draft.content.socialLinks.length < 4 ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => patchContent({ socialLinks: [...draft.content.socialLinks, { label: '', url: '' }] })}
                >
                  + Add link
                </button>
              ) : null}
            </div>
            <Toggle label="Show “Powered by Together”" text="A small credit in the footer." checked={draft.visibility.poweredBy} onChange={(poweredBy) => patchVisibility({ poweredBy })} />
          </Section>
        </div>

        <aside className="settings-preview" aria-label="Live preview">
          <div className="preview-toolbar">
            <span>
              <strong>Live preview</strong>
              <em>{dirty ? 'Showing unsaved changes' : 'Matches the live site'}</em>
            </span>
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
            <BrandPreview org={draft} views={previewViews} device={device} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <section className="set-card" id={`set-${id}`} aria-labelledby={`set-${id}-title`}>
      <header>
        <h2 id={`set-${id}-title`}>{title}</h2>
        <p className="muted small">{text}</p>
      </header>
      {children}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  help,
  maxLength,
  placeholder,
  prefix,
  type = 'text',
  inputMode,
  action,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  help?: string
  maxLength?: number
  placeholder?: string
  prefix?: string
  type?: string
  inputMode?: 'numeric' | 'text'
  action?: ReactNode
}) {
  const id = useId()
  const describedBy = [error ? `${id}-error` : '', help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined
  const input = (
    <input
      id={id}
      type={type}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      inputMode={inputMode}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
    />
  )
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      {prefix ? (
        <div className="input-prefix">
          <span>{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function TextArea({ label, value, onChange, help, maxLength }: { label: string; value: string; onChange: (value: string) => void; help?: string; maxLength: number }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} rows={3} value={value} maxLength={maxLength} aria-describedby={help ? `${id}-help` : undefined} onChange={(event) => onChange(event.target.value)} />
      <div className="field-foot">
        <span className="help" id={`${id}-help`}>
          {help}
        </span>
        <span className="help">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  help?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} aria-describedby={help ? `${id}-help` : undefined} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
    </div>
  )
}

function ColorField({ label, help, value, error, onChange }: { label: string; help: string; value: string; error?: string; onChange: (value: string) => void }) {
  const id = useId()
  const valid = isHexColor(value)
  return (
    <div className={error ? 'colour-field invalid' : 'colour-field'}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="colour-row">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid && value.length === 7 ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          value={value}
          maxLength={7}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
          onChange={(event) => onChange(event.target.value.trim())}
        />
      </div>
      <span className="help" id={`${id}-help`}>
        {help}
      </span>
      {error ? (
        <span className="error-text" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

function Toggle({ label, text, checked, onChange, error }: { label: string; text: string; checked: boolean; onChange: (value: boolean) => void; error?: string }) {
  const id = useId()
  return (
    <div className="toggle-row">
      <button type="button" id={id} role="switch" aria-checked={checked} className={checked ? 'switch on' : 'switch'} onClick={() => onChange(!checked)}>
        <span />
        <span className="sr-only">{label}</span>
      </button>
      <label htmlFor={id}>
        <strong>{label}</strong>
        <em>{text}</em>
        {error ? <span className="error-text">{error}</span> : null}
      </label>
    </div>
  )
}

function AmountsField({
  currency,
  amounts,
  error,
  onChange,
}: {
  currency: OrgDefaults['currency']
  amounts: number[]
  error?: string
  onChange: (amounts: number[]) => void
}) {
  const [value, setValue] = useState('')
  const [local, setLocal] = useState('')
  function add() {
    const amount = Number(value)
    if (!/^\d+$/.test(value) || amount <= 0) return setLocal('Enter a whole amount greater than zero.')
    if (amounts.includes(amount)) return setLocal('That amount is already listed.')
    if (amounts.length >= 5) return setLocal('Use up to 5 suggested amounts.')
    onChange([...amounts, amount].sort((a, b) => a - b))
    setValue('')
    setLocal('')
  }
  return (
    <div className="field">
      <span className="field-label">Suggested contribution amounts</span>
      <div className="amount-chips">
        {amounts.map((amount) => (
          <span key={amount} className="amount-chip-pro">
            {formatMoney(amount, currency)}
            <button type="button" aria-label={`Remove ${formatMoney(amount, currency)}`} onClick={() => onChange(amounts.filter((item) => item !== amount))}>
              ×
            </button>
          </span>
        ))}
        <span className="amount-add">
          <input
            inputMode="numeric"
            value={value}
            placeholder={`${currencySymbol(currency)} Add`}
            aria-label="New suggested amount"
            onChange={(event) => setValue(event.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
          />
          <button type="button" onClick={add}>
            Add
          </button>
        </span>
      </div>
      {local || error ? <p className="error-text">{local || error}</p> : null}
    </div>
  )
}

function ImageField({
  label,
  help,
  value,
  preview,
  options,
  onChange,
  gallery = false,
  removable = true,
}: {
  label: string
  help: string
  value: string
  preview: ReactNode
  options: { maxWidth: number; maxHeight: number; type: 'image/jpeg' | 'image/png'; quality?: number; maxChars?: number }
  onChange: (value: string) => void
  gallery?: boolean
  removable?: boolean
}) {
  const picker = useImagePicker(onChange, options)
  return (
    <div className="field image-field">
      <span className="field-label">{label}</span>
      <div className="image-row">
        {preview}
        <div className="inline-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={picker.open} disabled={picker.busy}>
            {picker.busy ? 'Processing…' : value.startsWith('data:') ? 'Replace upload' : 'Upload image'}
          </button>
          {removable && value ? (
            <button type="button" className="link-button danger" onClick={() => onChange('')}>
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {picker.input}
      <p className="help">{help}</p>
      {picker.error ? (
        <p className="error-text" role="alert">
          {picker.error}
        </p>
      ) : null}
      {gallery ? (
        <div className="image-gallery" role="group" aria-label={`${label} gallery`}>
          {IMAGE_GALLERY.map((image) => (
            <button
              key={image.src}
              type="button"
              className={value === image.src ? 'gallery-choice selected' : 'gallery-choice'}
              aria-pressed={value === image.src}
              onClick={() => onChange(image.src)}
            >
              <img src={image.src} alt="" />
              <span>{image.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
