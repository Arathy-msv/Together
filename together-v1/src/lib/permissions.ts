import { canUseFeature } from './features.ts'
import { currentUser, membership, merchantAccessFor, type DemoUser, type Role } from './identity.ts'
import type { Campaign, Organization } from './types.ts'

/*
 * Centralized, typed permission checks for the five demo roles. Every protected route, query and
 * mutation calls these. Anything not explicitly allowed is denied. These checks demonstrate the
 * product’s access rules in a browser-only prototype; they are not production security.
 */

export type Permission =
  // Platform Admin
  | 'platform.manageOrganizations'
  | 'platform.managePlans'
  | 'platform.manageFeatureAvailability'
  // Organization Admin
  | 'workspace.view'
  | 'org.manageWebsite'
  | 'org.manageSettings'
  | 'org.managePlan'
  | 'org.manageFeatures'
  | 'org.manageMembers'
  | 'org.managePartnerOffers'
  | 'org.manageSponsors'
  | 'org.viewReports'
  | 'org.exportRecords'
  | 'campaign.review'
  // Campaigns (Organization Admin, or Campaign Organizer within explicit scope)
  | 'campaign.create'
  | 'campaign.view'
  | 'campaign.edit'
  | 'campaign.manageContent'
  | 'campaign.manageSharing'
  | 'campaign.submit'
  | 'campaign.publish'
  | 'campaign.close'
  | 'campaign.delete'
  // Merchant
  | 'merchant.lookupVoucher'
  | 'merchant.redeem'
  | 'merchant.viewRedemptions'

export interface PermissionScope {
  organization?: Organization
  organizationId?: string
  campaign?: Pick<Campaign, 'id' | 'organizationId' | 'isDraft' | 'createdBy'>
  merchantId?: string
  branchId?: string
}

export class PermissionError extends Error {
  constructor(message = 'Your demo identity can’t do that.') {
    super(message)
    this.name = 'PermissionError'
  }
}

const ADMIN_ONLY: Permission[] = [
  'org.manageWebsite',
  'org.manageSettings',
  'org.managePlan',
  'org.manageFeatures',
  'org.manageMembers',
  'org.managePartnerOffers',
  'org.manageSponsors',
  'org.viewReports',
  'org.exportRecords',
  'campaign.review',
  'campaign.close',
]

const CAMPAIGN_SCOPED: Permission[] = ['campaign.view', 'campaign.edit', 'campaign.manageContent', 'campaign.manageSharing', 'campaign.submit']

function orgIdOf(scope: PermissionScope): string | undefined {
  return scope.campaign?.organizationId ?? scope.organization?.id ?? scope.organizationId
}

/** True when a Campaign Organizer has this campaign in their explicit scope. */
function organizerHasCampaign(user: DemoUser, campaign: NonNullable<PermissionScope['campaign']>): boolean {
  const member = membership(user.id, campaign.organizationId)
  if (!member || member.role !== 'campaign_organizer') return false
  return member.campaignIds.includes(campaign.id)
}

/** Can `user` (null = guest) do `permission` on this scope? Denies by default. */
export function can(user: DemoUser | null, permission: Permission, scope: PermissionScope = {}): boolean {
  if (!user) return false

  if (permission.startsWith('platform.')) return user.platformAdmin

  if (permission.startsWith('merchant.')) {
    if (!scope.merchantId) return merchantAccessFor(user.id).length > 0 && permission !== 'merchant.redeem'
    const access = merchantAccessFor(user.id).find((item) => item.merchantId === scope.merchantId)
    if (!access) return false
    if (!scope.branchId) return permission !== 'merchant.redeem'
    return access.branchIds === 'all' || access.branchIds.includes(scope.branchId)
  }

  const organizationId = orgIdOf(scope)
  if (!organizationId) return false
  const member = membership(user.id, organizationId)
  if (!member) return false
  const admin = member.role === 'org_admin'

  if (permission === 'workspace.view' || permission === 'campaign.create') return true
  if (ADMIN_ONLY.includes(permission)) return admin

  const campaign = scope.campaign
  if (CAMPAIGN_SCOPED.includes(permission)) {
    if (!campaign) return false
    return admin || organizerHasCampaign(user, campaign)
  }

  if (permission === 'campaign.publish') {
    if (!campaign) return admin
    if (admin) return true
    // Organizers may publish their scoped campaigns only when the organization does not require review.
    const org = scope.organization
    if (!org || canUseFeature(org, 'reviewApproval')) return false
    return organizerHasCampaign(user, campaign)
  }

  if (permission === 'campaign.delete') {
    if (!campaign) return false
    if (admin) return true
    // Organizers can discard their own unpublished drafts only.
    return Boolean(campaign.isDraft) && campaign.createdBy === user.id && organizerHasCampaign(user, campaign)
  }

  return false
}

export function canCurrent(permission: Permission, scope: PermissionScope = {}): boolean {
  return can(currentUser(), permission, scope)
}

/** Throws PermissionError unless the current demo identity may do this. */
export function assertCan(permission: Permission, scope: PermissionScope = {}, message?: string): DemoUser {
  const user = currentUser()
  if (!can(user, permission, scope)) throw new PermissionError(message)
  return user!
}

/** Roles a user holds in one organization, plus platform and merchant roles. Supporter is always included. */
export function rolesOf(user: DemoUser | null, organizationId?: string): Role[] {
  if (!user) return ['supporter']
  const roles: Role[] = []
  if (user.platformAdmin) roles.push('platform_admin')
  if (organizationId) {
    const member = membership(user.id, organizationId)
    if (member) roles.push(member.role)
  }
  if (merchantAccessFor(user.id).length > 0) roles.push('merchant')
  roles.push('supporter')
  return roles
}

/** Campaigns an identity may see in the workspace. Admins see all of their organization’s campaigns. */
export function visibleCampaigns<T extends Pick<Campaign, 'id' | 'organizationId' | 'isDraft' | 'createdBy'>>(user: DemoUser | null, organizationId: string, campaigns: T[]): T[] {
  return campaigns.filter((campaign) => campaign.organizationId === organizationId && can(user, 'campaign.view', { campaign }))
}

/** Workspace sections and the permission each one needs. */
export const SECTION_PERMISSION: Record<string, Permission> = {
  overview: 'workspace.view',
  website: 'org.manageWebsite',
  campaigns: 'workspace.view',
  assistant: 'campaign.create',
  settings: 'org.manageSettings',
  plan: 'org.managePlan',
  features: 'org.manageFeatures',
  offers: 'org.managePartnerOffers',
  members: 'org.manageMembers',
  sponsors: 'org.manageSponsors',
}

/** Unfinished setups the acting identity may continue: only its own organizations, as Organization Admin. */
export function ownsSetup(user: DemoUser | null, organizationId: string): boolean {
  return can(user, 'org.manageWebsite', { organizationId })
}
