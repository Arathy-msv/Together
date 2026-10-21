import { useCallback, useEffect, useId, useMemo, useRef, useState, type Ref } from 'react'
import { campaignCoverSrc } from '../../data/covers.ts'
import { canUseFeature } from '../../lib/features.ts'
import { AssetRenderError, SOCIAL_SIZES, renderPoster, renderSocialImage, type SocialSizeId } from '../../lib/canvasAssets.ts'
import { useLowData } from '../../lib/lowData.ts'
import { loadImageElement, qrPngDataUrl, qrSvgString, renderQrToCanvas, QrGenerationError } from '../../lib/qr.ts'
import { buildShareContent, dataUrlToBlob, downloadBlob, shareAssetFilename, type ShareContent, type ShareMode } from '../../lib/sharing.ts'
import type { Campaign, Organization, Referral } from '../../lib/types.ts'

/**
 * One reusable sharing kit for both the original campaign link and a supporter's personal
 * referral link. Every section — QR, poster, WhatsApp, email, social images — reads from the
 * same resolved `url` and the same `content`, so they can never drift apart.
 */
export function ShareKit({
  org,
  campaign,
  url,
  mode,
  referral,
  defaultOpen = true,
  title = 'Campaign sharing kit',
}: {
  org: Organization
  campaign: Campaign
  url: string
  mode: ShareMode
  referral?: Referral
  defaultOpen?: boolean
  title?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [tab, setTab] = useState<'link' | 'poster' | 'whatsapp' | 'email' | 'social'>('link')
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lowData = useLowData()
  const enabled = canUseFeature(org, 'shareKit')
  const content = useMemo(() => buildShareContent({ mode, org, campaign, url, referral }), [mode, org, campaign, url, referral])
  const coverSrc = referral?.coverImage || campaignCoverSrc(campaign)
  const personName = mode === 'referral' ? referral?.displayName : undefined
  const headingId = useId()

  const announce = useCallback((tone: 'success' | 'error', text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice({ tone, text })
    noticeTimer.current = setTimeout(() => setNotice(null), tone === 'success' ? 3500 : 6000)
  }, [])

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
  }, [])

  const copyText = useCallback(
    async (text: string, successText: string) => {
      try {
        await navigator.clipboard.writeText(text)
        announce('success', successText)
      } catch {
        announce('error', 'Copy failed. Select the text and copy it manually.')
      }
    },
    [announce],
  )

  // Images shared by the poster and social sections. Loaded once per campaign/referral.
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null)
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null)
  const [coverFailed, setCoverFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (org.logo) {
      loadImageElement(org.logo)
        .then((img) => !cancelled && setLogoImage(img))
        .catch(() => !cancelled && setLogoImage(null))
    } else {
      setLogoImage(null)
    }
    return () => {
      cancelled = true
    }
  }, [org.logo])

  useEffect(() => {
    if (!enabled || lowData) {
      setCoverImage(null)
      setCoverFailed(false)
      return
    }
    let cancelled = false
    setCoverFailed(false)
    loadImageElement(coverSrc)
      .then((img) => !cancelled && setCoverImage(img))
      .catch(() => {
        if (!cancelled) {
          setCoverImage(null)
          setCoverFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [coverSrc, enabled, lowData])

  if (!enabled) return null

  return (
    <section className="panel share-kit-v2" aria-labelledby={headingId}>
      <div className="share-kit-head">
        <div>
          <h2 id={headingId}>{title}</h2>
          <p className="muted small">
            Real, downloadable QR codes, a print-ready poster, channel drafts and social images — generated in this browser. Basic link copying still works
            without this kit.
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? 'Hide sharing kit' : 'Open sharing kit'}
        </button>
      </div>
      {open ? (
        <>
          <div className="section-tabs share-kit-tabs" role="tablist" aria-label="Sharing kit sections">
            {(
              [
                ['link', 'Link & QR'],
                ['poster', 'Poster'],
                ['whatsapp', 'WhatsApp'],
                ['email', 'Email'],
                ['social', 'Social images'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="share-kit-status" aria-live="polite">
            {notice ? (
              <div className={`notice ${notice.tone} compact`} role={notice.tone === 'error' ? 'alert' : 'status'}>
                {notice.text}
              </div>
            ) : null}
          </div>
          <div className="share-kit-panel">
            {tab === 'link' ? (
              <LinkAndQrSection content={content} onCopy={copyText} onAnnounce={announce} filenameBase={{ title: campaign.title, personName }} />
            ) : null}
            {tab === 'poster' ? (
              <PosterSection
                org={org}
                campaign={campaign}
                content={content}
                url={url}
                logoImage={logoImage}
                coverImage={coverImage}
                coverFailed={coverFailed}
                personName={personName}
                onCopy={copyText}
                onAnnounce={announce}
              />
            ) : null}
            {tab === 'whatsapp' ? <WhatsAppSection content={content} onCopy={copyText} onAnnounce={announce} /> : null}
            {tab === 'email' ? <EmailSection content={content} onCopy={copyText} onAnnounce={announce} /> : null}
            {tab === 'social' ? (
              <SocialSection
                org={org}
                campaign={campaign}
                content={content}
                url={url}
                logoImage={logoImage}
                coverImage={coverImage}
                coverFailed={coverFailed}
                personName={personName}
                onCopy={copyText}
                onAnnounce={announce}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}

/* ---------------------------------- Link & QR ---------------------------------- */

function LinkAndQrSection({
  content,
  onCopy,
  onAnnounce,
  filenameBase,
}: {
  content: ShareContent
  onCopy: (text: string, successText: string) => void
  onAnnounce: (tone: 'success' | 'error', text: string) => void
  filenameBase: { title: string; personName?: string }
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [downloads, setDownloads] = useState<{ png: Blob; svg: Blob } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    setError('')
    setDownloads(null)
    renderQrToCanvas(canvas, content.url, { size: 240, margin: 4 })
      .then(async () => {
        const dataUrl = await qrPngDataUrl(content.url, { size: 1024, margin: 4 })
        const svg = await qrSvgString(content.url, { size: 1024, margin: 4 })
        if (cancelled) return
        setDownloads({
          png: dataUrlToBlob(dataUrl),
          // octet-stream keeps the .svg filename in browsers that refuse to download image/svg+xml.
          svg: new Blob([svg], { type: 'application/octet-stream' }),
        })
      })
      .catch((problem) => {
        if (!cancelled) setError(problem instanceof QrGenerationError ? problem.message : 'The QR code could not be generated in this browser.')
      })
    return () => {
      cancelled = true
    }
  }, [content.url, attempt])

  function saveQr(kind: 'png' | 'svg') {
    if (!downloads) return
    downloadBlob(downloads[kind], shareAssetFilename(filenameBase.title, 'qr', kind, filenameBase.personName))
    onAnnounce('success', 'Download started.')
  }

  return (
    <div className="share-section share-link-qr">
      <div className="qr-preview-block">
        <div className="qr-preview" role="img" aria-label={error ? 'QR code failed to generate' : `QR code that opens ${content.url}`}>
          {error ? (
            <div className="qr-box qr-error">
              <span>QR code unavailable</span>
            </div>
          ) : (
            <canvas ref={canvasRef} width={240} height={240} />
          )}
        </div>
        <code className="share-url-text">{content.url}</code>
      </div>
      <div className="share-actions-col">
        {error ? (
          <div className="notice error compact" role="alert">
            {error}{' '}
            <button type="button" className="link-button" onClick={() => setAttempt((value) => value + 1)}>
              Try again
            </button>
          </div>
        ) : null}
        <div className="inline-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={Boolean(error) || !downloads} onClick={() => saveQr('png')}>
            Download PNG
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={Boolean(error) || !downloads} onClick={() => saveQr('svg')}>
            Download SVG
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void onCopy(content.url, 'Link copied.')}>
            Copy link
          </button>
        </div>
        <p className="muted small">
          This QR opens the demo link. Campaign data saved only in this browser will not automatically appear on another device.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------ Poster ------------------------------------ */

function PosterSection({
  org,
  campaign,
  content,
  url,
  logoImage,
  coverImage,
  coverFailed,
  personName,
  onCopy,
  onAnnounce,
}: {
  org: Organization
  campaign: Campaign
  content: ShareContent
  url: string
  logoImage: HTMLImageElement | null
  coverImage: HTMLImageElement | null
  coverFailed: boolean
  personName?: string
  onCopy: (text: string, successText: string) => void
  onAnnounce: (tone: 'success' | 'error', text: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const printRef = useRef<HTMLDivElement | null>(null)
  const [includeImage, setIncludeImage] = useState(true)
  const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [qrImgSrc, setQrImgSrc] = useState('')
  const [exportBlob, setExportBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    qrPngDataUrl(url, { size: 640, margin: 4 })
      .then((dataUrl) => !cancelled && setQrImgSrc(dataUrl))
      .catch(() => !cancelled && setError('The QR code for this poster could not be generated.'))
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !qrImgSrc) return
    let cancelled = false
    setStatus('rendering')
    setExportBlob(null)
    setError('')
    ;(async () => {
      const qr = await loadImageElement(qrImgSrc)
      if (cancelled) return
      try {
        await renderPoster(canvas, {
          org,
          campaign,
          content,
          qr,
          images: { logo: logoImage, cover: includeImage ? coverImage : null },
        })
        if (cancelled) return
        setExportBlob(dataUrlToBlob(canvas.toDataURL('image/png')))
        setStatus('ready')
      } catch (problem) {
        if (cancelled) return
        if (problem instanceof AssetRenderError && problem.imageRelated) {
          setIncludeImage(false)
          onAnnounce('error', 'The campaign image could not be exported. Showing an image-free poster instead.')
        } else {
          setStatus('error')
          setError(problem instanceof Error ? problem.message : 'The poster could not be rendered.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [org, campaign, content, qrImgSrc, logoImage, coverImage, includeImage, onAnnounce])

  function downloadPoster() {
    if (!exportBlob || status !== 'ready') return
    downloadBlob(exportBlob, shareAssetFilename(campaign.title, 'poster', 'png', personName))
    onAnnounce('success', 'Download started.')
  }

  function printPoster() {
    const sheet = printRef.current
    if (!sheet) return
    document.body.classList.add('printing-share-kit')
    const cleanup = () => document.body.classList.remove('printing-share-kit')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.setTimeout(cleanup, 15000)
    window.print()
  }

  return (
    <div className="share-section share-poster">
      <div className="poster-preview-col">
        <div className="poster-preview-frame">
          <canvas ref={canvasRef} className="poster-canvas" aria-label={`A4 poster preview for ${campaign.title}`} />
          {status === 'rendering' ? <span className="poster-loading">Rendering poster…</span> : null}
        </div>
        {coverFailed ? <p className="muted small">The campaign image couldn’t be loaded. The poster will use an image-free design.</p> : null}
        {campaign.coverImageId && !coverFailed ? (
          <label className="checkbox-row small">
            <input type="checkbox" checked={includeImage} onChange={(event) => setIncludeImage(event.target.checked)} />
            Include campaign image
          </label>
        ) : null}
      </div>
      <div className="share-actions-col">
        {error ? (
          <div className="notice error compact" role="alert">
            {error}
          </div>
        ) : null}
        <div className="inline-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={status !== 'ready' || !exportBlob} onClick={downloadPoster}>
            Download poster PNG
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={printPoster}>
            Print / Save as PDF
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void onCopy(`${campaign.title}\n${org.name}\n${url}`, 'Poster text copied.')}
          >
            Copy poster text
          </button>
        </div>
        <p className="muted small">A4 portrait, about 2480 × 3508 pixels. “Print / Save as PDF” opens your browser’s print dialog — choose “Save as PDF” there.</p>
      </div>
      <PosterPrintSheet ref={printRef} org={org} campaign={campaign} content={content} qrImgSrc={qrImgSrc} includeImage={includeImage} coverSrc={coverImage?.src} logoSrc={logoImage?.src} />
    </div>
  )
}

function PosterPrintSheet({
  ref,
  org,
  campaign,
  content,
  qrImgSrc,
  includeImage,
  coverSrc,
  logoSrc,
}: {
  ref: Ref<HTMLDivElement>
  org: Organization
  campaign: Campaign
  content: ShareContent
  qrImgSrc: string
  includeImage: boolean
  coverSrc?: string
  logoSrc?: string
}) {
  return (
    <div ref={ref} className="poster-print-sheet" aria-hidden="true">
      <div className="poster-print-bar" style={{ background: org.branding.primary }} />
      <div className="poster-print-body">
        <div className="poster-print-brand">
          {logoSrc ? <img src={logoSrc} alt="" /> : null}
          <strong>{org.name}</strong>
        </div>
        <h1>{campaign.title}</h1>
        <p>{content.purpose}</p>
        {includeImage && coverSrc ? <img className="poster-print-cover" src={coverSrc} alt="" /> : null}
        <p className="poster-print-goal" style={{ color: org.branding.primary }}>
          {content.goalLine}
        </p>
        {content.attribution ? (
          <div className="poster-print-attribution">
            <strong>{content.posterHeading}</strong>
            {content.attribution.intro ? <p>“{content.attribution.intro}”</p> : null}
          </div>
        ) : null}
        <div className="poster-print-qr">
          {qrImgSrc ? <img src={qrImgSrc} alt={`QR code that opens ${content.url}`} /> : null}
          <div>
            <strong>Scan to support</strong>
            <code>{content.url}</code>
          </div>
        </div>
        <p className="poster-print-footer">A fundraiser by {org.name}</p>
      </div>
    </div>
  )
}

/* ----------------------------------- WhatsApp ------------------------------------ */

function WhatsAppSection({
  content,
  onCopy,
  onAnnounce,
}: {
  content: ShareContent
  onCopy: (text: string, successText: string) => void
  onAnnounce: (tone: 'success' | 'error', text: string) => void
}) {
  const [message, setMessage] = useState(content.whatsapp)
  const id = useId()

  useEffect(() => setMessage(content.whatsapp), [content.whatsapp])

  function openWhatsApp() {
    const win = window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    if (!win) {
      void navigator.clipboard
        .writeText(message)
        .then(() => onAnnounce('error', 'WhatsApp didn’t open in this browser. The message is already copied — paste it where you’d like to send it.'))
        .catch(() => onAnnounce('error', 'WhatsApp didn’t open, and the message could not be copied. Select the text above and copy it manually.'))
    }
  }

  return (
    <div className="share-section share-message-section">
      <div className="field">
        <label className="field-label" htmlFor={id}>
          WhatsApp message
        </label>
        <textarea id={id} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
      <div className="inline-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => void onCopy(message, 'Message copied.')}>
          Copy message
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={openWhatsApp}>
          Open WhatsApp
        </button>
      </div>
      <p className="muted small">Opening WhatsApp needs your click — nothing is sent automatically, and no contact is chosen for you.</p>
    </div>
  )
}

/* ------------------------------------- Email ------------------------------------- */

function EmailSection({
  content,
  onCopy,
  onAnnounce,
}: {
  content: ShareContent
  onCopy: (text: string, successText: string) => void
  onAnnounce: (tone: 'success' | 'error', text: string) => void
}) {
  const [subject, setSubject] = useState(content.email.subject)
  const [body, setBody] = useState(content.email.body)
  const ids = { subject: useId(), body: useId() }

  useEffect(() => {
    setSubject(content.email.subject)
    setBody(content.email.body)
  }, [content.email.subject, content.email.body])

  function openEmail() {
    try {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    } catch {
      onAnnounce('error', 'Your email app did not open. Copy the subject and body instead.')
    }
  }

  return (
    <div className="share-section share-message-section">
      <div className="field">
        <label className="field-label" htmlFor={ids.subject}>
          Email subject
        </label>
        <input id={ids.subject} value={subject} onChange={(event) => setSubject(event.target.value)} />
        <div className="inline-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void onCopy(subject, 'Subject copied.')}>
            Copy subject
          </button>
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={ids.body}>
          Email body
        </label>
        <textarea id={ids.body} rows={8} value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="inline-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void onCopy(body, 'Email body copied.')}>
            Copy body
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openEmail}>
            Open email app
          </button>
        </div>
        {body.length > 1800 ? (
          <p className="muted small">This message is long — some email apps may truncate mailto links. Use Copy if “Open email app” drops text.</p>
        ) : null}
      </div>
    </div>
  )
}

/* -------------------------------- Social images --------------------------------- */

function SocialSection({
  org,
  campaign,
  content,
  url,
  logoImage,
  coverImage,
  coverFailed,
  personName,
  onCopy,
  onAnnounce,
}: {
  org: Organization
  campaign: Campaign
  content: ShareContent
  url: string
  logoImage: HTMLImageElement | null
  coverImage: HTMLImageElement | null
  coverFailed: boolean
  personName?: string
  onCopy: (text: string, successText: string) => void
  onAnnounce: (tone: 'success' | 'error', text: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState<SocialSizeId>('square')
  const [includeImage, setIncludeImage] = useState(true)
  const [includeQr, setIncludeQr] = useState(true)
  const [status, setStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [qrImgSrc, setQrImgSrc] = useState('')
  const [caption, setCaption] = useState(content.socialCaption)
  const [exportBlob, setExportBlob] = useState<Blob | null>(null)
  const captionId = useId()

  useEffect(() => setCaption(content.socialCaption), [content.socialCaption])

  useEffect(() => {
    let cancelled = false
    qrPngDataUrl(url, { size: 400, margin: 4 })
      .then((dataUrl) => !cancelled && setQrImgSrc(dataUrl))
      .catch(() => !cancelled && setError('The QR code for this image could not be generated.'))
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !qrImgSrc) return
    let cancelled = false
    setStatus('rendering')
    setExportBlob(null)
    setError('')
    ;(async () => {
      const qr = await loadImageElement(qrImgSrc)
      if (cancelled) return
      try {
        await renderSocialImage(canvas, {
          org,
          campaign,
          content,
          qr,
          images: { logo: logoImage, cover: includeImage ? coverImage : null },
          size,
          includeQr,
        })
        if (cancelled) return
        setExportBlob(dataUrlToBlob(canvas.toDataURL('image/png')))
        setStatus('ready')
      } catch (problem) {
        if (cancelled) return
        if (problem instanceof AssetRenderError && problem.imageRelated) {
          setIncludeImage(false)
          onAnnounce('error', 'The campaign image could not be exported. Showing an image-free design instead.')
        } else {
          setStatus('error')
          setError(problem instanceof Error ? problem.message : 'The image could not be rendered.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [org, campaign, content, qrImgSrc, logoImage, coverImage, includeImage, includeQr, size, onAnnounce])

  function download() {
    if (!exportBlob || status !== 'ready') return
    downloadBlob(exportBlob, shareAssetFilename(campaign.title, `social-${size}`, 'png', personName))
    onAnnounce('success', 'Download started.')
  }

  const dims = SOCIAL_SIZES[size]

  return (
    <div className="share-section share-social">
      <div className="social-size-picker" role="group" aria-label="Image size">
        {Object.values(SOCIAL_SIZES).map((option) => (
          <button key={option.id} type="button" className={size === option.id ? 'active' : ''} onClick={() => setSize(option.id)}>
            {option.label}
            <span className="muted small">
              {option.width} × {option.height}
            </span>
          </button>
        ))}
      </div>
      <div className="social-preview-col">
        <div className="social-preview-frame" style={{ aspectRatio: `${dims.width} / ${dims.height}` }}>
          <canvas ref={canvasRef} className="social-canvas" aria-label={`${SOCIAL_SIZES[size].label} social image preview for ${campaign.title}`} />
          {status === 'rendering' ? <span className="poster-loading">Rendering…</span> : null}
        </div>
        {coverFailed ? <p className="muted small">The campaign image couldn’t be loaded. Using an image-free design.</p> : null}
        <div className="social-options">
          {campaign.coverImageId && !coverFailed ? (
            <label className="checkbox-row small">
              <input type="checkbox" checked={includeImage} onChange={(event) => setIncludeImage(event.target.checked)} />
              Campaign image
            </label>
          ) : null}
          <label className="checkbox-row small">
            <input type="checkbox" checked={includeQr} onChange={(event) => setIncludeQr(event.target.checked)} />
            Include QR code
          </label>
        </div>
      </div>
      <div className="share-actions-col">
        {error ? (
          <div className="notice error compact" role="alert">
            {error}
          </div>
        ) : null}
        <button type="button" className="btn btn-primary btn-sm" disabled={status !== 'ready' || !exportBlob} onClick={download}>
          Download {SOCIAL_SIZES[size].label} PNG
        </button>
        <div className="field">
          <label className="field-label" htmlFor={captionId}>
            Caption
          </label>
          <textarea id={captionId} rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} />
          <div className="inline-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void onCopy(`${caption}\n\n${url}`, 'Caption copied.')}>
              Copy caption
            </button>
          </div>
        </div>
        <p className="muted small">Links inside downloaded images are not clickable. Add your campaign link when posting.</p>
      </div>
    </div>
  )
}
