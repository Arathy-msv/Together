import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ASSISTANT_STEPS, STEP_GROUP } from '../src/lib/assistant.ts'
import { blankForm, CAMPAIGN_GROUPS, requiredChecklist, validateSettings } from '../src/lib/wizard.ts'

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

test('assistant questions and form steps share the same two groups', () => {
  assert.deepEqual(CAMPAIGN_GROUPS.map((group) => group.label), ['What and goal', 'Review and publish'])
  for (const step of ASSISTANT_STEPS) assert.ok([1, 2].includes(STEP_GROUP[step]), step)
  const groupOf = Object.fromEntries(requiredChecklist(blankForm()).map((item) => [item.id, item.step]))
  assert.equal(groupOf.title, 1)
  assert.equal(groupOf.description, 1)
  assert.equal(groupOf.goalAmount, 1)
  assert.equal(groupOf.dates, 1)
  assert.equal(groupOf.participation, 1)
  assert.ok(requiredChecklist(blankForm()).every((item) => item.step === 1))
})

test('a blank form is ready except for title and description', () => {
  const missing = requiredChecklist(blankForm()).filter((item) => !item.done).map((item) => item.id)
  assert.deepEqual(missing.sort(), ['description', 'title'].sort())
})
