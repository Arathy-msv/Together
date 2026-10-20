import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/illustrations.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { DEFAULT_ORG_ID, orgBase, orgTypeLabel } from '../../lib/organizations.ts'
import { DEMO_PLANS } from '../../lib/plans.ts'
import { themeVars } from '../../lib/theme.ts'
import type { CSSProperties } from 'react'

const JOURNEY = [
  { title: 'Choose a plan', text: 'Pick a demo plan. No payment is collected.' },
  { title: 'Add organization details', text: 'Name, type, contact and a website address.' },
  { title: 'Customize your website', text: 'Logo, colours, fonts, homepage and about page.' },
  { title: 'Publish your demo site', text: 'Preview on desktop and mobile, then publish.' },
  { title: 'Create campaigns', text: 'Use the form or the campaign assistant.' },
]

const FEATURES = [
  { icon: 'home', title: 'Your own branded website', text: 'Each organization gets its own address, colours, typography, homepage and about page.' },
  { icon: 'game', title: 'Games that build a suggestion', text: 'Garden, memory match, puzzle and jacket games add to an amount supporters review before giving.' },
  { icon: 'users', title: 'Personal sharing pages', text: 'Supporters introduce your campaign in their own words. Credit is tracked; totals count once.' },
  { icon: 'chart', title: 'Updates and fund use', text: 'Milestones, updates and organizer-reported spending, kept separate from fundraising progress.' },
  { icon: 'spark', title: 'Campaign assistant', text: 'A conversational creator and readiness checks. AI preview · Simulated in this prototype.' },
  { icon: 'heart', title: 'Trust & documents', text: 'Clear labels for information provided, evidence attached and what is not verified.' },
]

/** Together product homepage. */
export function PlatformHomePage() {
  const organizations = useOrganizations()
  const store = useDemoStore()
  const examples = organizations.filter((org) => org.website.status === 'published' && org.id !== DEFAULT_ORG_ID)

  useEffect(() => {
    document.title = 'Together — Branded fundraising websites for communities'
  }, [])

  return (
    <div className="platform-home">
      <section className="container platform-hero">
        <div>
          <p className="oh-eyebrow">For schools, companies, clubs and nonprofits</p>
          <h1>Your own fundraising website, ready in minutes.</h1>
          <p className="oh-lead">
            Together gives each organization a branded website for its campaigns — with games, personal sharing pages and transparent updates built in.
          </p>
          <div className="oh-actions">
            <Link to="/plans" className="btn btn-primary btn-lg">
              Create your organization website
            </Link>
            <Link to="/workspace" className="btn btn-outline btn-lg">
              Open demo workspace
            </Link>
          </div>
          <p className="muted small">Prototype: plans are demos and nothing is billed. Websites you create are stored only in this browser.</p>
        </div>
        <div className="hero-stack" aria-hidden="true">
          {examples.slice(0, 3).map((org, index) => (
            <div key={org.id} className={`hero-site s${index}`} style={themeVars(org.branding) as CSSProperties}>
              <div className="hero-site-bar">
                <OrgLogoMark org={org} size={22} />
                <span>{org.name}</span>
              </div>
              <img src={org.content.heroImage} alt="" />
              <strong>{org.content.headline}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="container platform-section" aria-labelledby="journey-title">
        <h2 id="journey-title">How it works</h2>
        <ol className="journey">
          {JOURNEY.map((step, index) => (
            <li key={step.title}>
              <span className="journey-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <span className="muted small">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="container platform-section" aria-labelledby="features-title">
        <h2 id="features-title">Features</h2>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <span className="oh-step-icon" aria-hidden="true">
                <Icon name={feature.icon} size={22} />
              </span>
              <h3>{feature.title}</h3>
              <p className="muted">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="examples" className="container platform-section" aria-labelledby="examples-title">
        <h2 id="examples-title">Organization website examples</h2>
        <p className="muted">Each example is a separate website with its own address, branding and campaigns.</p>
        <div className="example-grid">
          {examples.map((org) => {
            const count = store.campaigns.filter((campaign) => campaign.organizationId === org.id && !campaign.isDraft).length
            return (
              <article key={org.id} className="example-card" style={themeVars(org.branding) as CSSProperties}>
                <img src={org.content.heroImage} alt="" />
                <div className="example-body">
                  <div className="example-brand">
                    <OrgLogoMark org={org} size={36} />
                    <div>
                      <strong>{org.name}</strong>
                      <span className="muted small">{orgTypeLabel(org.type)}</span>
                    </div>
                  </div>
                  <p className="small">{org.tagline}</p>
                  <code className="small">/o/{org.slug}</code>
                  <span className="muted small">
                    {count} campaign{count === 1 ? '' : 's'}
                  </span>
                  <Link to={orgBase(org.slug)} className="btn btn-primary btn-sm">
                    Visit {org.name}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="container platform-section" aria-labelledby="plans-title">
        <h2 id="plans-title">Demo plans</h2>
        <div className="plan-teasers">
          {DEMO_PLANS.map((plan) => (
            <div key={plan.id} className="plan-teaser">
              <strong>{plan.name}</strong>
              <span className="muted small">{plan.audience}</span>
            </div>
          ))}
        </div>
        <Link to="/plans" className="btn btn-primary">
          Compare demo plans
        </Link>
      </section>
    </div>
  )
}
