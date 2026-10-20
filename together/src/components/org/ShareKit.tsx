import { useMemo, useState } from 'react'
import { canUseFeature } from '../../lib/features.ts'
import type { Campaign, Organization } from '../../lib/types.ts'

/** QR placeholder, poster text and ready-to-copy messages — only when shareKit is on. */
export function ShareKit({
  org,
  campaign,
  shareUrl,
}: {
  org: Organization
  campaign: Campaign
  shareUrl: string
}) {
  const [copied, setCopied] = useState('')
  const messages = useMemo(
    () => [
      `Please support “${campaign.title}” with ${org.name}: ${shareUrl}`,
      `I’m helping ${org.name} raise funds for ${campaign.title}. Every simulated contribution helps: ${shareUrl}`,
      `Join me — ${campaign.title}. Give directly or play a short game: ${shareUrl}`,
    ],
    [campaign.title, org.name, shareUrl],
  )

  if (!canUseFeature(org, 'shareKit')) return null

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
    } catch {
      setCopied('failed')
    }
  }

  return (
    <section className="panel share-kit" aria-labelledby="share-kit-title">
      <h2 id="share-kit-title">Campaign sharing kit</h2>
      <p className="muted small">QR codes, a simple poster and ready-to-copy messages. Basic link copying still works without this kit.</p>
      <div className="inline-actions">
        <div className="qr-box" role="img" aria-label="Demo QR code for the campaign link">
          Demo QR
          <br />
          Scan not required — copy the link instead
        </div>
        <div className="share-kit-poster">
          <span className="eyebrow-label">{org.name}</span>
          <strong>{campaign.title}</strong>
          <span>Goal {campaign.goalAmount.toLocaleString('en-IN')} {campaign.currency}</span>
          <span className="muted small">{shareUrl}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void copy(`${campaign.title}\n${org.name}\n${shareUrl}`, 'poster')}>
            {copied === 'poster' ? 'Poster text copied.' : 'Copy poster text'}
          </button>
        </div>
      </div>
      <ul className="ws-list">
        {messages.map((message, index) => (
          <li key={message}>
            <div>
              <span className="muted small">Message {index + 1}</span>
              <p className="small">{message}</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void copy(message, `m${index}`)}>
              {copied === `m${index}` ? 'Copied.' : 'Copy message'}
            </button>
          </li>
        ))}
      </ul>
      <span className="sr-only" role="status">
        {copied === 'failed' ? 'Copy failed.' : copied ? 'Copied.' : ''}
      </span>
    </section>
  )
}
