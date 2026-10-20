import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/illustrations.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { GAME_THUMBS, GAMES } from '../lib/games.ts'
import { selectableGames } from '../lib/organizations.ts'

const SUPPORTER_STEPS = [
  { title: 'Open the campaign', text: 'Discover the cause and the people behind it.' },
  { title: 'Give directly or play first', text: 'Play the campaign’s game, or go straight to a contribution.' },
  { title: 'Choose your amount', text: 'Review the amount before confirming.' },
  { title: 'See your thank-you', text: 'Successful demo contributions update campaign progress.' },
]

const FAQ = [
  {
    q: 'Do I have to play before contributing?',
    a: 'No. You can donate directly or enjoy the game first. Playing is optional.',
  },
  {
    q: 'Does playing charge me?',
    a: 'No. Each completed action adds to a suggested contribution that you can edit or cancel. The campaign total changes only when you confirm a simulated contribution.',
  },
  {
    q: 'Can a campaign be private?',
    a: 'Yes. A private group asks for a demo access code and each player’s name. Names stay on the leadership board. When someone contributes through your referral, you earn points.',
  },
  {
    q: 'Are vouchers available?',
    a: 'Not yet. Voucher rewards are planned and shown as coming soon.',
    soon: true,
  },
]

export function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState(0)
  const { org, base } = useOrg()
  const allowed = selectableGames(org)
  const games = GAMES.filter((game) => allowed.includes(game.id))

  useEffect(() => {
    document.title = `How it works — ${org.name}`
  }, [org.name])

  return (
    <div className="how2">
      <section className="container how2-hero">
        <div>
          <p className="how2-eyebrow">Simple to start. Joyful to join.</p>
          <h1>Good causes. Simple steps.</h1>
          <p className="how2-lead">
            Create a campaign, invite your community, and give people a meaningful way to take part.
          </p>
          <div className="how2-actions">
            <Link to={`${base}/create?new=1`} className="btn btn-primary btn-lg">
              Create a campaign <Icon name="arrow" size={16} />
            </Link>
            <Link to={`${base}/campaigns`} className="btn btn-outline btn-lg">
              Explore campaigns
            </Link>
          </div>
        </div>
        <div className="how2-collage" aria-hidden="true">
          <article className="collage-card c1">
            <img src="/covers/cover-garden.jpg" alt="" />
            <span className="collage-tag">Demo campaign</span>
            <div>
              <strong>A brighter, greener tomorrow</strong>
              <p>Helping our community’s kids grow greener spaces.</p>
              <span className="mini-bar"><i style={{ width: '62%' }} /></span>
            </div>
          </article>
          <article className="collage-card c2">
            <div className="c2-title">
              <strong>Grow together</strong>
              <p>Plant seeds of kindness.</p>
            </div>
            <img src={GAME_THUMBS.garden} alt="" />
          </article>
          <div className="collage-badge">
            <span>
              <Icon name="check" size={18} />
            </span>
            Demo contribution confirmed
          </div>
        </div>
      </section>

      <section className="container how2-section">
        <h2>For organisers</h2>
        <p className="muted">From your idea to one campaign link.</p>
        <div className="org-cards">
          <article className="org-card">
            <header>
              <b>01</b>
              <div>
                <h3>Tell your story</h3>
                <p>Add your cause, cover image and fundraising goal.</p>
              </div>
            </header>
            <div className="mock mock-story">
              <div className="mock-fields">
                <span className="mock-label">Campaign title</span>
                <span className="mock-input">A brighter greener tomorrow</span>
                <span className="mock-label">Your story</span>
                <span className="mock-line" />
                <span className="mock-line short" />
              </div>
              <img src="/covers/cover-garden.jpg" alt="" />
            </div>
          </article>
          <article className="org-card">
            <header>
              <b>02</b>
              <div>
                <h3>Choose how people join</h3>
                <p>Enable direct giving and choose a playful experience.</p>
              </div>
            </header>
            <div className="mock mock-join">
              <div className="mock-games">
                <span className="mock-game selected">
                  <img src={GAME_THUMBS.garden} alt="" /> Garden game
                </span>
                <span className="mock-game">
                  <img src={GAME_THUMBS.puzzle} alt="" /> Puzzle game
                </span>
              </div>
              <div>
                <span className="mock-label">Suggested amounts</span>
                <div className="mock-amounts">
                  <span>₹100</span>
                  <span className="on">₹250</span>
                  <span>₹500</span>
                </div>
                <span className="mock-toggle">
                  Enable a game <i />
                </span>
              </div>
            </div>
          </article>
          <article className="org-card">
            <header>
              <b>03</b>
              <div>
                <h3>Share and follow progress</h3>
                <p>Copy your demo link and see confirmed simulated contributions.</p>
              </div>
            </header>
            <div className="mock mock-share">
              <span className="mock-label">Your campaign link (demo)</span>
              <span className="mock-input link">
                together.local/campaigns/green-tomorrow <Icon name="copy" size={14} />
              </span>
              <span className="mock-label">Campaign progress (demo)</span>
              <span className="mini-bar gold">
                <i style={{ width: '58%' }} />
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="how2-supporters">
        <div className="container supporters-grid">
          <div>
            <h2>For supporters</h2>
            <p className="muted">A few moments. A shared purpose.</p>
            <ol className="supporter-steps">
              {SUPPORTER_STEPS.map((step, index) => (
                <li key={step.title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="game-showcase">
            <div className="game-shot">
              <img src={GAME_THUMBS.garden} alt="The Grow a Giving Tree game" />
              <span className="free-pill">
                <Icon name="game" size={14} /> ₹50 per plant
              </span>
            </div>
            <div className="game-shot-foot">
              <span className="btn btn-primary btn-block">
                Choose a contribution <Icon name="arrow" size={16} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {games.length > 0 ? (
      <section className="container how2-section">
        <h2>Games {org.name} campaigns can use</h2>
        <p className="muted">Pick one when you create a campaign, and preview it before you publish.</p>
        <div className="games-rail">
          {games.map((game) => (
            <article key={game.id} className="rail-game">
              <img src={GAME_THUMBS[game.id]} alt="" />
              <span className={game.style === 'flow' ? 'rail-chip calm' : 'rail-chip'}>
                {game.style === 'flow' ? 'Hands-on' : 'Playful'}
              </span>
              <h3>{game.name}</h3>
              <p>{game.hint}</p>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      <section className="container trust-row">
        <div>
          <span className="trust-icon">
            <Icon name="heart" size={20} />
          </span>
          <div>
            <strong>Nothing charged while playing</strong>
            <p>Game actions build a suggestion. You edit it, donate it, or cancel it.</p>
          </div>
        </div>
        <div>
          <span className="trust-icon">
            <Icon name="check" size={20} />
          </span>
          <div>
            <strong>You confirm every contribution</strong>
            <p>You choose the amount before confirming.</p>
          </div>
        </div>
        <div>
          <span className="trust-icon">
            <Icon name="chart" size={20} />
          </span>
          <div>
            <strong>Clear campaign progress</strong>
            <p>See confirmed demo contributions build progress.</p>
          </div>
        </div>
      </section>

      <p className="container demo-note">
        <Icon name="info" size={16} />
        This is a browser-only prototype. No real money is collected. Campaigns and progress are saved on this device; demo links do not transfer to another device.
      </p>

      <section className="container how2-section">
        <h2>A few things you might wonder</h2>
        <div className="faq">
          {FAQ.map((item, index) => {
            const open = openFaq === index
            return (
              <div key={item.q} className={open ? 'faq-item open' : 'faq-item'}>
                <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? -1 : index)}>
                  <span className="faq-chevron">{open ? '⌄' : '›'}</span>
                  {item.q}
                  {item.soon ? <span className="soon-pill">Coming soon</span> : null}
                </button>
                {open ? <p>{item.a}</p> : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="container">
        <div className="cta-band">
          <div>
            <h2>Bring your community together.</h2>
            <p>Start with a cause. Add a little joy.</p>
          </div>
          <div className="cta-actions">
            <Link to={`${base}/create?new=1`} className="btn btn-light btn-lg">
              Create a campaign <Icon name="arrow" size={16} />
            </Link>
            <Link to={`${base}/campaigns`} className="cta-link">
              Explore campaigns
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
