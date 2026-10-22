import assert from 'node:assert/strict'
import { test } from 'node:test'
import { availableDemoOrg, daysFromToday, demoSelectFor, demoShouldCheck, demoTextFor, type DemoContext } from '../src/lib/demoFill.ts'

function ctx(patch: Partial<DemoContext> = {}): DemoContext {
  return {
    id: '',
    label: '',
    aria: '',
    placeholder: '',
    type: 'text',
    pathname: '/',
    section: '',
    nearbyTitle: '',
    inStoreForm: false,
    memberNames: [],
    identityNames: [],
    takenSlugs: [],
    fieldValue: '',
    ...patch,
  }
}

test('sales dates are calendar days from today', () => {
  assert.equal(daysFromToday(7, new Date(2026, 9, 22)), '2026-10-29')
  assert.equal(daysFromToday(0, new Date(2026, 9, 22)), '2026-10-22')
})

test('a later demo uses the next free Greenwood address', () => {
  assert.deepEqual(availableDemoOrg([]), { name: 'Greenwood School', slug: 'greenwood-school' })
  assert.deepEqual(availableDemoOrg(['greenwood-school']), { name: 'Greenwood School 2', slug: 'greenwood-school-2' })
  assert.deepEqual(availableDemoOrg(['greenwood-school', 'greenwood-school-2']), { name: 'Greenwood School 3', slug: 'greenwood-school-3' })
  assert.equal(demoTextFor(ctx({ label: 'Organization name', takenSlugs: ['greenwood-school'] }))?.value, 'Greenwood School 2')
  assert.deepEqual(
    demoTextFor(ctx({ label: 'Organization name', fieldValue: 'Greenwood School', takenSlugs: ['greenwood-school'] })),
    { value: 'Greenwood School 2', overwrite: true },
  )
  assert.equal(demoTextFor(ctx({ label: 'Organization name', fieldValue: 'Greenwood School 2', takenSlugs: ['greenwood-school'] })), null)
  assert.equal(demoTextFor(ctx({ label: 'Website address', fieldValue: 'new-abc123', takenSlugs: ['greenwood-school'] }))?.value, 'greenwood-school-2')
  assert.equal(demoTextFor(ctx({ label: 'Website address', fieldValue: 'greenwood-school', takenSlugs: ['greenwood-school'] }))?.value, 'greenwood-school-2')
  assert.equal(demoTextFor(ctx({ label: 'Website address', fieldValue: 'greenwood-school-2', takenSlugs: ['greenwood-school'] })), null)
  assert.equal(demoTextFor(ctx({ label: 'Homepage headline', takenSlugs: ['greenwood-school'] }))?.value, 'Help Greenwood School 2 stock every classroom')
})

test('organization setup fields use the Greenwood sales values', () => {
  assert.equal(demoTextFor(ctx({ label: 'Organization name' }))?.value, 'Greenwood School')
  assert.equal(demoTextFor(ctx({ label: 'Public contact email' }))?.value, 'office@greenwood.example')
  assert.equal(demoTextFor(ctx({ label: 'Short description', pathname: '/start/org_1' }))?.value.includes('420 pupils'), true)
  assert.equal(demoTextFor(ctx({ label: 'Short description', pathname: '/workspace/org/offers', inStoreForm: true }))?.value, 'Family-run stationery and art supplies shop near the school gates.')
  assert.equal(demoTextFor(ctx({ aria: 'Main colour hex value' }))?.value, '#1F5A3D')
  assert.equal(demoTextFor(ctx({ aria: 'Main colour hex value' }))?.overwrite, true)
  assert.equal(demoTextFor(ctx({ aria: 'Accent colour hex value' })), null)
})

test('campaign, sponsor, supporter, and merchant fields use the sales script', () => {
  assert.equal(demoTextFor(ctx({ id: 'a-purpose' }))?.value.includes('$60,000'), true)
  assert.equal(demoTextFor(ctx({ id: 'a-title' }))?.value, 'School supplies for every Greenwood pupil')
  assert.equal(demoTextFor(ctx({ id: 'a-goal' }))?.value, '60000')
  assert.equal(demoTextFor(ctx({ label: 'Sponsor name' }))?.value, 'Northwind Stationery (fictional)')
  assert.equal(demoTextFor(ctx({ label: 'Pledged budget' }))?.value, '5000')
  assert.equal(demoTextFor(ctx({ label: 'Your final amount' }))?.value, '200')
  assert.equal(demoTextFor(ctx({ id: 'custom-amount', label: 'Enter an amount' }))?.value, '500')
  assert.equal(demoTextFor(ctx({ id: 'voucher-code' }))?.value, 'GGL-0000-0000')
  assert.equal(demoTextFor(ctx({ label: 'Your display name' }))?.value, 'Mia Patel')
  assert.equal(demoTextFor(ctx({ label: 'My sharing goal' }))?.value, '5000')
})

test('expense and milestone notes follow the field they belong to', () => {
  assert.equal(demoTextFor(ctx({ label: 'Description', section: 'New expense' }))?.value.includes('first order'), true)
  assert.equal(demoTextFor(ctx({ label: 'Amount ($)', section: 'New expense' }))?.value, '18400')
  assert.equal(demoTextFor(ctx({ label: 'Description', section: 'Edit milestone' })), null)
  assert.equal(demoTextFor(ctx({ label: 'Progress note', nearbyTitle: 'Purchase materials', section: 'Edit milestone' }))?.value.includes('on order'), true)
  assert.equal(demoTextFor(ctx({ label: 'Progress note', nearbyTitle: 'Confirm needs with the school' }))?.value.includes('supply list'), true)
  assert.equal(demoTextFor(ctx({ aria: 'Milestone 2 title' }))?.value, 'Purchase materials')
  assert.equal(demoTextFor(ctx({ label: 'Note for the author' }))?.value.startsWith('Approved.'), true)
  assert.equal(demoTextFor(ctx({ aria: 'Remove milestone 1' })), null)
})

test('member and identity choices follow who is not on the page yet', () => {
  assert.equal(demoTextFor(ctx({ id: 'new-identity', identityNames: ['Grace Mensah'] }))?.value, 'Daniel Brooks')
  assert.equal(demoTextFor(ctx({ id: 'new-identity', identityNames: ['Grace Mensah', 'Daniel Brooks', 'Olivia Chen', 'Leo Martins', 'Mia Patel', 'Ben Okoro'] })), null)
  assert.deepEqual(demoSelectFor(ctx({ label: 'Role', pathname: '/workspace/org/members', memberNames: [] })), { queries: ['Organization Admin'], overwrite: true })
  assert.deepEqual(demoSelectFor(ctx({ label: 'Role', memberNames: ['Daniel Brooks'] })), { queries: ['Campaign Organizer'], overwrite: true })
  assert.equal(demoSelectFor(ctx({ label: 'Role', memberNames: ['Daniel Brooks', 'Olivia Chen'] })), null)
  assert.deepEqual(demoSelectFor(ctx({ id: 'staff-store', label: 'Demo identity' })), { queries: ['Leo Martins'], overwrite: false })
})

test('scripted switches turn on the Greenwood features and leave attestations alone', () => {
  assert.equal(demoShouldCheck(ctx({ id: 'feature-sponsorPlay', type: 'checkbox' })), true)
  assert.equal(demoShouldCheck(ctx({ id: 'feature-shareKit', type: 'checkbox' })), true)
  assert.equal(demoShouldCheck(ctx({ label: 'Choose individually', type: 'radio' })), true)
  assert.equal(demoShouldCheck(ctx({ label: 'Give directly Choose an amount, review it, then confirm.', type: 'radio' })), true)
  assert.equal(demoShouldCheck(ctx({ label: 'I have permission to publish these images', type: 'checkbox' })), null)
})
