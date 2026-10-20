import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  clear() {
    this.data.clear()
  }
}
const local = new MemoryStorage()
Object.assign(globalThis, { localStorage: local, sessionStorage: new MemoryStorage() })

const identity = await import('../src/lib/identity.ts')
const { DEMO_USERS: U, switchIdentity, currentUser, currentSupporterId } = identity
const { can, PermissionError, visibleCampaigns } = await import('../src/lib/permissions.ts')
const { findOrganization, createOrganization, loadOrganizations } = await import('../src/lib/orgStorage.ts')
const { saveOrganizationAs, setPlatformFeatureAvailability, platformSetPlan } = await import('../src/lib/orgActions.ts')
const { addMember, removeMember, updateMember, grantMerchantAccess } = await import('../src/lib/members.ts')
const { publishWithPolicy, reviewRevision, exportOrganizationRecords, formCampaignForOrg } = await import('../src/lib/featureActions.ts')
const { saveCampaignFields, saveMilestone } = await import('../src/lib/transparency.ts')
const { addContribution, closeCampaign, deleteCampaign, getCampaign } = await import('../src/lib/campaigns.ts')
const { createReferral, updateReferral, isMyReferral } = await import('../src/lib/referrals.ts')
const { saveDraft, readDraft, listDrafts, newDraftId } = await import('../src/lib/drafts.ts')
const { blankForm, campaignToForm } = await import('../src/lib/wizard.ts')
const { canUseFeature } = await import('../src/lib/features.ts')
const { loadStore, saveStore } = await import('../src/lib/storage.ts')
const v = await import('../src/lib/vouchers.ts')

beforeEach(() => local.clear())

const org = (id: string) => findOrganization(id)!
const as = (userId: string | null) => switchIdentity(userId)
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

/** Turns on campaign review for Lumen (Organization plan) as a Lumen admin. */
function enableReview() {
  as(U.lumenAdmin)
  const lumen = org('org_lumen')
  saveOrganizationAs('org.manageFeatures', { ...lumen, features: { ...lumen.features, reviewApproval: true } })
}

test('guests are supporters: no workspace, no management, but public browsing needs no identity', () => {
  as(null)
  assert.equal(currentUser(), null)
  assert.equal(can(null, 'workspace.view', { organizationId: 'org_lumen' }), false)
  assert.equal(can(null, 'campaign.create', { organizationId: 'org_lumen' }), false)
  assert.ok(loadStore().campaigns.some((campaign) => !campaign.isDraft))
  assert.throws(() => deleteCampaign('cmp_lumen_coats'), PermissionError)
})

test('organizations are isolated: an admin of one cannot open or change another', () => {
  as(U.lumenAdmin)
  const user = currentUser()
  assert.equal(can(user, 'workspace.view', { organizationId: 'org_lumen' }), true)
  assert.equal(can(user, 'workspace.view', { organizationId: 'org_maple' }), false)
  assert.throws(() => saveOrganizationAs('org.manageWebsite', { ...org('org_maple'), tagline: 'Taken over' }), PermissionError)
  assert.throws(() => saveCampaignFields('cmp_maple_lab', { description: 'Changed by another organization admin.' }), PermissionError)
  assert.throws(() => addMember('org_maple', U.supporter, 'org_admin'), PermissionError)
  assert.notEqual(org('org_maple').tagline, 'Taken over')
})

test('organizers act only on explicitly assigned campaigns and cannot manage the organization', () => {
  as(U.lumenOrganizer)
  const user = currentUser()
  const lumen = org('org_lumen')
  const visible = visibleCampaigns(user, 'org_lumen', loadStore().campaigns).map((campaign) => campaign.id)
  assert.deepEqual(visible, ['cmp_lumen_coats'])
  saveCampaignFields('cmp_lumen_coats', { description: 'Updated description from the assigned organizer.' })
  assert.equal(getCampaign('cmp_lumen_coats')!.description, 'Updated description from the assigned organizer.')
  assert.throws(() => saveCampaignFields('cmp_lumen_laptops', { description: 'Not assigned to this organizer.' }), PermissionError)
  assert.throws(
    () => saveMilestone({ id: 'ms_x', campaignId: 'cmp_lumen_laptops', title: 'x', description: '', dueDate: inDays(5), status: 'planned', progressNote: '', order: 9, createdAt: '', updatedAt: '' }),
    PermissionError,
  )
  assert.throws(() => saveOrganizationAs('org.manageWebsite', { ...lumen, tagline: 'Organizer edit' }), PermissionError)
  assert.throws(() => saveOrganizationAs('org.manageFeatures', { ...lumen, features: { ...lumen.features, shareKit: false } }), PermissionError)
  assert.throws(() => saveOrganizationAs('org.managePlan', { ...lumen, plan: { id: 'starter', selectedAt: '' } }), PermissionError)
  assert.throws(() => addMember('org_lumen', U.supporter, 'campaign_organizer'), PermissionError)
  assert.throws(() => closeCampaign('cmp_lumen_coats'), PermissionError)
  assert.throws(() => exportOrganizationRecords(lumen), PermissionError)
  assert.equal(can(user, 'campaign.review', { organization: lumen }), false)
})

test('a new campaign by an organizer joins their scope; without review policy they may publish it', () => {
  as(U.mapleOrganizer)
  const maple = org('org_maple')
  const form = { ...blankForm(maple), title: 'Library corner', description: 'A reading corner for the youngest pupils at Maple.' }
  const campaign = formCampaignForOrg(form, maple, { isDraft: false })
  assert.equal(publishWithPolicy(campaign).mode, 'published')
  assert.equal(getCampaign(campaign.id)!.createdBy, U.mapleOrganizer)
  assert.ok(identity.membership(U.mapleOrganizer, 'org_maple')!.campaignIds.includes(campaign.id))
})

test('review: organizer submits, live version stays public, organizer cannot approve, another admin approves only that revision', () => {
  enableReview()
  const before = getCampaign('cmp_lumen_coats')!.description
  as(U.lumenOrganizer)
  assert.equal(saveCampaignFields('cmp_lumen_coats', { description: 'Proposed new description that needs review first.' }).pendingReview, true)
  const pending = getCampaign('cmp_lumen_coats')!
  assert.equal(pending.description, before, 'the last published version stays public during review')
  const firstRevision = pending.pendingRevision!.id
  assert.throws(() => reviewRevision('cmp_lumen_coats', firstRevision, 'approve'), PermissionError)

  // A material change creates a new revision; approving the old one is refused.
  saveCampaignFields('cmp_lumen_coats', { description: 'A second proposal that replaces the first one entirely.' })
  const secondRevision = getCampaign('cmp_lumen_coats')!.pendingRevision!.id
  assert.notEqual(secondRevision, firstRevision)
  as(U.lumenAdmin)
  assert.throws(() => reviewRevision('cmp_lumen_coats', firstRevision, 'approve'), /no longer waiting/)
  const approved = reviewRevision('cmp_lumen_coats', secondRevision, 'approve')
  assert.equal(approved.description, 'A second proposal that replaces the first one entirely.')
  assert.equal(approved.approvedRevisionId, secondRevision)
  assert.equal(approved.pendingRevision, undefined)

  // Approval does not carry over: the next material change needs review again.
  as(U.lumenOrganizer)
  assert.equal(saveCampaignFields('cmp_lumen_coats', { description: 'Yet another change after approval, needs review.' }).pendingReview, true)
})

test('admins cannot approve their own revision; another admin can', () => {
  enableReview()
  as(U.lumenAdmin)
  const existing = getCampaign('cmp_lumen_laptops')!
  const lumen = org('org_lumen')
  const edited = formCampaignForOrg({ ...campaignToForm(existing), title: 'Laptops for the coding club' }, lumen, { isDraft: false, existing })
  const result = publishWithPolicy(edited)
  assert.equal(result.mode, 'pending_review')
  assert.equal(result.reviewerAvailable, true)
  const revision = getCampaign('cmp_lumen_laptops')!.pendingRevision!.id
  assert.equal(getCampaign('cmp_lumen_laptops')!.title, existing.title)
  assert.throws(() => reviewRevision('cmp_lumen_laptops', revision, 'approve'), /own revision/)
  as(U.lumenAdmin2)
  assert.equal(reviewRevision('cmp_lumen_laptops', revision, 'approve').title, 'Laptops for the coding club')
})

test('with no eligible reviewer the revision stays pending and is never silently approved', () => {
  as(null)
  const created = createOrganization('organization')
  const admin = currentUser()!
  saveOrganizationAs('org.manageFeatures', { ...created, website: { status: 'published', publishedAt: inDays(0), updatedAt: inDays(0) }, features: { ...created.features, reviewApproval: true } })
  const solo = org(created.id)
  const campaign = formCampaignForOrg({ ...blankForm(solo), title: 'Solo admin drive', description: 'Only one admin exists in this organization.' }, solo, { isDraft: false })
  const result = publishWithPolicy(campaign)
  assert.equal(result.mode, 'pending_review')
  assert.equal(result.reviewerAvailable, false)
  assert.equal(getCampaign(campaign.id)!.isDraft, true)
  assert.throws(() => reviewRevision(campaign.id, getCampaign(campaign.id)!.pendingRevision!.id, 'approve'), /own revision/)
  assert.equal(admin.id, identity.orgAdmins(created.id)[0])
})

test('nobody can change their own role, and the last Organization Admin cannot be removed', () => {
  as(U.mapleAdmin)
  assert.throws(() => updateMember('org_maple', U.mapleAdmin, { role: 'campaign_organizer' }), /own role/)
  assert.throws(() => removeMember('org_maple', U.mapleAdmin), /own role/)
  addMember('org_maple', U.supporter, 'org_admin')
  as(U.supporter)
  removeMember('org_maple', U.mapleAdmin)
  assert.throws(() => removeMember('org_maple', U.supporter), /own role/)
  as(U.mapleOrganizer)
  assert.throws(() => updateMember('org_maple', U.mapleOrganizer, { role: 'org_admin' }), PermissionError)
  assert.deepEqual(identity.orgAdmins('org_maple'), [U.supporter])
})

test('removing or demoting the only admin is refused', () => {
  as(U.harbourAdmin)
  addMember('org_harbour', U.supporter, 'campaign_organizer')
  as(U.supporter)
  assert.throws(() => updateMember('org_harbour', U.harbourAdmin, {}), PermissionError)
  as(U.harbourAdmin)
  assert.equal(identity.orgAdmins('org_harbour').length, 1)
})

test('merchants see and redeem only at assigned stores and branches, without organization or supporter records', () => {
  as(U.lumenAdmin)
  let lumen = org('org_lumen')
  lumen = saveOrganizationAs('org.manageFeatures', { ...lumen, features: { ...lumen.features, partnerVouchers: true }, voucherSettings: { contributionRewards: false, storeValueVouchers: true, onlineOffers: false } })
  const merchant = v.addMerchant(lumen, { name: 'Corner Books', description: '', location: 'Old Town' })
  const second = v.addMerchantBranch(lumen, merchant.id, 'Harbour Road')
  const offer = v.createOffer(lumen, {
    merchantId: merchant.id,
    capability: 'storeValueVouchers',
    title: 'Book credit',
    terms: 'Use within the validity period. No cash back.',
    currency: lumen.defaults.currency,
    validUntil: inDays(30),
    stock: null,
    price: 500,
    storeValue: 500,
    campaignShare: 100,
  })
  v.markTermsReviewed(lumen, offer.id)
  v.activateOffer(lumen, offer.id)
  v.assignOfferToCampaign(lumen, offer.id, 'cmp_lumen_coats', true)
  const mainBranch = merchant.branches[0].id
  grantMerchantAccess('org_lumen', merchant.id, U.merchant, [mainBranch])
  assert.throws(() => grantMerchantAccess('org_lumen', merchant.id, U.lumenAdmin, 'all'), /own role/)

  as(U.supporter)
  const voucher = v.purchaseStoreValue(org('org_lumen'), offer.id, 'cmp_lumen_coats')

  as(U.merchant)
  const found = v.merchantLookupVoucher(voucher.code)!
  assert.equal(found.code, voucher.code)
  assert.equal('holderId' in found, false)
  assert.equal('campaignId' in found, false)
  assert.throws(() => v.merchantRedeem(voucher.code, second.id, 50), PermissionError)
  assert.equal(v.merchantRedeem(voucher.code, mainBranch, 50).balance, 450)
  assert.equal(v.merchantRedemptionHistory().length, 1)
  assert.throws(() => v.redeemVoucher(org('org_lumen'), voucher.id, 10), PermissionError)
  assert.equal(can(currentUser(), 'workspace.view', { organizationId: 'org_lumen' }), false)

  as(U.supporter)
  assert.throws(() => v.merchantLookupVoucher(voucher.code), PermissionError)
})

test('supporters only reach their own receipts, vouchers and sharing pages', () => {
  as(U.supporter)
  const mine = currentSupporterId()
  const contribution = addContribution({ id: crypto.randomUUID(), campaignId: 'cmp_maple_lab', amount: 100, method: 'direct' })
  assert.equal(contribution.supporterId, mine)
  const page = createReferral('cmp_maple_lab', { displayName: 'Asha', headline: 'Help the lab', message: 'I support this because it matters to me.', personalTarget: '' } as never)
  assert.equal(isMyReferral(page.id), true)

  as(null)
  assert.notEqual(currentSupporterId(), mine)
  assert.equal(isMyReferral(page.id), false)
  assert.throws(() => updateReferral(page.id, { displayName: 'Someone else', headline: 'x', message: 'Edited by another visitor here.', personalTarget: '' } as never), PermissionError)

  as(U.mapleAdmin)
  assert.equal(isMyReferral(page.id), false)
})

test('drafts belong to their author; other organizers cannot open them', () => {
  as(U.lumenAdmin)
  addMember('org_lumen', U.supporter, 'campaign_organizer')
  as(U.lumenOrganizer)
  const draft = saveDraft({ id: newDraftId(), organizationId: 'org_lumen', kind: 'form', form: { ...blankForm(org('org_lumen')), title: 'Nina draft' }, step: '1' })
  as(U.supporter)
  assert.equal(readDraft(draft.id, 'org_lumen'), null)
  assert.equal(listDrafts('org_lumen').length, 0)
  assert.throws(() => saveDraft({ ...draft, form: { ...draft.form, title: 'Hijacked' } }), /another organizer/)
  as(U.lumenAdmin)
  assert.equal(readDraft(draft.id, 'org_lumen')?.form.title, 'Nina draft')
  as(U.mapleAdmin)
  assert.equal(readDraft(draft.id, 'org_lumen'), null)
})

test('platform admin manages plans and availability but gets no organization workspace or records', () => {
  as(U.lumenAdmin)
  assert.throws(() => setPlatformFeatureAvailability('shareKit', false), PermissionError)
  assert.throws(() => platformSetPlan('org_maple', 'starter'), PermissionError)
  as(U.platformAdmin)
  const user = currentUser()
  assert.equal(can(user, 'workspace.view', { organizationId: 'org_lumen' }), false)
  assert.throws(() => exportOrganizationRecords(org('org_lumen')), PermissionError)
  setPlatformFeatureAvailability('shareKit', false)
  assert.equal(canUseFeature(org('org_maple'), 'shareKit'), false)
  assert.equal(org('org_maple').features.shareKit, true, 'organization selection is preserved')
  setPlatformFeatureAvailability('shareKit', true)
  assert.equal(canUseFeature(org('org_maple'), 'shareKit'), true)
  platformSetPlan('org_maple', 'starter')
  assert.equal(org('org_maple').plan.id, 'starter')
})

test('important actions are recorded with the acting identity and a timestamp', () => {
  enableReview()
  as(U.lumenOrganizer)
  saveCampaignFields('cmp_lumen_coats', { description: 'A change that should appear in the audit log.' })
  const entry = identity.auditFor('org_lumen').find((item) => item.action === 'campaign.revision.submitted')!
  assert.equal(entry.actorId, U.lumenOrganizer)
  assert.ok(!Number.isNaN(Date.parse(entry.at)))
})

test('migration: organizations saved before roles get one admin; legacy pending reviews need a real reviewer', () => {
  as(null)
  const created = createOrganization('community')
  local.removeItem(identity.IDENTITY_KEY)
  loadOrganizations()
  const admins = identity.orgAdmins(created.id)
  assert.equal(admins.length, 1)
  assert.equal(identity.orgMembers(created.id).length, 1, 'no organizer or other access is inferred')

  as(U.lumenAdmin)
  const store = loadStore()
  const campaign = store.campaigns.find((item) => item.id === 'cmp_lumen_trees')!
  campaign.isDraft = true
  campaign.approvalStatus = 'pending_review'
  delete campaign.pendingRevision
  saveStore(store)
  const migrated = getCampaign('cmp_lumen_trees')!
  assert.equal(migrated.pendingRevision?.authorId, 'legacy')
  assert.equal(reviewRevision('cmp_lumen_trees', migrated.pendingRevision!.id, 'approve').isDraft, false)
})

test('a new organization gets only its creator as admin, even when change listeners reload organizations', async () => {
  const { subscribe } = await import('../src/lib/storage.ts')
  loadOrganizations()
  const stop = subscribe(() => loadOrganizations())
  try {
    const user = identity.createDemoUser('Grace Mensah')
    switchIdentity(user.id)
    const created = createOrganization('organization')
    loadOrganizations()
    const members = identity.orgMembers(created.id)
    assert.deepEqual(members.map((item) => item.userId), [user.id])
    assert.equal(identity.listUsers().some((item) => item.name.startsWith('Admin ·')), false)
  } finally {
    stop()
  }
})
