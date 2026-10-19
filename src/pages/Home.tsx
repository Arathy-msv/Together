import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CampaignCard } from '../components/CampaignCard.tsx'
import { Icon, HeroScene } from '../components/illustrations.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'

const FEATURED_IDS = ['cmp_library', 'cmp_garden', 'cmp_winter']

export function HomePage() {
  const views = useCampaignViews().filter((view) => !view.campaign.isDraft)
  const featured = [
    ...FEATURED_IDS.map((id) => views.find((view) => view.campaign.id === id)).filter((view) => view !== undefined),
    ...views.filter((view) => !FEATURED_IDS.includes(view.campaign.id)),
  ].slice(0, 3)

  useEffect(() => {
    document.title = 'Together — Make giving a little more joyful'
  }, [])

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">People · Places · Brighter days</p>
          <h1>
            Make giving a little more <em>joyful.</em>
          </h1>
          <p className="lede">
            Create a cause. Invite your community. Give directly or play your part. Together is a
            demonstration of fundraising that feels like showing up, not just being asked.
          </p>
          <div className="hero-actions">
            <Link to="/create?new=1" className="btn btn-primary">
              <Icon name="spark" size={16} />
              Create a Campaign
            </Link>
            <Link to="/explore" className="btn btn-secondary">
              Explore Campaigns
              <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
        <HeroScene />
      </section>

      <section className="how-strip">
        <article>
          <span>1</span>
          <h2>Start a cause</h2>
          <p>Tell the story, set a goal, and choose how people can take part.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Share the link</h2>
          <p>Send a campaign page. Closed groups can use a simple demo code.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Give or play</h2>
          <p>Supporters donate directly or plant a little encouragement in the garden game.</p>
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Featured demo campaigns</h2>
          <p>Real ideas. Simulated results. All for demo purposes.</p>
        </div>
        <div className="card-grid">
          {featured.map((view) => (
            <CampaignCard key={view.campaign.id} view={view} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Ways to take part</h2>
        <div className="feature-grid">
          <article className="feature-card sage">
            <Icon name="heart" />
            <h3>Direct donations</h3>
            <p>Support causes you care about, directly and transparently. Amounts are confirmed as a simulation.</p>
          </article>
          <article className="feature-card sun">
            <Icon name="game" />
            <h3>Playful giving</h3>
            <p>Take part in a short planting moment, then choose whether to add a simulated contribution.</p>
          </article>
          <article className="feature-card coral coming">
            <div className="coming-row">
              <Icon name="gift" />
              <span className="coming-badge">Coming soon</span>
            </div>
            <h3>Voucher rewards</h3>
            <p>Thank-you rewards from local partners will live here. They are not available in this demo.</p>
          </article>
        </div>
      </section>
    </div>
  )
}
