import { useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { assistantService } from '../../lib/ai/service.ts'
import { LANGUAGES, type LanguageCode, type TranslationPreview } from '../../lib/ai/translations.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { AiBadge, SparkIcon } from './AiUI.tsx'

export interface TranslatableField {
  key: string
  label: string
  original: string
}

/**
 * Organizer translation editor (Malayalam). Prepared sample translations exist only for the seeded
 * example content; for anything else live translation is not connected and a manual field is shown.
 * Nothing is saved until the organizer reviews and applies a translation.
 */
export function TranslationEditor({
  fields,
  saved,
  onApply,
}: {
  fields: TranslatableField[]
  saved: Partial<Record<string, string>>
  onApply: (key: string, text: string | undefined) => void
}) {
  return (
    <div className="translation-editor">
      <div className="ask-head">
        <strong>Malayalam translation</strong>
        <AiBadge label="Translation preview · Simulated" />
      </div>
      <p className="muted small">Translations are stored separately from your original text and only shown publicly after you apply them. Check names, numbers, currency and dates.</p>
      {fields
        .filter((field) => field.original.trim())
        .map((field) => (
          <TranslationRow key={field.key} field={field} saved={saved[field.key]} onApply={(text) => onApply(field.key, text)} />
        ))}
    </div>
  )
}

function TranslationRow({ field, saved, onApply }: { field: TranslatableField; saved?: string; onApply: (text: string | undefined) => void }) {
  const request = useAiRequest<AiResult<TranslationPreview>>()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const preview = request.data?.content

  function load() {
    setOpen(true)
    setReviewed(false)
    void request.run((signal) => assistantService.previewSampleTranslation({ text: field.original, language: 'ml' }, { signal })).then((value) => {
      if (!value) return
      setText(value.content.status === 'prepared' ? value.content.text : (saved ?? ''))
    })
  }

  const unchanged = text.trim() === field.original.trim()
  return (
    <div className="translation-row">
      <span className="field-label">{field.label}</span>
      <p className="translation-original">{field.original}</p>
      {saved ? (
        <div className="translation-saved">
          <span className="muted small">Applied translation</span>
          <p lang="ml">{saved}</p>
          <button type="button" className="link-button danger small" onClick={() => onApply(undefined)}>
            Remove translation
          </button>
        </div>
      ) : null}
      {!open ? (
        <button type="button" className="ai-button" onClick={load}>
          <SparkIcon size={15} /> {saved ? 'Edit translation' : 'Preview translation'}
        </button>
      ) : (
        <div className="ai-field" aria-busy={request.status === 'loading'}>
          {request.status === 'loading' ? <span className="ai-loading small">Looking for a prepared translation…</span> : null}
          {request.status === 'success' && preview ? (
            <>
              <span className="muted small">
                {preview.status === 'prepared'
                  ? 'Prepared sample translation · Simulated. Review it before applying.'
                  : 'Live translation is not connected in this prototype. Add a manual translation if you have one.'}
              </span>
              <label className="sr-only" htmlFor={`tr-${field.key}`}>
                Malayalam translation of {field.label}
              </label>
              <textarea id={`tr-${field.key}`} lang="ml" rows={3} value={text} placeholder="Malayalam translation" onChange={(event) => setText(event.target.value)} />
              {unchanged && text.trim() ? <span className="error-text">This is the same as the original, so it isn’t a translation.</span> : null}
              <label className="check-row">
                <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
                I have reviewed this translation and it keeps the original meaning.
              </label>
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!reviewed || !text.trim() || unchanged}
                  onClick={() => {
                    onApply(text.trim())
                    setOpen(false)
                  }}
                >
                  Apply translation
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Public toggle shown only when the organizer has applied translations. */
export function LanguageToggle({ language, onChange }: { language: LanguageCode; onChange: (language: LanguageCode) => void }) {
  return (
    <div className="language-toggle">
      <span className="muted small">Preview translation</span>
      <div className="segmented small" role="group" aria-label="Language">
        {LANGUAGES.map((item) => (
          <button key={item.code} type="button" className={language === item.code ? 'selected' : ''} aria-pressed={language === item.code} lang={item.code} onClick={() => onChange(item.code)}>
            {item.native}
          </button>
        ))}
      </div>
      {language === 'ml' ? <span className="muted small">Translation reviewed by the organizer. Untranslated parts are marked.</span> : null}
    </div>
  )
}
