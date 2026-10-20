import assert from 'node:assert/strict'
import { test } from 'node:test'
import { goalReached } from '../src/lib/campaigns.ts'

test('a campaign reaches its target only when confirmed money covers the goal', () => {
  assert.equal(goalReached(18499, 50000), false)
  assert.equal(goalReached(50000, 50000), true)
  assert.equal(goalReached(50100, 50000), true)
  assert.equal(goalReached(100, 0), false)
  assert.equal(goalReached(Number.NaN, 50000), false)
})
