import { useLowData } from '../lib/lowData.ts'
import { coverTemplate } from '../data/covers.ts'

interface CoverSource {
  coverImageId: string
  coverImageData?: string
  title?: string
}

export function CampaignCover({ campaign, className = '' }: { campaign: CoverSource; className?: string }) {
  const lowData = useLowData()
  const template = coverTemplate(campaign.coverImageId)
  const src = campaign.coverImageId === 'upload' && campaign.coverImageData ? campaign.coverImageData : template.src
  const alt = campaign.title ? `${campaign.title} cover` : template.alt
  if (lowData) {
    return (
      <span className={`campaign-cover low-data-cover ${className}`.trim()} role="img" aria-label={`${alt} (hidden in low-data mode)`}>
        <span aria-hidden="true">{initials(campaign.title || 'Together')}</span>
      </span>
    )
  }
  return <img className={`campaign-cover ${className}`.trim()} src={src} alt={alt} loading="lazy" />
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'T'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function OrgLogo({
  name,
  logoData,
  size = 40,
}: {
  name: string
  logoData?: string
  size?: number
}) {
  return (
    <span className="org-logo" style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}>
      {logoData ? <img src={logoData} alt={`${name} logo`} /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  )
}
