import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextWarmthAction, warmthTotal, type WarmthActionId } from '../src/lib/warmth.ts'

test('warmth actions add $50, $50 and $25 once each', () => {
  const done: WarmthActionId[] = []
  assert.equal(nextWarmthAction(done), 'lining')
  assert.equal(warmthTotal(done), 0)
  done.push('lining')
  assert.equal(warmthTotal(done), 5000)
  assert.equal(nextWarmthAction(done), 'zip')
  done.push('zip', 'tag')
  assert.equal(warmthTotal(done), 12500)
  assert.equal(nextWarmthAction(done), null)
  done.push('zip')
  assert.equal(warmthTotal(done), 12500)
})
