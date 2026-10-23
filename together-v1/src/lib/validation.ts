import { parseRupeesToPaise } from './gameContribution.ts'
import { fromDateInput } from './inputs.ts'
import type { MediaItem, MediaVideo } from './types.ts'

/* Organizer form validation. Publishing is stricter than saving a draft. */

export type Errors = Record<string, string>

export function validateUpdate(
  draft: { title: string; date: string; body: string; media: MediaItem[]; video?: MediaVideo; mediaConsent: boolean },
  publish: boolean,
): Errors {
  const errors: Errors = {}
  if (draft.title.trim().length < 3) errors.title = 'Add a title of at least 3 characters.'
  if (!fromDateInput(draft.date)) errors.date = 'Choose a date.'
  if (publish && draft.body.trim().length < 10) errors.body = 'Write at least a sentence before publishing.'
  if (draft.media.some((item) => !item.alt.trim())) errors.media = 'Add alt text to every image so screen-reader users get the same information.'
  if (publish && (draft.media.length > 0 || draft.video) && !draft.mediaConsent) {
    errors.mediaConsent = 'Confirm you have permission to publish these images or video.'
  }
  return errors
}

export function validateExpense(
  draft: { description: string; amount: string; date: string; publicReceipt?: string; receiptRedacted: boolean },
  publish: boolean,
): Errors {
  const errors: Errors = {}
  if (draft.description.trim().length < 3) errors.description = 'Describe what was bought or paid for.'
  const amount = parseRupeesToPaise(draft.amount)
  if (amount == null) errors.amount = 'Enter an amount greater than zero, like 1250 or 1250.50.'
  if (!fromDateInput(draft.date)) errors.date = 'Choose the expense date.'
  if (publish && draft.publicReceipt && !draft.receiptRedacted) {
    errors.receiptRedacted = 'Confirm the public receipt has names, addresses, phone numbers and card details removed.'
  }
  return errors
}

export function validateDocument(draft: { title: string; docType: string; fileSrc?: string; noPersonalData: boolean }): Errors {
  const errors: Errors = {}
  if (draft.title.trim().length < 3) errors.title = 'Give the document a title.'
  if (draft.docType.trim().length < 2) errors.docType = 'Say what kind of document this is.'
  if (!draft.fileSrc) errors.fileSrc = 'Upload an image of the document or choose a sample.'
  if (!draft.noPersonalData) errors.noPersonalData = 'Confirm this public document contains no identity documents or personal details.'
  return errors
}
