import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useCampaignViews } from '../../hooks/useDemoStore.ts'
import { orgTypeLabel } from '../../lib/organizations.ts'

/** /o/:slug/about — the organization's own about and contact page. */
export function OrgAboutPage() {
  const { org, base } = useOrg()
  const live = useCampaignViews().filter((view) => !view.campaign.isDraft && view.status === 'active').length

  useEffect(() => {
    document.title = `About — ${org.name}`
  }, [org.name])

  return (
    <div className="container narrow page-pad org-about">
      <header className="about-head">
        <OrgLogoMark org={org} size={72} />
        <div>
          <span className="oh-eyebrow">{orgTypeLabel(org.type)}</span>
          <h1>About {org.name}</h1>
          {org.tagline ? <p className="oh-lead">{org.tagline}</p> : null}
        </div>
      </header>
      <section className="panel about-card">
        <h2>Who we are</h2>
        <p>{org.about.trim() || `${org.name} raises funds for its community with Together.`}</p>
        {org.visibility.impactStories && org.content.impactStory.trim() ? (
          <>
            <h2>{org.content.impactTitle.trim() || 'Our impact'}</h2>
            <p>{org.content.impactStory}</p>
            <p className="muted small">Impact described by the organization.</p>
          </>
        ) : null}
      </section>
      <section className="panel about-card">
        <h2>Contact</h2>
        <dl className="detail-list">
          {org.content.contactEmail ? (
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${org.content.contactEmail}`}>{org.content.contactEmail}</a>
              </dd>
            </div>
          ) : null}
          {org.content.location ? (
            <div>
              <dt>Location</dt>
              <dd>{org.content.location}</dd>
            </div>
          ) : null}
          {org.content.website ? (
            <div>
              <dt>Website</dt>
              <dd>
                <a href={org.content.website} target="_blank" rel="noopener noreferrer">
                  {org.content.website}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          ) : null}
          {!org.content.contactEmail && !org.content.location && !org.content.website ? (
            <div>
              <dt>Contact</dt>
              <dd>Not provided yet</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <div className="inline-actions">
        <Link to={`${base}/campaigns`} className="btn btn-primary">
          {live > 0 ? `See ${live} active campaign${live === 1 ? '' : 's'}` : 'See our campaigns'}
        </Link>
      </div>
    </div>
  )
}
