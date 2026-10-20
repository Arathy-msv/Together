import type { CurrencyCode, ExpenseCategory } from '../types.ts'
import { AiError, result, type AiResult } from './types.ts'

/* Sample receipt extraction · Simulated. Each fictional sample maps to predefined values; there is
   no OCR and no document verification. Uploaded files are never "read". */

export interface ExtractedReceipt {
  vendor: string
  /** yyyy-mm-dd */
  date: string
  amountMinor: number
  currency: CurrencyCode
  category: ExpenseCategory
  description: string
}

export interface SampleReceipt {
  id: string
  label: string
  src: string
  values: ExtractedReceipt
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-blankets',
    label: 'Blanket supplier invoice (fictional)',
    src: '/receipts/sample-blankets.svg',
    values: { vendor: 'Warmline Textiles (fictional)', date: '2026-10-14', amountMinor: 1_200_000, currency: 'INR', category: 'materials', description: '80 thick blankets, second batch' },
  },
  {
    id: 'sample-van',
    label: 'Van hire receipt (fictional)',
    src: '/receipts/sample-van.svg',
    values: { vendor: 'CityMove Van Hire (fictional)', date: '2026-10-15', amountMinor: 125_050, currency: 'INR', category: 'transport', description: 'Half-day van hire for deliveries' },
  },
  {
    id: 'sample-books',
    label: 'Bookshop receipt (fictional)',
    src: '/receipts/sample-books.svg',
    values: { vendor: 'Second Chapter Books (fictional)', date: '2026-10-12', amountMinor: 42_000, currency: 'USD', category: 'materials', description: 'Picture books for reading corners' },
  },
]

export function extractSampleReceipt(sampleId: string): AiResult<ExtractedReceipt> {
  const sample = SAMPLE_RECEIPTS.find((item) => item.id === sampleId)
  if (!sample) throw new AiError('Automatic extraction is not connected for uploaded files in this prototype. Enter the fields manually.')
  return result({ ...sample.values }, { sources: [{ kind: 'sample', id: sample.id, label: sample.label }] })
}
