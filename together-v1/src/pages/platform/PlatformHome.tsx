import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/illustrations.tsx'
import { OrgLogoMark } from '../../components/org/OrgChrome.tsx'
import { useOrganizations } from '../../hooks/useOrganizations.ts'
import { useStartWebsite } from '../../hooks/useStartWebsite.ts'
import { DEFAULT_ORG_ID, orgBase, orgTypeLabel } from '../../lib/organizations.ts'
import { themeVars } from '../../lib/theme.ts'

const EXAMPLE_SLUG = 'maple-grove'

const STEPS = [
  { title: 'Add your organization', text: 'Your name, a short description and a contact email.' },
  { title: 'Make the website yours', text: 'Pick your colours, a photo and a headline. Preview it as you go.' },
  { title: 'Launch your first fundraiser', text: 'Describe your cause and set a goal. Supporters give directly or play a short game.' },
]

const AUDIENCES = [
  { icon: 'home', label: 'Schools', text: 'Library books, sports kits, school gardens.' },
  { icon: 'users', label: 'Companies', text: 'Employee giving and volunteer days.' },
  { icon: 'heart', label: 'Clubs', text: 'Equipment, events and member support.' },
  { icon: 'gift', label: 'Nonprofits', text: 'Programmes, appeals and seasonal drives.' },
]

/** Together product homepage: what it is, who it's for, and one clear next step. */
export function PlatformHomePage() {
  const organizations = useOrganizations()
  const startWebsite = useStartWebsite()
  const sampleOrgs = organizations.filter((org) => org.website.status === 'published' && org.id !== DEFAULT_ORG_ID)

  useEffect(() => {
    document.title = 'Together — Your organization’s own fundraising website'
  }, [])

  return (
    <div className="platform-home">
      <section className="container platform-hero">
        <div>
          <h1>Your organization’s own fundraising website.</h1>
          <p className="oh-lead">Create a branded website, launch campaigns, and let supporters give directly or take part through simple games.</p>
          <div className="oh-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => startWebsite()}>
              Create your website
            </button>
            <Link to={orgBase(EXAMPLE_SLUG)} className="btn btn-outline btn-lg">
              See an example
            </Link>
          </div>
          <p className="muted small">For schools, companies, clubs and nonprofits. Demo only — no payment is taken.</p>
        </div>
        <div className="hero-stack" aria-hidden="true">
          {sampleOrgs.slice(0, 3).map((org, index) => (
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

      <section id="how-it-works" className="container platform-section" aria-labelledby="steps-title">
        <h2 id="steps-title">How it works</h2>
        <ol className="journey three">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="journey-num">{index + 1}</span>
              <strong>{step.title}</strong>
              <span className="muted small">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="container platform-section" aria-labelledby="audience-title">
        <h2 id="audience-title">Who it’s for</h2>
        <div className="audience-grid">
          {AUDIENCES.map((item) => (
            <article key={item.label} className="feature-card">
              <span className="oh-step-icon" aria-hidden="true">
                <Icon name={item.icon} size={22} />
              </span>
              <h3>{item.label}</h3>
              <p className="muted small">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="organizations" className="container platform-section" aria-labelledby="organizations-title">
        <h2 id="organizations-title">Organizations</h2>
        <p className="muted">Each one is its own website, with its own address, look and campaigns.</p>
        <div className="example-grid">
          {sampleOrgs.map((org) => (
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
                <a href={orgBase(org.slug)} className="btn btn-primary btn-sm" target="_blank" rel="noopener noreferrer">
                  Visit website
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container platform-section closing-cta">
        <h2>Ready to start?</h2>
        <p className="muted">Setup takes four short steps. You can preview your website before publishing, and your progress is saved on this device.</p>
        <div className="oh-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => startWebsite()}>
            Create your website
          </button>
        </div>
      </section>
    </div>
  )
}
