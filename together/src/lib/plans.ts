import type { PlanId } from './types.ts'

/*
 * Sample plans for the prototype. They are labelled "Demo plan", have no prices, and are never
 * billed. Limits are shown for transparency but are not enforced.
 */

export interface DemoPlan {
  id: PlanId
  name: string
  audience: string
  features: string[]
  limits: string[]
}

export const DEMO_PLANS: DemoPlan[] = [
  {
    id: 'starter',
    name: 'Starter demo plan',
    audience: 'Small clubs and first campaigns',
    features: ['Branded organization website', 'Direct contributions', 'Two games of your choice', 'Personal sharing pages'],
    limits: ['Up to 3 active campaigns', 'One organizer workspace'],
  },
  {
    id: 'community',
    name: 'Community demo plan',
    audience: 'Schools and community groups',
    features: ['Everything in Starter', 'All available games', 'Updates, milestones and fund use', 'Campaign assistant (AI preview · Simulated)'],
    limits: ['Up to 10 active campaigns', 'Translation preview not included'],
  },
  {
    id: 'organization',
    name: 'Organization demo plan',
    audience: 'Companies and larger nonprofits',
    features: ['Everything in Community', 'Translation preview', 'Final impact reports', 'Priority onboarding guidance'],
    limits: ['No campaign limit in this demo', 'Multiple managers: coming soon'],
  },
]

export function demoPlan(id: PlanId): DemoPlan {
  return DEMO_PLANS.find((plan) => plan.id === id) ?? DEMO_PLANS[1]
}
