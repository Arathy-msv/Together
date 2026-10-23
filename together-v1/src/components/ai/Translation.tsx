import type { LanguageCode } from '../../lib/ai/translations.ts'

/**
 * Saved translations stay in browser storage. Public pages are English only, so these controls
 * render nothing. Do not delete stored text from here.
 */
export interface TranslatableField {
  key: string
  label: string
  original: string
}

export function TranslationEditor({
  fields,
  saved,
  onApply,
}: {
  fields: TranslatableField[]
  saved: Partial<Record<string, string>>
  onApply: (key: string, text: string | undefined) => void
}) {
  void fields
  void saved
  void onApply
  return null
}

export function LanguageToggle({ language, onChange }: { language: LanguageCode; onChange: (language: LanguageCode) => void }) {
  void language
  void onChange
  return null
}
