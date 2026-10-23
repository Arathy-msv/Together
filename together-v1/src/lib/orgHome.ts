import type { CampaignView, Organization } from './types.ts'

const STATUS_ORDER: Record<string, number> = { active: 0, scheduled: 1, completed: 2, closed: 3, draft: 4 }

export function featuredCampaigns(views: CampaignView[], limit = 3): CampaignView[] {
  return views
    .filter((view) => !view.campaign.isDraft)
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
    .slice(0, limit)
}

/** Text with organization fallbacks, so empty optional fields never leave blank areas. */
export function homeCopy(org: Organization) {
  const name = org.name.trim() || 'our organization'
  return {
    headline: org.content.headline.trim() || `Fundraising with ${name}`,
    description:
      org.content.description.trim() || org.tagline.trim() || 'Give directly or play a short game to support causes close to our community.',
    cta: org.content.ctaLabel.trim() || 'Explore campaigns',
    heroImage: org.content.heroImage || '/covers/hero-library.jpg',
    supporters: org.content.supporterNoun.trim() || 'supporters',
  }
}
