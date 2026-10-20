import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blankForm, validateSettings } from '../src/lib/wizard.ts'

test('Community Puzzle cannot be published without an uploaded image', () => {
  const form = { ...blankForm(), game: true, gameType: 'puzzle' as const }
  const missing = validateSettings(form)
  assert.match(missing.puzzleImageData ?? '', /Upload an image/)

  const ready = validateSettings({ ...form, puzzleImageData: 'data:image/jpeg;base64,abc' })
  assert.equal(ready.puzzleImageData, undefined)
})

test('other games do not ask for a puzzle image', () => {
  assert.equal(validateSettings(blankForm()).puzzleImageData, undefined)
  assert.equal(validateSettings({ ...blankForm(), gameType: 'jacket' }).puzzleImageData, undefined)
})

test('assistant questions and form steps share the same four groups', async () => {
  const { ASSISTANT_STEPS, STEP_GROUP } = await import('../src/lib/assistant.ts')
  const { CAMPAIGN_GROUPS, requiredChecklist } = await import('../src/lib/wizard.ts')
  assert.deepEqual(CAMPAIGN_GROUPS.map((group) => group.label), ['Your cause', 'Goal and dates', 'Ways to contribute', 'Review'])
  for (const step of ASSISTANT_STEPS) assert.ok([1, 2, 3].includes(STEP_GROUP[step]), step)
  const groupOf = Object.fromEntries(requiredChecklist(blankForm()).map((item) => [item.id, item.step]))
  assert.equal(STEP_GROUP.title, groupOf.title)
  assert.equal(STEP_GROUP.purpose, groupOf.description)
  assert.equal(STEP_GROUP.cover, groupOf.coverImageId)
  assert.equal(STEP_GROUP.goal, groupOf.goalAmount)
  assert.equal(STEP_GROUP.dates, groupOf.dates)
  assert.equal(STEP_GROUP.participation, groupOf.participation)
})
