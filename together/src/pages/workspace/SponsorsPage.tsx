import { useState } from 'react'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { formatMinor } from '../../lib/transparency.ts'
import { parseRupeesToPaise } from '../../lib/gameContribution.ts'
import { confirmSponsorAllocation, createSponsorCommitment, sponsorBalance } from '../../lib/sponsors.ts'
import { canUseFeature } from '../../lib/features.ts'
import type { CurrencyCode } from '../../lib/types.ts'

/** Organization Admin creates a fictional sponsor commitment and confirms pending play rewards. */
export function SponsorsPage() {
  const { org } = useOrg()
  const store = useDemoStore()
  const campaigns = store.campaigns.filter((item) => item.organizationId === org.id && item.participation.game)
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? '')
  const [name, setName] = useState('Northwind Stationery (fictional)')
  const [pledge, setPledge] = useState('5000')
  const [cap, setCap] = useState('500')
  const [reward, setReward] = useState('50')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const enabled = canUseFeature(org, 'sponsorPlay')
  const currency = (campaigns.find((item) => item.id === campaignId)?.currency ?? 'INR') as CurrencyCode
  const commitments = store.sponsorCommitments.filter((item) => item.organizationId === org.id)

  function add() {
    setError('')
    const pledgedMinor = parseRupeesToPaise(pledge)
    const capMinor = parseRupeesToPaise(cap)
    const rewardMinor = parseRupeesToPaise(reward)
    if (!campaignId || pledgedMinor == null || capMinor == null || rewardMinor == null) {
      setError('Choose a campaign and enter amounts greater than zero.')
      return
    }
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 60)
    try {
      createSponsorCommitment({
        organizationId: org.id,
        campaignId,
        sponsorName: name.trim() || 'Sponsor',
        pledgedMinor,
        perParticipantCapMinor: capMinor,
        unlocks: [1, 2, 3].map((n) => ({ id: `match-${n}`, label: `Matched pair ${n}`, rewardMinor })),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      })
      setNotice('Sponsor commitment saved. It is simulated — no sponsor has been invoiced.')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The commitment could not be saved.')
    }
  }

  function confirm(id: string) {
    setError('')
    try {
      confirmSponsorAllocation(id)
      setNotice('Simulated sponsor funds confirmed once. They are not added to anyone’s personal checkout.')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That allocation could not be confirmed.')
    }
  }

  if (!enabled) {
    return (
      <section className="panel">
        <h1>Sponsor-funded play</h1>
        <p>Turn on sponsor-funded play in Website features before adding a commitment.</p>
      </section>
    )
  }

  return (
    <div className="workspace-grid">
      <section className="panel ws-card wide">
        <h1>Sponsor-funded play</h1>
        <p className="muted small">A fictional sponsor budget. Pending rewards stay out of the campaign total until you confirm them. Confirming the same reward again does nothing.</p>
        {notice ? <div className="notice success" role="status">{notice}</div> : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {commitments.some((item) => item.campaignId === campaignId) ? null : (
          <div className="ws-subform">
            <label className="field">
              <span className="field-label">Campaign</span>
              <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                {campaigns.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sponsor name</span>
              <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Pledged budget</span>
              <input inputMode="decimal" value={pledge} onChange={(event) => setPledge(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Cap per person</span>
              <input inputMode="decimal" value={cap} onChange={(event) => setCap(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Reward for each of 3 matched pairs</span>
              <input inputMode="decimal" value={reward} onChange={(event) => setReward(event.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" onClick={add}>Add sponsor commitment</button>
          </div>
        )}
      </section>
      {commitments.map((item) => {
        const balance = sponsorBalance(item)
        const rows = store.sponsorAllocations.filter((row) => row.commitmentId === item.id)
        const campaign = store.campaigns.find((entry) => entry.id === item.campaignId)
        return (
          <section key={item.id} className="panel ws-card wide">
            <h2>{item.sponsorName}</h2>
            <p className="muted small">{campaign?.title} · {balance.dateOpen ? 'Open' : 'Outside the sponsorship dates'}</p>
            <dl className="budget-summary">
              <div><dt>Pledged</dt><dd>{formatMinor(item.pledgedMinor, currency)}</dd></div>
              <div><dt>Pending</dt><dd>{formatMinor(balance.pendingMinor, currency)}</dd></div>
              <div><dt>Confirmed</dt><dd>{formatMinor(balance.confirmedMinor, currency)}</dd></div>
              <div><dt>Remaining</dt><dd>{formatMinor(balance.remainingMinor, currency)}</dd></div>
            </dl>
            {rows.length === 0 ? <p className="awaiting">No play rewards yet.</p> : (
              <ul className="ws-list">
                {rows.map((row) => (
                  <li key={row.id}>
                    <div>
                      <strong>{item.unlocks.find((unlock) => unlock.id === row.unlockId)?.label ?? 'Reward'}</strong>
                      <span className="muted small">{formatMinor(row.amountMinor, currency)} · {row.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span>
                    </div>
                    {row.status === 'pending' ? (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => confirm(row.id)}>Confirm simulated funds</button>
                    ) : (
                      <span className="muted small">Counted once in the campaign total</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {balance.remainingMinor === 0 ? <p className="notice warn compact">Sponsor budget is used up. Further play does not create rewards.</p> : null}
          </section>
        )
      })}
    </div>
  )
}
