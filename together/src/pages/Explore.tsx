import { useEffect, useMemo, useState } from 'react'
import { CampaignCard } from '../components/CampaignCard.tsx'
import { Icon } from '../components/illustrations.tsx'
import { useOrg } from '../components/org/OrgContext.tsx'
import { useCampaignViews } from '../hooks/useDemoStore.ts'
import { FUNDRAISING_LABEL, fundraisingState, type FundraisingState } from '../lib/lifecycle.ts'

const FILTERS: Array<{ id: 'all' | FundraisingState; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'accepting', label: FUNDRAISING_LABEL.accepting },
  { id: 'opens_soon', label: FUNDRAISING_LABEL.opens_soon },
  { id: 'goal_reached', label: FUNDRAISING_LABEL.goal_reached },
  { id: 'closed', label: FUNDRAISING_LABEL.closed },
]

export function ExplorePage() {
  const { org } = useOrg()
  const views = useCampaignViews().filter((view) => !view.campaign.isDraft)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')

  useEffect(() => {
    document.title = `Campaigns — ${org.name}`
  }, [org.name])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return views.filter((view) => {
      if (filter !== 'all' && fundraisingState(view) !== filter) return false
      if (!needle) return true
      const haystack = `${view.campaign.title} ${view.campaign.description} ${view.campaign.organizerName}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [views, query, filter])

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
        <div className="filters" role="group" aria-label="Filter by status">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? 'chip selected' : 'chip'}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="panel empty">
          <h2>No campaigns match that search</h2>
          <p className="muted">Try another word, or reset the filter to see every campaign.</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setQuery('')
              setFilter('all')
            }}
          >
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
