import { useId, useRef, useState, type ReactNode } from 'react'
import { useImagePicker } from '../../hooks/useImagePicker.tsx'
import { readVideoFile, VIDEO_ACCEPT } from '../../lib/image.ts'
import type { MediaItem, MediaVideo } from '../../lib/types.ts'

export function TextInput({
  label,
  value,
  onChange,
  error,
  help,
  type = 'text',
  maxLength = 200,
  optional = false,
  inputMode,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  help?: string
  type?: string
  maxLength?: number
  optional?: boolean
  inputMode?: 'numeric' | 'decimal'
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label} {optional ? <span className="optional-tag">Optional</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? (
        <p className="help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  error,
  help,
  rows = 3,
  maxLength = 2000,
  optional = false,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  help?: string
  rows?: number
  maxLength?: number
  optional?: boolean
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label} {optional ? <span className="optional-tag">Optional</span> : null}
      </label>
      <textarea id={id} rows={rows} value={value} maxLength={maxLength} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} />
      {help ? <p className="help">{help}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}

export function Select({ label, value, options, onChange, help }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; help?: string }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <p className="help">{help}</p> : null}
    </div>
  )
}

export function Checkbox({ label, checked, onChange, help }: { label: ReactNode; checked: boolean; onChange: (value: boolean) => void; help?: string }) {
  return (
    <div className="field">
      <label className="check-row">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      {help ? <p className="help">{help}</p> : null}
    </div>
  )
}

/** One compressed image (receipt, document). */
export function SingleImage({ label, value, onChange, help, optional = true }: { label: string; value?: string; onChange: (value?: string) => void; help?: string; optional?: boolean }) {
  const picker = useImagePicker((data) => onChange(data), { maxWidth: 1000, maxHeight: 1400, type: 'image/jpeg', quality: 0.72, maxChars: 450_000 })
  return (
    <div className="field">
      <span className="field-label">
        {label} {optional ? <span className="optional-tag">Optional</span> : null}
      </span>
      <div className="image-row">
        {value ? <img className="hero-thumb" src={value} alt="" /> : null}
        <button type="button" className="btn btn-outline btn-sm" onClick={picker.open} disabled={picker.busy}>
          {picker.busy ? 'Processing…' : value ? 'Replace image' : 'Upload image'}
        </button>
        {value ? (
          <button type="button" className="link-button danger" onClick={() => onChange(undefined)}>
            Remove
          </button>
        ) : null}
      </div>
      {picker.input}
      {help ? <p className="help">{help}</p> : null}
      {picker.error ? <p className="error-text">{picker.error}</p> : null}
    </div>
  )
}

/** Up to `max` images, each with a caption and required alt text. */
export function MediaEditor({ items, onChange, max = 3, error }: { items: MediaItem[]; onChange: (items: MediaItem[]) => void; max?: number; error?: string }) {
  const picker = useImagePicker((data) => onChange([...items, { id: crypto.randomUUID(), src: data, caption: '', alt: '' }]), {
    maxWidth: 1000,
    maxHeight: 800,
    type: 'image/jpeg',
    quality: 0.72,
    maxChars: 350_000,
  })
  return (
    <div className="field">
      <span className="field-label">
        Images <span className="optional-tag">Optional</span>
      </span>
      {items.map((item, index) => (
        <div key={item.id} className="media-row">
          <img src={item.src} alt="" />
          <div className="media-row-fields">
            <input aria-label={`Image ${index + 1} caption`} placeholder="Caption" value={item.caption} maxLength={200} onChange={(event) => onChange(items.map((m) => (m.id === item.id ? { ...m, caption: event.target.value } : m)))} />
            <input
              aria-label={`Image ${index + 1} alt text`}
              placeholder="Alt text: describe the image for screen readers"
              value={item.alt}
              maxLength={200}
              aria-invalid={!item.alt.trim()}
              onChange={(event) => onChange(items.map((m) => (m.id === item.id ? { ...m, alt: event.target.value } : m)))}
            />
          </div>
          <button type="button" className="btn btn-outline btn-sm icon-only" aria-label={`Remove image ${index + 1}`} onClick={() => onChange(items.filter((m) => m.id !== item.id))}>
            ×
          </button>
        </div>
      ))}
      {items.length < max ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={picker.open} disabled={picker.busy}>
          {picker.busy ? 'Processing…' : '+ Add image'}
        </button>
      ) : null}
      {picker.input}
      <p className="help">Images are resized for this demo. Photos of places and items work well — you don’t need photos of the people you help.</p>
      {picker.error || error ? <p className="error-text">{picker.error || error}</p> : null}
    </div>
  )
}

export function VideoEditor({ video, onChange }: { video?: MediaVideo; onChange: (video?: MediaVideo) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="field">
      <span className="field-label">
        Video <span className="optional-tag">Optional</span>
      </span>
      {video ? (
        <div className="media-row">
          <video src={video.src} controls preload="metadata" />
          <div className="media-row-fields">
            <input aria-label="Video caption" placeholder="Caption" value={video.caption} maxLength={200} onChange={(event) => onChange({ ...video, caption: event.target.value })} />
          </div>
          <button type="button" className="btn btn-outline btn-sm icon-only" aria-label="Remove video" onClick={() => onChange(undefined)}>
            ×
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Reading…' : '+ Add a short video'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={VIDEO_ACCEPT}
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setBusy(true)
          setError('')
          try {
            onChange({ src: await readVideoFile(file), caption: '' })
          } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'That video could not be used.')
          } finally {
            setBusy(false)
          }
        }}
      />
      <p className="help">MP4 or WebM under 2.5 MB. Videos never play automatically.</p>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  )
}

