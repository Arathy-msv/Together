import { useEffect } from 'react'
import { useOrg } from '../../components/org/OrgContext.tsx'
import { OrgHomeView } from '../../components/org/OrgHomeView.tsx'
import { useCampaignViews } from '../../hooks/useDemoStore.ts'

export function OrgHomePage() {
  const { org, base } = useOrg()
  const views = useCampaignViews()

  useEffect(() => {
    document.title = `${org.name} — ${org.content.headline || 'Campaigns'}`
  }, [org.name, org.content.headline])

  return (
    <div className="container">
      <OrgHomeView org={org} views={views} base={base} />
    </div>
  )
}
