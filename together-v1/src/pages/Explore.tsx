import { useEffect, useMemo, useState } from 'react'
import { CampaignCard } from '../components/CampaignCard.tsx'
import { Icon } from '../components/illustrations.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'

export function ExplorePage() {
  const { org } = useOrg()
  const views = useCampaignViews().filter((view) => !view.campaign.isDraft)
  const [query, setQuery] = useState('')

  useEffect(() => {
    document.title = `Campaigns — ${org.name}`
  }, [org.name])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return views
    return views.filter((view) => {
      const haystack = `${view.campaign.title} ${view.campaign.description} ${view.campaign.organizerName}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [views, query])

  return (
    <div className="container page-pad">
      <div className="page-title">
        <h1>{org.name} campaigns</h1>
        <p className="muted">
          {org.visibility.games && org.visibility.direct
            ? 'Give directly or play a short game to support a cause.'
            : org.visibility.games
              ? 'Play a short game to build a suggested contribution for a cause.'
              : 'Choose a cause and give directly.'}
        </p>
      </div>
      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search campaigns"
            aria-label="Search campaigns"
          />
        </label>
      </div>
      {visible.length === 0 ? (
        <div className="panel empty">
          <h2>No campaigns match that search</h2>
          <p className="muted">Try another word, or clear the search to see every campaign.</p>
          <button type="button" className="btn btn-outline" onClick={() => setQuery('')}>
            Show all campaigns
          </button>
        </div>
      ) : (
        <div className="tile-grid">
          {visible.map((view) => (
            <CampaignCard key={view.campaign.id} view={view} />
          ))}
        </div>
      )}
    </div>
  )
}
