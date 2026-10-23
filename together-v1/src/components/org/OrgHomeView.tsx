import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLowData } from '../../lib/lowData.ts'
import { featuredCampaigns, homeCopy } from '../../lib/orgHome.ts'
import type { CampaignView, Organization } from '../../lib/types.ts'
import { CampaignCard } from '../CampaignCard.tsx'
import { OrgLogoMark } from './OrgChrome.tsx'

function MaybeLink({ to, className, preview, children }: { to: string; className: string; preview: boolean; children: ReactNode }) {
  if (preview) return <span className={className}>{children}</span>
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

/**
 * Branded homepage body. The live site and the settings preview both render this, so what an
 * organizer previews is exactly what supporters see.
 */
export function OrgHomeView({
  org,
  views,
  base,
  preview = false,
}: {
  org: Organization
  views: CampaignView[]
  base: string
  preview?: boolean
}) {
  const copy = homeCopy(org)
  const lowData = useLowData() && !preview
  const featured = featuredCampaigns(views)
  const showImpact = org.visibility.impactStories && org.content.impactStory.trim().length > 0
  const heroStyle =
    !lowData && copy.heroImage
      ? ({ '--oh-hero-image': `url(${JSON.stringify(copy.heroImage)})` } as CSSProperties)
      : undefined

  return (
    <div className="oh-home">
      <section className={lowData ? 'oh-hero oh-hero-low' : 'oh-hero'} style={heroStyle} aria-label="Welcome">
        <div className="oh-hero-scrim">
          <div className="oh-hero-copy">
            <div className="oh-hero-brand">
              <OrgLogoMark org={org} size={44} />
              <div>
                <strong>{org.name || 'Organization'}</strong>
                {org.tagline ? <em>{org.tagline}</em> : null}
              </div>
            </div>
            <h1>{copy.headline}</h1>
            <p className="oh-lead">{copy.description}</p>
          </div>
        </div>
      </section>

      <div className="oh-home-body container">
        <section className="oh-section" aria-labelledby={preview ? undefined : 'oh-campaigns-title'}>
          <div className="oh-section-head">
            <h2 id={preview ? undefined : 'oh-campaigns-title'}>Campaigns</h2>
            {featured.length > 0 ? (
              <MaybeLink to={`${base}/campaigns`} className="oh-more" preview={preview}>
                See all campaigns →
              </MaybeLink>
            ) : null}
          </div>
          {featured.length === 0 ? (
            <div className="oh-empty">
              <h3>No campaigns yet</h3>
              <p>When {org.name || 'this organization'} publishes a campaign, it will appear here.</p>
            </div>
          ) : (
            <div className="oh-cards">
              {featured.map((view) => (
                <CampaignCard key={view.campaign.id} view={view} />
              ))}
            </div>
          )}
        </section>

        {showImpact ? (
          <section className="oh-section oh-story">
            <article className="oh-impact">
              <span className="oh-eyebrow">Impact story</span>
              <h2>{org.content.impactTitle.trim() || `What ${copy.supporters} made possible`}</h2>
              <p>{org.content.impactStory}</p>
            </article>
          </section>
        ) : null}
      </div>
    </div>
  )
}
