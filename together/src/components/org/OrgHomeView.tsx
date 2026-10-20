import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLowData } from '../../lib/lowData.ts'
import { featuredCampaigns, homeCopy } from '../../lib/orgHome.ts'
import type { CampaignView, Organization } from '../../lib/types.ts'
import { CampaignCard } from '../CampaignCard.tsx'
import { Icon } from '../illustrations.tsx'

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
  const showAbout = org.about.trim().length > 0

  const steps = [
    { icon: 'search', title: 'Choose a campaign', text: `Find a cause that matters to ${copy.supporters} at ${org.name || 'our organization'}.` },
    org.visibility.games && org.visibility.direct
      ? { icon: 'game', title: 'Give or play', text: 'Give directly, or play a short game where each action adds to a suggestion you can edit.' }
      : org.visibility.games
        ? { icon: 'game', title: 'Play along', text: 'Each game action adds to a suggested contribution. Playing never collects money.' }
        : { icon: 'heart', title: 'Choose an amount', text: 'Pick a suggested amount or enter your own.' },
    { icon: 'check', title: 'Confirm', text: 'Review your amount, then confirm. Only confirmed gifts move the campaign forward.' },
  ]

  return (
    <div className="oh-home">
      <section className={lowData ? 'oh-hero oh-hero-text' : 'oh-hero'}>
        <div className="oh-hero-copy">
          {org.tagline ? <p className="oh-eyebrow">{org.tagline}</p> : null}
          <h1>{copy.headline}</h1>
          <p className="oh-lead">{copy.description}</p>
          <div className="oh-actions">
            <MaybeLink to={`${base}/campaigns`} className="btn btn-primary btn-lg" preview={preview}>
              {copy.cta}
            </MaybeLink>
            <MaybeLink to={`${base}/about`} className="btn btn-outline btn-lg" preview={preview}>
              About {org.name || 'us'}
            </MaybeLink>
          </div>
        </div>
        {lowData ? null : (
          <div className="oh-hero-media">
            <img src={copy.heroImage} alt="" />
          </div>
        )}
      </section>

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

      <section className="oh-section oh-how" aria-label="How it works">
        <h2>How it works</h2>
        <ol className="oh-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="oh-step-icon" aria-hidden="true">
                <Icon name={step.icon} size={22} />
              </span>
              <div>
                <span className="oh-step-num">Step {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {showImpact || showAbout ? (
        <section className={showImpact && showAbout ? 'oh-section oh-story two' : 'oh-section oh-story'}>
          {showImpact ? (
            <article className="oh-impact">
              <span className="oh-eyebrow">Impact story</span>
              <h2>{org.content.impactTitle.trim() || `What ${copy.supporters} made possible`}</h2>
              <p>{org.content.impactStory}</p>
            </article>
          ) : null}
          {showAbout ? (
            <article className="oh-about">
              <span className="oh-eyebrow">About {org.name}</span>
              <p>{org.about}</p>
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
