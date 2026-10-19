import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GAME_THUMBS, GAMES } from '../lib/games.ts'

const ORGANISER = [
  {
    title: 'Tell the story',
    text: 'Add a title, a short description, and a cover. Choose a photo template or upload your own, and add an organisation logo if you have one.',
  },
  {
    title: 'Set how people take part',
    text: 'Choose a fundraising goal and suggested amounts, or let supporters enter their own. Pick an open or private group, and choose one game — or direct giving only.',
  },
  {
    title: 'Choose the dates',
    text: 'Set when the campaign opens and closes. You can close it automatically once the goal is reached. Save a draft and come back, or continue to review.',
  },
  {
    title: 'Publish and share',
    text: 'Creating a campaign saves it in this browser. From My campaigns, copy the demo link, view the page, close it, or delete it along with its simulated contributions.',
  },
]

const SUPPORTER = [
  {
    title: 'Open the campaign',
    text: 'The link shows the cover, story, organiser, goal, and progress. A private campaign asks for the demo access code first. That code is not real access control.',
  },
  {
    title: 'Give directly',
    text: 'Choose a suggested amount or enter one, then continue to the confirmation screen. Nothing is collected until you confirm, and no payment details are asked for.',
  },
  {
    title: 'Or play first',
    text: 'The campaign’s game is free. Planting, matching, puzzling, or a short gesture does not change the total. When you finish, you can still choose a simulated contribution.',
  },
  {
    title: 'See the progress move',
    text: 'A successful confirmation updates the amount raised, the supporter count, and the progress bar. The thank-you page shows the amount and a demo reference number.',
  },
]

export function HowItWorksPage() {
  useEffect(() => {
    document.title = 'How it works — Together'
  }, [])

  return (
    <div className="container page-pad how">
      <header className="how-hero">
        <p className="eyebrow-label">How Together works</p>
        <h1>Create a cause. Share a link. Give, or play first.</h1>
        <p className="lead">
          Together is a browser-only demonstration. Organisers publish a campaign. Supporters open it, contribute directly or through a short game, and confirm a simulated gift. No account and no real payment.
        </p>
        <div className="actions">
          <Link to="/create?new=1" className="btn btn-primary btn-lg">
            Create a campaign
          </Link>
          <Link to="/explore" className="btn btn-outline btn-lg">
            Explore campaigns
          </Link>
        </div>
      </header>

      <section className="how-paths">
        <article className="panel how-path">
          <p className="eyebrow-label">For organisers</p>
          <h2>From an idea to a shareable page</h2>
          <ol>
            {ORGANISER.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
        <article className="panel how-path">
          <p className="eyebrow-label">For supporters</p>
          <h2>From a link to a confirmed gift</h2>
          <ol>
            {SUPPORTER.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="how-games">
        <div className="section-title">
          <h2>Games you can attach to a campaign</h2>
          <p className="muted">Pick one while creating the campaign. You can preview it before publishing.</p>
        </div>
        <div className="how-game-grid">
          {GAMES.map((game) => (
            <article key={game.id} className="how-game">
              <img src={GAME_THUMBS[game.id]} alt="" />
              <div>
                <h3>{game.name}</h3>
                <p>{game.hint}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel how-rules">
        <h2>What the demo will and won’t do</h2>
        <ul>
          <li>Campaigns and gifts stay in this browser. Refreshing keeps them. Another device will not see them.</li>
          <li>A campaign accepts gifts only while it is active: after it opens, before it closes, and before it is closed by hand or by reaching its goal.</li>
          <li>Only a confirmed simulated contribution changes the progress. A failed demo payment does not.</li>
          <li>Playing a game is free. The fundraising total changes only if someone then confirms an amount.</li>
          <li>Voucher rewards, accounts, and real payments are marked coming soon and are not part of this demo.</li>
        </ul>
        <p className="muted small">Reset demo data on My campaigns restores the sample campaigns and clears everything created in this browser.</p>
      </section>
    </div>
  )
}
