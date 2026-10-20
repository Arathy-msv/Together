import { clampFeaturesToPlan, FEATURE_KEYS, PLATFORM_SETTINGS_KEY, unavailableFeatures, type FeatureKey } from './features.ts'
import { recordAudit } from './identity.ts'
import { findOrganization, saveOrganization } from './orgStorage.ts'
import { assertCan, type Permission } from './permissions.ts'
import { notifyChange, StorageFullError } from './storage.ts'
import type { Organization, PlanId } from './types.ts'

/**
 * Organization writes from the workspace. Each one checks the acting demo identity against the
 * stored organization (not the edited copy), so a changed id or membership can’t widen access.
 */
export function saveOrganizationAs(permission: Extract<Permission, `org.${string}`>, next: Organization, action: string | null = permission): Organization {
  const stored = findOrganization(next.id)
  if (!stored) throw new Error('This organization is no longer saved in this browser.')
  assertCan(permission, { organization: stored })
  const saved = saveOrganization(next)
  if (action) recordAudit(action, { organizationId: stored.id })
  return saved
}

/* ---------- Platform Admin ---------- */

/** Changes an organization’s demo plan. Features the new plan excludes switch off; their data is kept. */
export function platformSetPlan(organizationId: string, planId: PlanId): Organization {
  assertCan('platform.managePlans')
  const stored = findOrganization(organizationId)
  if (!stored) throw new Error('Organization not found.')
  const saved = saveOrganization({ ...stored, plan: { id: planId, selectedAt: new Date().toISOString() }, features: clampFeaturesToPlan(stored.features, planId) })
  recordAudit('platform.plan.changed', { organizationId, detail: planId })
  return saved
}

/** Makes an optional feature available or unavailable for every organization. Nothing is deleted. */
export function setPlatformFeatureAvailability(key: FeatureKey, available: boolean): void {
  assertCan('platform.manageFeatureAvailability')
  if (!FEATURE_KEYS.includes(key)) throw new Error('Unknown feature.')
  const off = new Set(unavailableFeatures())
  if (available) off.delete(key)
  else off.add(key)
  try {
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify({ unavailable: [...off] }))
  } catch {
    throw new StorageFullError()
  }
  notifyChange()
  recordAudit(available ? 'platform.feature.available' : 'platform.feature.unavailable', { targetId: key })
}
