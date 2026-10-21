import { useState } from 'react'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { parseCampaignMessage } from '../../lib/ai/parse.ts'
import { assistantService } from '../../lib/ai/service.ts'
import { hasPlaceholder, type AiResult } from '../../lib/ai/types.ts'
import type { CampaignDraftSuggestion } from '../../lib/ai/writers.ts'
import { formatMoney } from '../../lib/format.ts'
import { gameMeta } from '../../lib/games.ts'
import { templateFor } from '../../lib/templates.ts'
import type { CampaignForm, GameType, Organization } from '../../lib/types.ts'
import { gameSettingsFields } from '../../lib/wizard.ts'
import { OrgLogoMark } from '../org/OrgChrome.tsx'
import { AiButton, AiPanel, MissingList } from './AiUI.tsx'

/** What the assistant picked up from the opening message — and what it deliberately did not guess. */
export function NotedFacts({ form, org }: { form: CampaignForm; org: Organization }) {
  const parsed = parseCampaignMessage(form.description)
  return (
    <div className="chat-bot">
      <OrgLogoMark org={org} size={32} />
      <p>
        {parsed.amount ? (
          <>
            I noted a target of <strong>{formatMoney(parsed.amount, parsed.currency ?? form.currency)}</strong> from “{parsed.amountText}”.{' '}
          </>
        ) : (
          <>I didn’t spot an amount with a currency, so we’ll set the target together. </>
        )}
        {parsed.category ? (
          <>
            {parsed.categoryReason} I’ve pre-selected <strong>{templateFor(parsed.category).label}</strong> — confirm or change it next.{' '}
          </>
        ) : null}
        I won’t guess who it helps, costs or dates; I’ll ask.
      </p>
    </div>
  )
}

type TextKey = 'title' | 'description' | 'storyWho' | 'storyNeed' | 'storySupports' | 'storyNext'

const TEXT_FIELDS: Array<{ key: TextKey; label: string; pick: (content: CampaignDraftSuggestion) => string }> = [
  { key: 'title', label: 'Suggested title', pick: (content) => content.title },
  { key: 'description', label: 'Short summary', pick: (content) => content.summary },
  { key: 'storyWho', label: 'Who will benefit?', pick: (content) => content.story.whoItHelps },
  { key: 'storyNeed', label: 'What they need', pick: (content) => content.story.whatTheyNeed },
  { key: 'storySupports', label: 'What contributions will support', pick: (content) => content.story.whatItSupports },
  { key: 'storyNext', label: 'What happens next', pick: (content) => content.story.whatHappensNext },
]

/**
 * Editable draft suggestions for the review step. Each piece is applied individually; replacing
 * existing text asks first and can be undone. Suggested milestones stay suggestions until accepted.
 */
export function DraftSuggestions({
  form,
  org,
  allowedGames,
  onChange,
}: {
  form: CampaignForm
  org: Organization
  allowedGames: GameType[]
  onChange: (patch: Partial<CampaignForm>) => void
}) {
  const request = useAiRequest<AiResult<CampaignDraftSuggestion>>()
  const [open, setOpen] = useState(false)
  const [texts, setTexts] = useState<Partial<Record<TextKey, string>>>({})
  const [accepted, setAccepted] = useState<string[]>([])
  const [undo, setUndo] = useState<{ label: string; patch: Partial<CampaignForm> } | null>(null)

  function generate() {
    setOpen(true)
    void request.run((signal) => assistantService.suggestCampaignDraft({ form, org, allowedGames }, { signal })).then((value) => {
      if (!value) return
      setTexts(Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, field.pick(value.content)])))
      setAccepted([])
    })
  }

  function apply(key: TextKey, label: string) {
    const next = texts[key]?.trim() ?? ''
    const current = form[key].trim()
    if (!next || next === current) return
    if (current && !window.confirm(`Replace your current “${label}”? You can undo this.`)) return
    setUndo({ label, patch: { [key]: form[key] } })
    onChange({ [key]: next })
  }

  if (!open) {
    return (
      <div className="readiness-launch">
        <AiButton onClick={generate}>Suggest draft content</AiButton>
        <span className="muted small">Builds an editable draft from your answers. Nothing changes until you apply it.</span>
      </div>
    )
  }

  const content = request.data?.content
  const existingTitles = new Set(form.milestonePlan.map((item) => item.title.trim().toLowerCase()))
  const suggestedMilestones = content?.milestones.filter((title) => !existingTitles.has(title.toLowerCase())) ?? []
  return (
    <AiPanel
      title="Draft suggestions"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={generate}
      onClose={() => {
        request.reset()
        setOpen(false)
      }}
      context={<span className="muted small">Uses only your answers and {org.name}’s settings. [Bracketed] text marks information only you can supply.</span>}
    >
      {undo ? (
        <div className="notice success compact" role="status">
          <span>Applied “{undo.label}”.</span>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              onChange(undo.patch)
              setUndo(null)
            }}
          >
            Undo
          </button>
        </div>
      ) : null}
      {content ? (
        <div className="ai-output">
          {TEXT_FIELDS.map((field) => {
            const value = texts[field.key] ?? ''
            const same = value.trim() === form[field.key].trim()
            const blocked = hasPlaceholder(value)
            return (
              <div key={field.key} className="ai-field">
                <label className="field-label" htmlFor={`ai-${field.key}`}>
                  {field.label}
                </label>
                <textarea id={`ai-${field.key}`} rows={field.key === 'title' ? 1 : 2} value={value} onChange={(event) => setTexts({ ...texts, [field.key]: event.target.value })} />
                <div className="inline-actions">
                  <button type="button" className="btn btn-outline btn-sm" disabled={same || blocked || !value.trim()} onClick={() => apply(field.key, field.label)}>
                    {same ? 'Matches your draft' : 'Apply suggestion'}
                  </button>
                  {blocked ? <span className="muted small">Replace the [bracketed] text first.</span> : null}
                </div>
              </div>
            )
          })}
          {suggestedMilestones.length > 0 ? (
            <fieldset className="set-fieldset ai-field">
              <legend className="field-label">Suggested milestones</legend>
              <p className="help">Suggestions until you accept them. Add dates afterwards in the full form or workspace.</p>
              {suggestedMilestones.map((title) => (
                <label key={title} className="check-row">
                  <input type="checkbox" checked={accepted.includes(title)} onChange={(event) => setAccepted(event.target.checked ? [...accepted, title] : accepted.filter((item) => item !== title))} />
                  {title} <span className="suggested-tag">Suggested</span>
                </label>
              ))}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={accepted.length === 0}
                onClick={() => {
                  setUndo({ label: 'milestones', patch: { milestonePlan: form.milestonePlan } })
                  onChange({ milestonePlan: [...form.milestonePlan, ...accepted.map((title) => ({ id: crypto.randomUUID(), title, due: '' }))] })
                  setAccepted([])
                }}
              >
                Accept {accepted.length || ''} milestone{accepted.length === 1 ? '' : 's'}
              </button>
            </fieldset>
          ) : null}
          <div className="ai-field">
            <span className="field-label">Suggested game</span>
            <p className="small">{content.game.reason}</p>
            {content.game.gameType && (!form.game || form.gameType !== content.game.gameType) ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  const gameType = content.game.gameType!
                  setUndo({ label: 'game', patch: { game: form.game, gameType: form.gameType, ...gameSettingsFields(form.gameType) } })
                  onChange({ game: true, gameType, ...gameSettingsFields(gameType) })
                }}
              >
                Use {gameMeta(content.game.gameType).name}
              </button>
            ) : null}
          </div>
          <MissingList items={request.data?.missing ?? []} />
        </div>
      ) : null}
    </AiPanel>
  )
}
