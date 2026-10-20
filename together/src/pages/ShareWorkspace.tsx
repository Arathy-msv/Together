import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOrg } from '../components/org/OrgContext.tsx'
import { ReferralIntro, ReferrerAvatar } from '../components/referral/ReferralIntro.tsx'
import { campaignCoverSrc } from '../data/covers.ts'
import { useCampaignView, useDemoStore } from '../hooks/useDemoStore.ts'
import { useImagePicker } from '../hooks/useImagePicker.tsx'
import { campaignDetailsPath } from '../lib/campaigns.ts'
import { currencySymbol, formatMoney } from '../lib/format.ts'
import { IMAGE_GALLERY } from '../lib/organizations.ts'
import {
  canHaveSharingPages,
  createReferral,
  isMyReferral,
  referralPath,
  referralTotals,
  shareWorkspacePath,
  updateReferral,
  validateReferral,
  type ReferralErrors,
  type ReferralInput,
} from '../lib/referrals.ts'
import { StorageFullError } from '../lib/storage.ts'
import type { Referral } from '../lib/types.ts'
import { OrgNotFound } from './org/OrgNotFound.tsx'

/** Demo referrer workspace: create or edit a personal sharing page for one campaign. */
export function ShareWorkspacePage() {
  const { id = '', code } = useParams()
  const view = useCampaignView(id)
  const store = useDemoStore()
  const { base } = useOrg()
  const existing = code ? store.referrals.find((item) => item.code === code && item.campaignId === id) : undefined

  useEffect(() => {
    document.title = 'My sharing page — Together'
  }, [])

  if (!view || (code && !existing)) return <OrgNotFound kind="campaign" />
  const mine = store.referrals.filter((item) => item.campaignId === id && isMyReferral(item.id))

  if (existing && !isMyReferral(existing.id)) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>This sharing page was created on another device</h1>
          <p className="muted">
            In this demo, a sharing page can only be edited on the device that created it. That is a demo convenience, not a security control — a referral
            code is attribution, not an editing password.
          </p>
          <Link to={referralPath(base, id, existing.code)} className="btn btn-primary">
            Open the sharing page
          </Link>
        </div>
      </div>
    )
  }
  if (!existing && !canHaveSharingPages(view)) {
    return (
      <div className="container narrow page-pad">
        <div className="panel empty">
          <h1>Sharing pages aren’t available for this campaign</h1>
          <p className="muted">Personal sharing pages are available for open campaigns that are running or about to open.</p>
          <Link to={campaignDetailsPath(id, base)} className="btn btn-primary">
            Back to campaign
          </Link>
        </div>
      </div>
    )
  }
  return <ShareEditor key={existing?.id ?? 'new'} existing={existing} mine={mine} />
}

function ShareEditor({ existing, mine }: { existing?: Referral; mine: Referral[] }) {
  const { id = '' } = useParams()
  const view = useCampaignView(id)!
  const store = useDemoStore()
  const navigate = useNavigate()
  const { base } = useOrg()
  const campaign = view.campaign
  const [input, setInput] = useState<ReferralInput>(() => ({
    displayName: existing?.displayName ?? '',
    headline: existing?.headline ?? '',
    message: existing?.message ?? '',
    avatarData: existing?.avatarData,
    personalTarget: existing?.personalTarget,
    coverImage: existing?.coverImage,
  }))
  const [targetText, setTargetText] = useState(existing?.personalTarget ? String(existing.personalTarget) : '')
  const [errors, setErrors] = useState<ReferralErrors>({})
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const avatar = useImagePicker((data) => setInput((current) => ({ ...current, avatarData: data })), {
    maxWidth: 160,
    maxHeight: 160,
    type: 'image/jpeg',
    quality: 0.8,
    maxChars: 60_000,
  })
  const ids = { name: useId(), headline: useId(), message: useId(), target: useId() }

  const previewReferral: Referral = {
    id: existing?.id ?? 'preview',
    campaignId: campaign.id,
    organizationId: campaign.organizationId,
    code: existing?.code ?? 'preview',
    displayName: input.displayName.trim() || 'Your name',
    headline: input.headline.trim() || 'Your headline',
    message: input.message.trim() || 'Why you support this campaign will appear here.',
    avatarData: input.avatarData,
    personalTarget: input.personalTarget,
    coverImage: input.coverImage,
    createdAt: existing?.createdAt ?? '',
    updatedAt: existing?.updatedAt ?? '',
  }

  function save() {
    const nextErrors = validateReferral(input)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    try {
      if (existing) {
        updateReferral(existing.id, input)
        setNotice({ tone: 'success', text: 'Your sharing page is updated.' })
      } else {
        const created = createReferral(campaign.id, input)
        navigate(shareWorkspacePath(base, campaign.id, created.code), { replace: true })
      }
    } catch (problem) {
      setNotice({
        tone: 'error',
        text: problem instanceof StorageFullError ? 'Browser storage is full. Try a smaller photo or none.' : 'Your sharing page could not be saved in this browser.',
      })
    }
  }

  const shareUrl = existing ? `${window.location.origin}${referralPath(base, campaign.id, existing.code)}` : ''

  return (
    <div className="container page-pad share-workspace">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={campaignDetailsPath(campaign.id, base)}>{campaign.title}</Link>
        <span>/</span>
        <span>{existing ? 'Edit my sharing page' : 'Create my sharing page'}</span>
      </nav>
      <div className="page-head">
        <div>
          <p className="settings-kicker">
            <span className="demo-badge">Demo control</span> A referral code is attribution, not an editing password.
          </p>
          <h1>{existing ? 'Edit my sharing page' : 'Create my sharing page'}</h1>
          <p className="muted">Add a personal introduction to {campaign.title}. Everything else on the page comes from the original campaign.</p>
        </div>
      </div>
      {notice ? (
        <div className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </div>
      ) : null}
      {existing ? (
        <section className="panel share-link-card" aria-label="Share link">
          <div>
            <span className="eyebrow-label">Your sharing link</span>
            <code>{shareUrl}</code>
            <span className="muted small">
              {(() => {
                const totals = referralTotals(existing, store.contributions)
                return `${formatMoney(totals.amount, campaign.currency)} from ${totals.count} confirmed simulated contribution${totals.count === 1 ? '' : 's'} credited so far.`
              })()}
            </span>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl)
                  setCopied(true)
                } catch {
                  setCopied(false)
                  setNotice({ tone: 'error', text: 'Copy failed. Select the link and copy it manually.' })
                }
              }}
            >
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <Link to={referralPath(base, campaign.id, existing.code)} className="btn btn-outline btn-sm">
              Open my page
            </Link>
          </div>
        </section>
      ) : null}

      <div className="share-grid">
        <form
          className="panel form-panel"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <div className="field">
            <label className="field-label" htmlFor={ids.name}>
              Your display name
            </label>
            <input id={ids.name} value={input.displayName} maxLength={60} aria-invalid={Boolean(errors.displayName)} onChange={(event) => setInput({ ...input, displayName: event.target.value })} />
            {errors.displayName ? <p className="error-text">{errors.displayName}</p> : null}
          </div>
          <div className="field">
            <span className="field-label">
              Profile picture <span className="optional-tag">Optional</span>
            </span>
            <div className="logo-row">
              <ReferrerAvatar referral={previewReferral} size={48} />
              <button type="button" className="btn btn-outline btn-sm" onClick={avatar.open} disabled={avatar.busy}>
                {avatar.busy ? 'Processing…' : input.avatarData ? 'Replace photo' : 'Upload photo'}
              </button>
              {input.avatarData ? (
                <button type="button" className="link-button danger" onClick={() => setInput({ ...input, avatarData: undefined })}>
                  Remove
                </button>
              ) : (
                <span className="help">Initials are shown without a photo.</span>
              )}
            </div>
            {avatar.input}
            {avatar.error ? <p className="error-text">{avatar.error}</p> : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor={ids.headline}>
              Short personal headline
            </label>
            <input id={ids.headline} value={input.headline} maxLength={120} placeholder="Why this matters to me" aria-invalid={Boolean(errors.headline)} onChange={(event) => setInput({ ...input, headline: event.target.value })} />
            {errors.headline ? <p className="error-text">{errors.headline}</p> : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor={ids.message}>
              Why I support this campaign
            </label>
            <textarea id={ids.message} rows={5} value={input.message} maxLength={1200} aria-invalid={Boolean(errors.message)} onChange={(event) => setInput({ ...input, message: event.target.value })} />
            <p className="help">Speak for yourself. Please don’t add new facts about the campaign or name people it helps.</p>
            {errors.message ? <p className="error-text">{errors.message}</p> : null}
          </div>
          <div className="field">
            <label className="field-label" htmlFor={ids.target}>
              My sharing goal <span className="optional-tag">Optional</span>
            </label>
            <div className="input-prefix">
              <span>{currencySymbol(campaign.currency)}</span>
              <input
                id={ids.target}
                inputMode="numeric"
                value={targetText}
                aria-invalid={Boolean(errors.personalTarget)}
                onChange={(event) => {
                  const text = event.target.value.replace(/[^\d]/g, '')
                  setTargetText(text)
                  setInput({ ...input, personalTarget: text ? Number(text) : undefined })
                }}
              />
            </div>
            <p className="help">
              A personal target for gifts made through your page. The campaign goal stays {formatMoney(campaign.goalAmount, campaign.currency)} and cannot be changed.
            </p>
            {errors.personalTarget ? <p className="error-text">{errors.personalTarget}</p> : null}
          </div>
          <fieldset className="set-fieldset">
            <legend className="field-label">
              Cover image <span className="optional-tag">Optional</span>
            </legend>
            <div className="image-gallery">
              <button type="button" className={!input.coverImage ? 'gallery-choice selected' : 'gallery-choice'} aria-pressed={!input.coverImage} onClick={() => setInput({ ...input, coverImage: undefined })}>
                <img src={campaignCoverSrc(campaign)} alt="" />
                <span>Campaign cover</span>
              </button>
              {IMAGE_GALLERY.map((image) => (
                <button key={image.src} type="button" className={input.coverImage === image.src ? 'gallery-choice selected' : 'gallery-choice'} aria-pressed={input.coverImage === image.src} onClick={() => setInput({ ...input, coverImage: image.src })}>
                  <img src={image.src} alt="" />
                  <span>{image.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="locked-facts">
            <strong>Comes from the original campaign — you can’t change it</strong>
            <ul>
              <li>Purpose and story, organizer and beneficiaries</li>
              <li>Campaign goal ({formatMoney(campaign.goalAmount, campaign.currency)}) and currency ({campaign.currency})</li>
              <li>Where contributions go — always the original campaign</li>
              <li>Updates, fund use and verification indicators</li>
            </ul>
          </div>
          <div className="inline-actions">
            <button type="submit" className="btn btn-primary">
              {existing ? 'Save changes' : 'Create my sharing page'}
            </button>
            <Link to={campaignDetailsPath(campaign.id, base)} className="btn btn-outline">
              Cancel
            </Link>
          </div>
        </form>
        <aside className="share-preview" aria-label="Preview">
          <span className="eyebrow-label">Preview</span>
          <ReferralIntro referral={previewReferral} view={view} preview />
        </aside>
      </div>

      {mine.length > 0 ? (
        <section className="panel drafts-panel">
          <h2>My sharing pages for this campaign on this device</h2>
          <ul className="resume-list">
            {mine.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.displayName}</strong>
                  <span className="muted small">/{item.code}</span>
                </div>
                <div className="inline-actions">
                  <Link to={shareWorkspacePath(base, campaign.id, item.code)} className="btn btn-outline btn-sm">
                    Edit
                  </Link>
                  <Link to={referralPath(base, campaign.id, item.code)} className="btn btn-outline btn-sm">
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
