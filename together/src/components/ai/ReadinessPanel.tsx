import { useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import type { ReadinessField, ReadinessInput, ReadinessItem, ReadinessLevel } from '../../lib/ai/readiness.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { AiButton, AiPanel } from './AiUI.tsx'

const GROUPS: Array<{ level: ReadinessLevel; title: string; note: string }> = [
  { level: 'required', title: 'Required before publishing', note: 'These are the campaign form’s own required fields.' },
  { level: 'recommended', title: 'Recommended improvements', note: 'Suggestions only — they don’t block publishing.' },
  { level: 'optional', title: 'Optional enhancements', note: 'Nice to have when you are ready.' },
]

/**
 * "Check campaign readiness": transparent checks with a link to each field. No score, no fraud
 * judgement and no verification. Applying a suggestion is always an explicit organizer action.
 */
export function ReadinessPanel({
  input,
  onJump,
  onApply,
  applicable = [],
}: {
  input: ReadinessInput
  onJump: (field: ReadinessField) => void
  onApply?: (field: ReadinessField, text: string) => void
  applicable?: ReadinessField[]
}) {
  const request = useAiRequest<AiResult<ReadinessItem[]>>()
  const [open, setOpen] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<string[]>([])

  function check() {
    setOpen(true)
    setApplied([])
    void request.run((signal) => assistantService.checkCampaignReadiness(input, { signal })).then((value) => {
      if (value) setEdits(Object.fromEntries(value.content.filter((item) => item.suggestion).map((item) => [item.id, item.suggestion!])))
    })
  }

  if (!open) {
    return (
      <div className="readiness-launch">
        <AiButton onClick={check}>Check campaign readiness</AiButton>
      </div>
    )
  }

  const items = request.data?.content ?? []
  return (
    <AiPanel
      title="Campaign readiness"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={check}
      onClose={() => {
        request.reset()
        setOpen(false)
      }}
      context={<span className="muted small">Checks the information you have entered so far against clear rules. There is no score and no verification.</span>}
    >
      {request.status === 'success' ? (
        <div className="readiness-groups">
          {items.length === 0 ? <p className="ai-empty">Nothing to flag. Review the campaign once more before publishing.</p> : null}
          {GROUPS.map((group) => {
            const groupItems = items.filter((item) => item.level === group.level)
            if (groupItems.length === 0) return null
            return (
              <section key={group.level} className={`readiness-group ${group.level}`}>
                <h4>
                  {group.title} <span className="muted small">· {groupItems.length}</span>
                </h4>
                <p className="muted small">{group.note}</p>
                <ul>
                  {groupItems.map((item) => (
                    <li key={item.id}>
                      <strong>{item.issue}</strong>
                      <span className="muted small">{item.why}</span>
                      {item.suggestion ? (
                        <div className="readiness-suggestion">
                          <label className="sr-only" htmlFor={`sugg-${item.id}`}>
                            Suggested improvement
                          </label>
                          <textarea id={`sugg-${item.id}`} rows={2} value={edits[item.id] ?? ''} onChange={(event) => setEdits({ ...edits, [item.id]: event.target.value })} />
                        </div>
                      ) : null}
                      <div className="inline-actions">
                        <button type="button" className="link-button" onClick={() => onJump(item.field)}>
                          Go to field
                        </button>
                        {item.suggestion && onApply && applicable.includes(item.field) ? (
                          applied.includes(item.id) ? (
                            <span className="muted small">Applied — review it in the field.</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              disabled={!edits[item.id]?.trim()}
                              onClick={() => {
                                onApply(item.field, edits[item.id].trim())
                                setApplied([...applied, item.id])
                              }}
                            >
                              Apply suggestion
                            </button>
                          )
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
          <button type="button" className="btn btn-outline btn-sm" onClick={check}>
            Check again
          </button>
        </div>
      ) : null}
    </AiPanel>
  )
}
