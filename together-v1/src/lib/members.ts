import { currentUser, findUser, orgAdmins, orgMembers, writeMembership, writeMerchantAccess, type OrgMembership, type OrgRole } from './identity.ts'
import { findOrganization } from './orgStorage.ts'
import { assertCan, PermissionError } from './permissions.ts'
import { loadStore } from './storage.ts'
import { loadVoucherStore } from './vouchers.ts'

/*
 * Membership and merchant-access changes. Only an Organization Admin of that organization may make
 * them; nobody may change their own role or access; the last Organization Admin can’t be removed.
 */

function scopeOrganization(organizationId: string) {
  const organization = findOrganization(organizationId)
  if (!organization) throw new Error('Organization not found.')
  return organization
}

function notSelf(userId: string): void {
  if (currentUser()?.id === userId) throw new PermissionError('You can’t change your own role or access. Ask another Organization Admin.')
}

function validCampaignIds(organizationId: string, campaignIds: string[]): string[] {
  const own = new Set(loadStore().campaigns.filter((campaign) => campaign.organizationId === organizationId).map((campaign) => campaign.id))
  const unknown = campaignIds.filter((id) => !own.has(id))
  if (unknown.length > 0) throw new Error('Organizers can only be assigned campaigns from this organization.')
  return [...new Set(campaignIds)]
}

function wouldRemoveLastAdmin(organizationId: string, userId: string): boolean {
  const admins = orgAdmins(organizationId)
  return admins.length === 1 && admins[0] === userId
}

export function addMember(organizationId: string, userId: string, role: OrgRole, campaignIds: string[] = []): void {
  const actor = assertCan('org.manageMembers', { organization: scopeOrganization(organizationId) })
  notSelf(userId)
  if (!findUser(userId)) throw new Error('That demo identity does not exist.')
  if (orgMembers(organizationId).some((item) => item.userId === userId)) throw new Error('This person is already a member. Change their role instead.')
  const next: OrgMembership = {
    userId,
    organizationId,
    role,
    campaignIds: role === 'campaign_organizer' ? validCampaignIds(organizationId, campaignIds) : [],
    addedBy: actor.id,
    addedAt: new Date().toISOString(),
  }
  writeMembership(next, { userId, organizationId }, { action: 'member.added', organizationId, targetId: userId, detail: role })
}

export function updateMember(organizationId: string, userId: string, change: { role?: OrgRole; campaignIds?: string[] }): void {
  assertCan('org.manageMembers', { organization: scopeOrganization(organizationId) })
  notSelf(userId)
  const current = orgMembers(organizationId).find((item) => item.userId === userId)
  if (!current) throw new Error('This person is not a member of this organization.')
  const role = change.role ?? current.role
  if (current.role === 'org_admin' && role !== 'org_admin' && wouldRemoveLastAdmin(organizationId, userId)) {
    throw new Error('This is the last Organization Admin. Assign another admin first.')
  }
  const campaignIds = role === 'campaign_organizer' ? validCampaignIds(organizationId, change.campaignIds ?? current.campaignIds) : []
  writeMembership({ ...current, role, campaignIds }, { userId, organizationId }, {
    action: role !== current.role ? 'member.role.changed' : 'member.campaigns.changed',
    organizationId,
    targetId: userId,
    detail: role === 'campaign_organizer' ? `${role} · ${campaignIds.length} campaign(s)` : role,
  })
}

export function removeMember(organizationId: string, userId: string): void {
  assertCan('org.manageMembers', { organization: scopeOrganization(organizationId) })
  notSelf(userId)
  if (!orgMembers(organizationId).some((item) => item.userId === userId)) throw new Error('This person is not a member of this organization.')
  if (wouldRemoveLastAdmin(organizationId, userId)) throw new Error('This is the last Organization Admin. Assign another admin first.')
  writeMembership(null, { userId, organizationId }, { action: 'member.removed', organizationId, targetId: userId })
}

/** Gives a demo identity Merchant access to one partner store of this organization (and chosen branches). */
export function grantMerchantAccess(organizationId: string, merchantId: string, userId: string, branchIds: string[] | 'all'): void {
  const actor = assertCan('org.managePartnerOffers', { organization: scopeOrganization(organizationId) })
  notSelf(userId)
  if (!findUser(userId)) throw new Error('That demo identity does not exist.')
  const merchant = loadVoucherStore().merchants.find((item) => item.id === merchantId && item.organizationIds.includes(organizationId))
  if (!merchant) throw new Error('That partner store is not connected to this organization.')
  const branches = branchIds === 'all' ? 'all' : branchIds.filter((id) => merchant.branches.some((branch) => branch.id === id))
  if (branches !== 'all' && branches.length === 0) throw new Error('Choose at least one branch.')
  writeMerchantAccess(
    { userId, merchantId, branchIds: branches, grantedByOrganizationId: organizationId, grantedBy: actor.id, grantedAt: new Date().toISOString() },
    { userId, merchantId },
    { action: 'merchant.access.granted', organizationId, targetId: userId, detail: merchant.name },
  )
}

export function revokeMerchantAccess(organizationId: string, merchantId: string, userId: string): void {
  assertCan('org.managePartnerOffers', { organization: scopeOrganization(organizationId) })
  const merchant = loadVoucherStore().merchants.find((item) => item.id === merchantId && item.organizationIds.includes(organizationId))
  if (!merchant) throw new Error('That partner store is not connected to this organization.')
  writeMerchantAccess(null, { userId, merchantId }, { action: 'merchant.access.revoked', organizationId, targetId: userId, detail: merchant.name })
}
