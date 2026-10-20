import { useId, useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { shortenMessage, type ReferralTone } from '../../lib/ai/writers.ts'
import { AiPanel, MissingList } from './AiUI.tsx'

/**
 * "Help me write my message". Options combine the sharer's own words with the original campaign's
 * title and organizer only — no invented experiences, matching, urgency or impact.
 */
export function ReferralWriter({
  campaignTitle,
  organizerName,
  current,
  onApply,
  onClose,
}: {
  campaignTitle: string
  organizerName: string
  current: string
  onApply: (message: string) => void
  onClose: () => void
}) {
  const ids = { why: useId(), connection: useId() }
  const [why, setWhy] = useState('')
  const [connection, setConnection] = useState('')
  const [tone, setTone] = useState<ReferralTone>('warm')
  const request = useAiRequest<AiResult<string[]>>()
  const [options, setOptions] = useState<string[]>([])
  const [applied, setApplied] = useState<number | null>(null)

  function generate() {
    setApplied(null)
    void request
      .run((signal) => assistantService.suggestReferralMessage({ campaignTitle, organizerName, why, connection, tone }, { signal }))
      .then((value) => value && setOptions(value.content))
  }

  return (
    <AiPanel
      title="Help me write my message"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={generate}
      onClose={onClose}
      context={
        <div className="ai-inputs">
          <div className="field">
            <label className="field-label" htmlFor={ids.why}>
              Why do you support this cause?
            </label>
            <textarea id={ids.why} rows={2} maxLength={600} value={why} placeholder="In your own words" onChange={(event) => setWhy(event.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor={ids.connection}>
              Your connection to it <span className="optional-tag">Optional</span>
            </label>
            <input id={ids.connection} maxLength={200} value={connection} placeholder="e.g. I volunteer at the shelter on weekends" onChange={(event) => setConnection(event.target.value)} />
          </div>
          <fieldset className="set-fieldset">
            <legend className="field-label">Tone</legend>
            <div className="segmented">
              {(['warm', 'professional', 'brief'] as const).map((value) => (
                <label key={value} className={tone === value ? 'selected' : ''}>
                  <input type="radio" name="referral-tone" checked={tone === value} onChange={() => setTone(value)} />
                  {value[0].toUpperCase() + value.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="muted small">
            Campaign facts come from the original campaign: {campaignTitle}, organised by {organizerName}. Suggestions never change its purpose, target or where money goes.
          </p>
          <div className="inline-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={request.status === 'loading'}>
              {options.length ? 'Suggest again' : 'Suggest messages'}
            </button>
          </div>
        </div>
      }
    >
      {request.status === 'success' ? (
        <div className="ai-output">
          <MissingList items={request.data?.missing ?? []} />
          {options.map((option, index) => (
            <div key={index} className="ai-field">
              <label className="field-label" htmlFor={`ref-opt-${index}`}>
                Option {index + 1}
              </label>
              <textarea id={`ref-opt-${index}`} rows={3} maxLength={1200} value={option} onChange={(event) => setOptions(options.map((item, i) => (i === index ? event.target.value : item)))} />
              <div className="inline-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={option.trim().length < 20}
                  onClick={() => {
                    if (current.trim() && current.trim() !== option.trim() && !window.confirm('Replace the message you have written?')) return
                    onApply(option.trim())
                    setApplied(index)
                  }}
                >
                  {applied === index ? 'Applied' : 'Apply'}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setOptions(options.map((item, i) => (i === index ? shortenMessage(item) : item)))}>
                  Shorten
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setOptions(options.map((item, i) => (i === index ? (request.data?.content[index] ?? item) : item)))}>
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </AiPanel>
  )
}
