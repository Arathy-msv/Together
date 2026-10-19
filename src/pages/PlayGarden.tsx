import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AmountPicker } from '../components/AmountPicker.tsx'
import { FlowerGlyph, Icon } from '../components/illustrations.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { useCampaignView } from '../hooks/useDemoStore.ts'
import { formatINR, parseWholeRupees } from '../lib/format.ts'
import {
  describePlanting,
  FLOWER_OPTIONS,
  getPending,
  newToken,
  readGarden,
  setPending,
  writeGarden,
} from '../lib/pending.ts'
import type { CampaignView, FlowerKind } from '../lib/types.ts'
import { NotFoundPage } from './NotFound.tsx'

const SPOTS = [
  { left: '18%', top: '62%' },
  { left: '46%', top: '58%' },
  { left: '72%', top: '64%' },
]

export function PlayGardenPage() {
  const { id = '' } = useParams()
  const view = useCampaignView(id)

  useEffect(() => {
    document.title = 'Plant a little encouragement — Together'
  }, [])

  if (!view) return <NotFoundPage />
  if (!view.campaign.participation.game) {
    const campaign = view.campaign
    return (
      <div className="page narrow empty-state">
        <h1>This campaign does not include the garden game</h1>
        <Link to={`/campaigns/${campaign.id}`} className="btn btn-primary">
          Back to campaign
        </Link>
      </div>
    )
  }
  return <GardenSession view={view} />
}

function GardenSession({ view }: { view: CampaignView }) {
  const { campaign } = view
  const navigate = useNavigate()
  const pending = getPending(campaign.id)
  const [selectedFlower, setSelectedFlower] = useState<FlowerKind>('sunflower')
  const [spots, setSpots] = useState<Array<FlowerKind | null>>(() => pending?.flowers ?? readGarden(campaign.id))
  const [amount, setAmount] = useState<number | null>(() => {
    if (campaign.donationMode !== 'fixed') return null
    if (pending && campaign.fixedAmounts.includes(pending.amount)) return pending.amount
    if (campaign.fixedAmounts.includes(250)) return 250
    return campaign.fixedAmounts[0] ?? null
  })
  const [custom, setCustom] = useState(() =>
    campaign.donationMode === 'custom' && pending ? String(pending.amount) : '',
  )
  const [error, setError] = useState('')
  const planted = spots.filter(Boolean).length
  const blocked = !view.canGive

  function plant(index: number) {
    setSpots((current) => {
      const next = [...current]
      next[index] = current[index] ? null : selectedFlower
      writeGarden(campaign.id, next)
      return next
    })
  }

  function continueToPayment() {
    const chosen =
      campaign.donationMode === 'fixed'
        ? amount != null && campaign.fixedAmounts.includes(amount)
          ? amount
          : null
        : parseWholeRupees(custom)
    if (chosen == null || chosen <= 0 || chosen > 10_000_000) {
      setError(
        campaign.donationMode === 'fixed'
          ? 'Choose one of the suggested amounts.'
          : 'Enter a whole amount greater than zero.',
      )
      return
    }
    const pending = getPending(campaign.id)
    setPending({
      token: pending?.method === 'game' ? pending.token : newToken(),
      campaignId: campaign.id,
      amount: chosen,
      method: 'game',
      detail: describePlanting(spots),
      flowers: spots,
    })
    navigate(`/campaigns/${campaign.id}/confirm`)
  }

  return (
    <div className="page play-page">
      <div className="mini-campaign">
        <div>
          <p className="eyebrow">Campaign Play Demo</p>
          <strong>{campaign.title}</strong>
        </div>
        <div className="mini-progress">
          <span>
            {formatINR(view.raised)} raised of {formatINR(campaign.goalAmount)}
          </span>
          <ProgressBar value={view.percent} />
          <b>{view.percent}%</b>
        </div>
      </div>
      <div className="play-heading">
        <h1>Plant a little encouragement.</h1>
        <p>Choose a flower and plant it in the garden. Each flower adds a little more colour to this shared demo.</p>
      </div>
      <div className="play-grid">
        <div>
          <div className="garden-canvas" aria-label="Garden planting area">
            <div className="garden-sky" />
            <div className="garden-hills" />
            <div className="garden-sign">Keep growing brighter futures</div>
            <div className="garden-sign small">Small actions, big change</div>
            {SPOTS.map((spot, index) => (
              <button
                key={spot.left}
                type="button"
                className={spots[index] ? 'plant-spot planted' : 'plant-spot'}
                style={{ left: spot.left, top: spot.top }}
                onClick={() => plant(index)}
                aria-label={spots[index] ? `Remove ${spots[index]} from spot ${index + 1}` : `Plant a ${selectedFlower} in spot ${index + 1}`}
              >
                {spots[index] ? <FlowerGlyph kind={spots[index] as FlowerKind} /> : <span className="soil" />}
              </button>
            ))}
          </div>
          <section className="flower-picker">
            <h2>Choose a flower to plant</h2>
            <p>Each flower adds a little more joy to a brighter tomorrow. Click a soil spot to plant, or click again to lift it out.</p>
            <div className="flower-options">
              {FLOWER_OPTIONS.map((flower) => (
                <button
                  key={flower.id}
                  type="button"
                  className={selectedFlower === flower.id ? 'flower-option selected' : 'flower-option'}
                  onClick={() => setSelectedFlower(flower.id)}
                >
                  <FlowerGlyph kind={flower.id} size={64} />
                  <strong>{flower.name}</strong>
                  <span>{flower.meaning}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="play-side">
          <div className="panel">
            <div className="garden-count">
              <span>Your garden</span>
              <strong>
                {planted} of 3 planted
              </strong>
            </div>
            <div className="spot-preview">
              {spots.map((flower, index) => (
                <span key={index} className={flower ? 'filled' : ''}>
                  {flower ? <FlowerGlyph kind={flower} size={36} /> : index + 1}
                </span>
              ))}
            </div>
            <p className="free-note">
              <Icon name="game" size={16} />
              Free to play. Planting does not charge you or change the fundraising total.
            </p>
          </div>
          <div className="panel">
            <h2>Ready to help this campaign grow?</h2>
            <p>Make a one-time simulated contribution after you play.</p>
            {blocked ? (
              <div className="status-message">
                <strong>Contributions are closed</strong>
                <p>You can still look around the garden. This campaign is not accepting simulated contributions right now.</p>
                <Link to={`/campaigns/${campaign.id}`}>Back to campaign</Link>
              </div>
            ) : (
              <>
                <AmountPicker
                  mode={campaign.donationMode}
                  amounts={campaign.fixedAmounts}
                  value={amount}
                  customValue={custom}
                  error={error}
                  onSelect={(value) => {
                    setAmount(value)
                    setError('')
                  }}
                  onCustom={(value) => {
                    setCustom(value)
                    setError('')
                  }}
                />
                <button type="button" className="btn btn-primary btn-block" onClick={continueToPayment}>
                  Continue to demo payment
                  <Icon name="arrow" size={16} />
                </button>
                <Link to={`/campaigns/${campaign.id}`} className="keep-playing">
                  Keep playing
                </Link>
              </>
            )}
          </div>
          <article className="soon-card compact">
            <h3>More garden features</h3>
            <p>Custom themes, inviting friends and sharing your garden.</p>
            <span className="coming-badge">Coming soon</span>
          </article>
        </aside>
      </div>
    </div>
  )
}
