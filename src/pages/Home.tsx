import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CampaignCard } from '../components/CampaignCard.tsx'
import { Icon } from '../components/illustrations.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'

const FEATURED_IDS = ['cmp_library', 'cmp_garden', 'cmp_winter']

export function HomePage() {
  const views = useCampaignViews().filter((view) => !view.campaign.isDraft)
  const featured = [
    ...FEATURED_IDS.map((id) => views.find((view) => view.campaign.id === id)).filter((view) => view !== undefined),
    ...views.filter((view) => !FEATURED_IDS.includes(view.campaign.id)),
  ].slice(0, 3)

  useEffect(() => {
    document.title = 'Together — Good causes, shared experiences'
  }, [])

  return (
    <div className="container home">
      <section className="home-hero">
        <div>
          <h1>
            Good causes.
            <br />
            Shared experiences.
          </h1>
          <p className="lead">Bring your community together through simple, interactive fundraising.</p>
          <div className="actions">
            <Link to="/create?new=1" className="btn btn-primary btn-lg">
              Create a campaign
            </Link>
            <Link to="/explore" className="btn btn-outline btn-lg">
              Explore campaigns
            </Link>
          </div>
        </div>
        <img className="home-hero-image" src="/covers/hero-library.jpg" alt="A bright school library with bookshelves and reading cushions" />
      </section>

      <section className="home-section">
        <div className="section-title">
          <h2>Featured campaigns</h2>
          <Link to="/explore" className="link-accent">
            Explore all campaigns →
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="panel empty">
            <p>No campaigns yet. Create the first one.</p>
          </div>
        ) : (
          <div className="feature-campaigns">
            {featured.map((view) => (
              <CampaignCard key={view.campaign.id} view={view} compact />
            ))}
          </div>
        )}
      </section>

      <section id="how-it-works" className="value-row">
        <article>
          <span className="value-icon green">
            <Icon name="heart" size={26} />
          </span>
          <div>
            <h3>Direct giving</h3>
            <p>Support causes you care about in a simple, transparent way.</p>
          </div>
        </article>
        <article>
          <span className="value-icon coral">
            <Icon name="users" size={26} />
          </span>
          <div>
            <h3>Interactive experiences</h3>
            <p>Plant a garden, match cards or finish a puzzle — then choose to contribute.</p>
          </div>
        </article>
        <article>
          <span className="value-icon gold">
            <Icon name="gift" size={26} />
          </span>
          <div>
            <h3>
              Rewards <span className="soon-pill">Coming soon</span>
            </h3>
            <p>Unlock special thank-yous and experiences for your support.</p>
          </div>
        </article>
      </section>
    </div>
  )
}
