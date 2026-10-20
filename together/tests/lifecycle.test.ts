import test from 'node:test'
import assert from 'node:assert/strict'
import { deliveryState, fundraisingState, isFunded, publicationState, revisionState } from '../src/lib/lifecycle.ts'
import type { Campaign, CampaignStatus } from '../src/lib/types.ts'

const base = { goalAmount: 1000, isDraft: false } as Campaign
const view = (status: CampaignStatus, raised = 0, campaign: Campaign = base) => ({ status, raised, campaign })

test('fundraising labels come from the stored status and the goal, never from delivery', () => {
  assert.equal(fundraisingState(view('scheduled')), 'opens_soon')
  assert.equal(fundraisingState(view('active', 200)), 'accepting')
  assert.equal(fundraisingState(view('active', 1000)), 'goal_reached')
  assert.equal(fundraisingState(view('completed', 1200)), 'goal_reached')
  assert.equal(fundraisingState(view('closed', 300)), 'closed')
  assert.equal(fundraisingState(view('approved')), 'not_public')
  assert.equal(isFunded(view('completed', 1200)), true)
  assert.equal(isFunded(view('closed', 300)), false)
})

test('delivery is complete only when the organizer reports every activity complete', () => {
  assert.equal(deliveryState([]), 'not_started')
  assert.equal(deliveryState([{ status: 'planned' }]), 'not_started')
  assert.equal(deliveryState([{ status: 'planned' }, { status: 'in_progress' }]), 'in_progress')
  assert.equal(deliveryState([{ status: 'reported_complete' }, { status: 'planned' }]), 'in_progress')
  assert.equal(deliveryState([{ status: 'reported_complete' }, { status: 'reported_complete' }]), 'reported_complete')
})

test('publication state separates a draft, its review, and a live campaign with proposed changes', () => {
  const revision = (status: 'pending' | 'approved' | 'rejected') => ({ id: 'r', status }) as Campaign['pendingRevision']
  assert.equal(publicationState({ ...base, isDraft: true }), 'draft')
  assert.equal(publicationState({ ...base, isDraft: true, pendingRevision: revision('pending') }), 'submitted')
  assert.equal(publicationState({ ...base, isDraft: true, pendingRevision: revision('approved') }), 'approved')
  assert.equal(publicationState({ ...base, isDraft: true, pendingRevision: revision('rejected') }), 'changes_requested')
  const live = { ...base, pendingRevision: revision('approved') }
  assert.equal(publicationState(live), 'published')
  assert.equal(revisionState(live), 'approved')
  assert.equal(revisionState(base), null)
})
