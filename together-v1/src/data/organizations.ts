import { emptyVoucherSettings, recommendedFeatures } from '../lib/features.ts'
import { DEFAULT_ORG_ID, DEFAULT_ORG_SLUG, DEFAULT_VISIBILITY, IMPLEMENTED_GAMES } from '../lib/organizations.ts'
import { DEFAULT_BRANDING } from '../lib/theme.ts'
import type { Organization } from '../lib/types.ts'

const SEEDED_AT = '2026-01-01T00:00:00.000Z'

export const ORG_LUMEN = 'org_lumen'
export const ORG_MAPLE = 'org_maple'
export const ORG_HARBOUR = 'org_harbour'
export const ORG_RIVERSIDE = 'org_riverside_runners'

export function createOrganizationSeed(): Organization[] {
  return [...publishedSeeds(), unfinishedSetupSeed()]
}

function publishedSeeds(): Organization[] {
  return [
    {
      id: DEFAULT_ORG_ID,
      slug: DEFAULT_ORG_SLUG,
      name: 'Together',
      type: 'platform',
      logo: '/favicon.svg',
      favicon: '',
      tagline: 'Good causes, shared experiences',
      about: 'Together helps communities raise money through direct giving and short, joyful games.',
      branding: { ...DEFAULT_BRANDING },
      content: {
        headline: 'Good causes. Shared experiences.',
        description: 'Bring your community together through simple, interactive fundraising.',
        heroImage: '/covers/hero-library.jpg',
        ctaLabel: 'Explore campaigns',
        contactEmail: 'hello@together.example',
        location: '',
        footerText: 'Browser-only demo. No real money is collected.',
        website: '',
        socialLinks: [],
        supporterNoun: 'supporters',
        impactTitle: 'Small actions add up',
        impactStory:
          'Riverside School families planted a garden, matched cards and zipped jackets together. Every finished action became a suggestion they could review before giving.',
      },
      defaults: { currency: 'USD', suggestedAmounts: [100, 250, 500], visibility: 'open', durationDays: 30, games: [...IMPLEMENTED_GAMES] },
      visibility: { ...DEFAULT_VISIBILITY },
      plan: { id: 'organization', selectedAt: SEEDED_AT },
    features: recommendedFeatures('platform', 'organization'),
    voucherSettings: emptyVoucherSettings(),
    featureHistory: [],
      website: { status: 'published', publishedAt: SEEDED_AT, updatedAt: SEEDED_AT },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    {
      id: ORG_LUMEN,
      slug: 'lumen-co',
      name: 'Lumen & Co.',
      type: 'company',
      logo: '/orgs/lumen.svg',
      favicon: '',
      tagline: 'Engineering brighter workplaces since 2009',
      about:
        'Lumen & Co. matches every colleague gift during our giving season. Campaigns here are run by our People Team and employee volunteer groups.',
      branding: {
        primary: '#1d3f8f',
        secondary: '#e1e9f8',
        accent: '#f2a33a',
        background: '#f5f7fb',
        headingFont: 'figtree',
        bodyFont: 'figtree',
        buttonStyle: 'soft',
      },
      content: {
        headline: 'Give back with your Lumen colleagues',
        description:
          'Join an employee giving challenge, play a quick team game, and see every confirmed gift move our shared goals forward.',
        heroImage: '/covers/cover-winter.jpg',
        ctaLabel: 'Browse team challenges',
        contactEmail: 'giving@lumen.example',
        location: 'Pune · Leeds · Austin · Dublin',
        footerText: 'Lumen & Co. Employee Giving · Internal demo. No real money is collected.',
        website: 'https://lumen.example',
        socialLinks: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/company/lumen-example' }],
        supporterNoun: 'colleagues',
        impactTitle: '1,100 coat kits across four offices',
        impactStory:
          'Last winter, 214 colleagues packed and delivered coat kits to partner shelters. Teams in Pune, Leeds, Austin and Dublin turned lunch breaks into packing lines.',
      },
      defaults: { currency: 'USD', suggestedAmounts: [10, 25, 50], visibility: 'open', durationDays: 21, games: ['memory', 'jacket', 'garden'] },
      visibility: { games: true, direct: true, impactStories: true, assistant: true, poweredBy: true },
      plan: { id: 'organization', selectedAt: SEEDED_AT },
    features: recommendedFeatures('company', 'organization'),
    voucherSettings: emptyVoucherSettings(),
    featureHistory: [],
      website: { status: 'published', publishedAt: SEEDED_AT, updatedAt: SEEDED_AT },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    {
      id: ORG_MAPLE,
      slug: 'maple-grove',
      name: 'Maple Grove Public School',
      type: 'school',
      logo: '/orgs/maple.svg',
      favicon: '',
      tagline: 'Curious minds, kind hearts',
      about:
        'Maple Grove Public School’s parent–teacher association raises funds for classrooms, sports and the school garden with help from families and alumni.',
      branding: {
        primary: '#7a1f2b',
        secondary: '#f4e6c9',
        accent: '#d99a1e',
        background: '#fffbf2',
        headingFont: 'fraunces',
        bodyFont: 'nunito',
        buttonStyle: 'rounded',
      },
      content: {
        headline: 'Together we build a brighter Maple Grove',
        description:
          'Support student projects, school spaces and community events. Families, alumni and neighbours can give directly or play along.',
        heroImage: '/covers/cover-reading.jpg',
        ctaLabel: 'Support our students',
        contactEmail: 'pta@maplegrove.example',
        location: 'Maple Grove, Bengaluru',
        footerText: 'Maple Grove PTA · School fundraising demo. No real money is collected.',
        website: 'https://maplegrove.example',
        socialLinks: [
          { label: 'Instagram', url: 'https://www.instagram.com/maplegrove.example' },
          { label: 'Facebook', url: 'https://www.facebook.com/maplegrove.example' },
        ],
        supporterNoun: 'families',
        impactTitle: 'A reading corner in every classroom',
        impactStory:
          'In one term, 320 families funded 12 classroom reading corners. Grade 4 students now run a lunchtime book club for younger readers.',
      },
      defaults: { currency: 'USD', suggestedAmounts: [100, 250, 500], visibility: 'open', durationDays: 30, games: ['garden', 'puzzle', 'memory'] },
      visibility: { games: true, direct: true, impactStories: true, assistant: true, poweredBy: true },
      plan: { id: 'community', selectedAt: SEEDED_AT },
    features: recommendedFeatures('school', 'community'),
    voucherSettings: emptyVoucherSettings(),
    featureHistory: [],
      website: { status: 'published', publishedAt: SEEDED_AT, updatedAt: SEEDED_AT },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    {
      id: ORG_HARBOUR,
      slug: 'open-harbour',
      name: 'Open Harbour Foundation',
      type: 'nonprofit',
      logo: '/orgs/harbour.svg',
      favicon: '',
      tagline: 'Safe harbours for every family',
      about:
        'Open Harbour Foundation runs night shelters, community kitchens and winter outreach for families facing housing insecurity.',
      branding: {
        primary: '#0e5a5f',
        secondary: '#d6eeea',
        accent: '#d9694e',
        background: '#f4f8f7',
        headingFont: 'georgia',
        bodyFont: 'system',
        buttonStyle: 'soft',
      },
      content: {
        headline: 'Safe harbours for every family',
        description:
          'Your support keeps shelter beds warm, kitchens open and outreach teams on the streets every night of the year.',
        heroImage: '/covers/cover-garden.jpg',
        ctaLabel: 'See where help is needed',
        contactEmail: 'hello@openharbour.example',
        location: 'Kochi, Kerala',
        footerText: 'Open Harbour Foundation · Registered charity demo. No real money is collected.',
        website: 'https://openharbour.example',
        socialLinks: [{ label: 'Instagram', url: 'https://www.instagram.com/openharbour.example' }],
        supporterNoun: 'supporters',
        impactTitle: '9,400 warm meals last season',
        impactStory:
          'Volunteers and supporters kept our three community kitchens open seven days a week, serving warm meals and packing take-home boxes for families.',
      },
      defaults: { currency: 'USD', suggestedAmounts: [250, 500, 1000], visibility: 'open', durationDays: 45, games: ['garden', 'jacket', 'memory', 'puzzle'] },
      visibility: { games: true, direct: true, impactStories: true, assistant: true, poweredBy: false },
      plan: { id: 'community', selectedAt: SEEDED_AT },
    features: recommendedFeatures('nonprofit', 'community'),
    voucherSettings: emptyVoucherSettings(),
    featureHistory: [],
      website: { status: 'published', publishedAt: SEEDED_AT, updatedAt: SEEDED_AT },
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ]
}

/** An onboarding started on this device but not finished, to demonstrate resuming setup. */
export function unfinishedSetupSeed(): Organization {
  const content = {
    headline: 'Run together, give together',
    description: '',
    heroImage: '/covers/cover-sports.jpg',
    ctaLabel: 'See our runs',
    contactEmail: 'hello@riverside-runners.example',
    location: 'Riverside, Kochi',
    footerText: 'Riverside Runners Club · Volunteer-run running club.',
    website: '',
    socialLinks: [],
    supporterNoun: 'runners',
    impactTitle: '',
    impactStory: '',
  }
  const branding = { primary: '#b5471f', secondary: '#f6e3d6', accent: '#2f6e8f', background: '#fffaf5', headingFont: 'nunito' as const, bodyFont: 'nunito' as const, buttonStyle: 'rounded' as const }
  return {
    id: ORG_RIVERSIDE,
    slug: 'riverside-runners',
    name: 'Riverside Runners Club',
    type: 'club',
    logo: '',
    favicon: '',
    tagline: 'Saturday 5k for everyone',
    about: 'A volunteer-run club organizing free weekly runs and charity races along the river.',
    branding,
    content,
    defaults: { currency: 'USD', suggestedAmounts: [100, 200, 500], visibility: 'open', durationDays: 30, games: ['garden', 'memory'] },
    visibility: { games: true, direct: true, impactStories: false, assistant: true, poweredBy: true },
    plan: { id: 'starter', selectedAt: SEEDED_AT },
    features: recommendedFeatures('club', 'starter'),
    voucherSettings: emptyVoucherSettings(),
    featureHistory: [],
    website: {
      status: 'setup',
      draft: { name: 'Riverside Runners Club', tagline: 'Saturday 5k for everyone', about: 'A volunteer-run club organizing free weekly runs and charity races along the river.', logo: '', favicon: '', branding, content, visibility: { impactStories: false, poweredBy: true } },
      updatedAt: SEEDED_AT,
    },
    onboarding: { step: 3, updatedAt: SEEDED_AT },
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  }
}

export function seededOrganization(id: string): Organization | undefined {
  return createOrganizationSeed().find((org) => org.id === id)
}
