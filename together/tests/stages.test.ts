import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clampToNextStage, evenBoundaries, settledProgress } from '../src/lib/stages.ts'

const zip = evenBoundaries(4)

test('zip stages sit at 25%, 50%, 75% and 100%', () => {
  assert.deepEqual(zip, [0.25, 0.5, 0.75, 1])
})

test('one fast drag stops at the next uncompleted checkpoint', () => {
  assert.deepEqual(clampToNextStage(0.95, 0, zip), { progress: 0.25, reached: true })
  assert.deepEqual(clampToNextStage(0.95, 1, zip), { progress: 0.5, reached: true })
})

test('moving back across a completed stage never completes it again', () => {
  const back = clampToNextStage(0.1, 2, zip)
  assert.equal(back.reached, false)
  assert.equal(back.progress, 0.1)
  const forward = clampToNextStage(0.6, 2, zip)
  assert.equal(forward.reached, false)
  assert.equal(forward.progress, 0.6)
})

test('partial travel short of the next checkpoint completes nothing', () => {
  assert.deepEqual(clampToNextStage(0.2, 0, zip), { progress: 0.2, reached: false })
})

test('a finished round accepts no more stages', () => {
  assert.equal(clampToNextStage(2, 4, zip).reached, false)
})

test('restored progress resumes at the last completed checkpoint', () => {
  assert.equal(settledProgress(0, zip), 0)
  assert.equal(settledProgress(3, zip), 0.75)
})
