import { FEATURE_CARDS, PLAN_ENTITLEMENTS, type FeatureKey } from './features.ts'
import type { PlanId } from './types.ts'

/*
 * Sample plans for the prototype. They are labelled "Demo plan", have no prices, and are never
 * billed. Limits are shown for transparency but are not enforced. Optional-feature entitlements
 * are demo labels only.
 */

export interface DemoPlan {
  id: PlanId
  name: string
  audience: string
  features: string[]
  limits: string[]
  /** Optional website features this demo plan includes. */
  optionalFeatures: FeatureKey[]
}

export const DEMO_PLANS: DemoPlan[] = [
  {
    id: 'starter',
    name: 'Starter demo plan',
    audience: 'Small clubs and first campaigns',
    features: ['Branded organization website', 'Direct contributions', 'Two games of your choice', 'Personal sharing pages'],
    limits: ['Up to 3 active campaigns', 'One organizer workspace'],
    optionalFeatures: PLAN_ENTITLEMENTS.starter,
  },
  {
    id: 'community',
    name: 'Community demo plan',
    audience: 'Schools and community groups',
    features: ['Everything in Starter', 'All available games', 'Updates, milestones and fund use', 'Campaign assistant (AI preview · Simulated)'],
    limits: ['Up to 10 active campaigns', 'Translation preview not included'],
    optionalFeatures: PLAN_ENTITLEMENTS.community,
  },
  {
    id: 'organization',
    name: 'Organization demo plan',
    audience: 'Companies and larger nonprofits',
    features: ['Everything in Community', 'Translation preview', 'Final impact reports', 'Priority onboarding guidance'],
    limits: ['No campaign limit in this demo', 'Multiple managers: coming soon'],
    optionalFeatures: PLAN_ENTITLEMENTS.organization,
  },
]

export function demoPlan(id: PlanId): DemoPlan {
  return DEMO_PLANS.find((plan) => plan.id === id) ?? DEMO_PLANS[1]
}

export function optionalFeatureNames(planId: PlanId): string[] {
  return demoPlan(planId).optionalFeatures.map((key) => FEATURE_CARDS.find((card) => card.key === key)!.name)
}
