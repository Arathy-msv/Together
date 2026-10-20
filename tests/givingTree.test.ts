import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { formatPaise } from '../src/lib/gameContribution.ts'
import {
  campaignPercent,
  canCare,
  cartLines,
  chooseAmount,
  chosenAmountPaise,
  clearCart,
  confirmCart,
  formatPercent,
  newGivingTree,
  nextActionId,
  parseGiftAmount,
  parseGivingTree,
  plantStage,
  recommendedCare,
  recordCare,
  suggestedPaise,
  treeStage,
  visibleTreeStage,
  type CareKind,
  type GivingTreeState,
} from '../src/lib/givingTree.ts'

let counter = 0
const makeId = () => `id-${++counter}`
const now = new Date('2026-10-20T10:00:00Z')

function care(state: GivingTreeState, kind: CareKind) {
  return recordCare(state, kind, nextActionId(state, kind), now).state
}

describe('example care sequence', () => {
  test('matches the written cart and points rules', () => {
    let state = newGivingTree('cmp_library', makeId)
    const expected: Array<[CareKind, number, number]> = [
      ['seed', 25, 10],
      ['water', 75, 30],
      ['fertilizer', 150, 60],
      ['sun', 175, 70],
      ['water', 225, 90],
    ]
    for (const [kind, rupees, points] of expected) {
      assert.equal(recommendedCare(state), kind)
      state = care(state, kind)
      assert.equal(suggestedPaise(state), rupees * 100)
      assert.equal(state.carePoints, points)
    }
    assert.deepEqual(
      cartLines(state).map((line) => [line.item, line.quantity, line.totalPaise / 100]),
      [
        ['Plant seed', 1, 25],
        ['Water', 2, 100],
        ['Fertilizer', 1, 75],
        ['Sunlight', 1, 25],
      ],
    )
    assert.equal(formatPaise(suggestedPaise(state)), '₹225')
  })

  test('a chosen final amount is kept separately from the suggestion', () => {
    let state = newGivingTree('cmp_library', makeId)
    for (const kind of ['seed', 'water', 'fertilizer', 'sun', 'water'] as CareKind[]) state = care(state, kind)
    state = chooseAmount(state, 100 * 100)
    assert.equal(suggestedPaise(state), 22500)
    assert.equal(chosenAmountPaise(state), 10000)
    assert.equal(state.carePoints, 90)
  })

  test('confirming resets the cart but keeps care points', () => {
    let state = newGivingTree('cmp_library', makeId)
    for (const kind of ['seed', 'water', 'fertilizer', 'sun', 'water'] as CareKind[]) state = care(state, kind)
    state = chooseAmount(state, 10000)
    const contributionId = state.checkoutId
    const confirmed = confirmCart(state, contributionId, 10000, now, makeId)
    assert.equal(suggestedPaise(confirmed), 0)
    assert.equal(confirmed.chosenPaise, null)
    assert.equal(confirmed.carePoints, 90)
    assert.notEqual(confirmed.checkoutId, contributionId)
    assert.deepEqual(confirmed.lastConfirmed?.amountPaise, 10000)
    assert.equal(confirmed.lastConfirmed?.suggestedPaise, 22500)
    assert.equal(confirmCart(confirmed, contributionId, 10000, now, makeId), confirmed, 'confirming twice is ignored')
  })
})

describe('deduplication and order', () => {
  test('repeating an action ID is ignored', () => {
    let state = newGivingTree('c', makeId)
    const id = nextActionId(state, 'seed')
    state = recordCare(state, 'seed', id, now).state
    const again = recordCare(state, 'seed', id, now)
    assert.equal(again.outcome, 'duplicate')
    assert.equal(suggestedPaise(again.state), 2500)
  })

  test('seed must come first and only once', () => {
    let state = newGivingTree('c', makeId)
    assert.equal(canCare(state, 'water'), false)
    assert.equal(recordCare(state, 'water', 'x', now).outcome, 'blocked')
    state = care(state, 'seed')
    assert.equal(canCare(state, 'seed'), false)
    assert.equal(canCare(state, 'water'), true)
  })

  test('settled and cleared actions can never be re-added', () => {
    let state = newGivingTree('c', makeId)
    const seedId = nextActionId(state, 'seed')
    state = recordCare(state, 'seed', seedId, now).state
    state = clearCart(state, makeId)
    assert.equal(suggestedPaise(state), 0)
    assert.equal(state.carePoints, 10)
    assert.equal(recordCare(state, 'seed', seedId, now).outcome, 'duplicate')
  })
})

describe('shared campaign growth', () => {
  test('percent keeps one decimal place', () => {
    assert.equal(formatPercent(campaignPercent(18500, 50000)), '37%')
    assert.equal(formatPercent(campaignPercent(18600, 50000)), '37.2%')
    assert.equal(campaignPercent(49999, 50000), 99.9)
  })

  test('tree stage follows confirmed money milestones', () => {
    assert.equal(treeStage(0, 50000), 0)
    assert.equal(treeStage(10000, 50000), 1)
    assert.equal(treeStage(18500, 50000), 1)
    assert.equal(treeStage(18600, 50000), 1)
    assert.equal(treeStage(20000, 50000), 2)
    assert.equal(treeStage(30000, 50000), 3)
    assert.equal(treeStage(40000, 50000), 4)
    assert.equal(treeStage(50000, 50000), 5)
  })

  test('care grows the one tree, and the goal finishes it', () => {
    const bare = { seedPlanted: false, carePoints: 0 }
    assert.equal(visibleTreeStage(0, bare, false), 0)
    assert.equal(visibleTreeStage(1, bare, false), 1)
    assert.equal(visibleTreeStage(0, { seedPlanted: true, carePoints: 10 }, false), 1)
    assert.equal(visibleTreeStage(0, { seedPlanted: true, carePoints: 30 }, false), 2)
    assert.equal(visibleTreeStage(0, { seedPlanted: true, carePoints: 60 }, false), 3)
    assert.equal(visibleTreeStage(0, { seedPlanted: true, carePoints: 70 }, false), 4)
    assert.equal(visibleTreeStage(0, { seedPlanted: true, carePoints: 90 }, false), 4)
    assert.equal(visibleTreeStage(3, { seedPlanted: true, carePoints: 10 }, false), 3)
    assert.equal(visibleTreeStage(1, { seedPlanted: true, carePoints: 90 }, true), 5)
  })

  test('personal plant grows with care points', () => {
    assert.equal(plantStage({ seedPlanted: false, carePoints: 0 }), -1)
    assert.equal(plantStage({ seedPlanted: true, carePoints: 10 }), 1)
    assert.equal(plantStage({ seedPlanted: true, carePoints: 30 }), 2)
    assert.equal(plantStage({ seedPlanted: true, carePoints: 70 }), 3)
    assert.equal(plantStage({ seedPlanted: true, carePoints: 90 }), 4)
  })
})

describe('amount input and storage', () => {
  test('accepts whole rupees only', () => {
    assert.equal(parseGiftAmount('₹100').paise, 10000)
    assert.equal(parseGiftAmount('1,000').paise, 100000)
    assert.ok(parseGiftAmount('0').error)
    assert.ok(parseGiftAmount('10.5').error)
    assert.ok(parseGiftAmount('').error)
  })

  test('stored state round-trips and rejects other campaigns', () => {
    let state = newGivingTree('cmp_library', makeId)
    state = care(state, 'seed')
    const restored = parseGivingTree(JSON.parse(JSON.stringify(state)), 'cmp_library')
    assert.deepEqual(restored, state)
    assert.equal(parseGivingTree(state, 'other'), null)
    assert.equal(parseGivingTree({ junk: true }, 'cmp_library'), null)
  })
})
