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
