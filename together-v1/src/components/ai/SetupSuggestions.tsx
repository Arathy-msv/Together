import { useState } from 'react'
import { coverTemplate } from '../../data/covers.ts'
import { useAiRequest } from '../../hooks/useAiRequest.ts'
import { assistantService } from '../../lib/ai/service.ts'
import type { SetupRecommendation } from '../../lib/ai/setup.ts'
import type { AiResult } from '../../lib/ai/types.ts'
import { gameMeta } from '../../lib/games.ts'
import { TEMPLATES } from '../../lib/templates.ts'
import type { CampaignCategory, CampaignForm, GameType } from '../../lib/types.ts'
import { gameSettingsFields } from '../../lib/wizard.ts'
import { AiButton, AiPanel } from './AiUI.tsx'

/**
 * "Suggest a setup": category-based recommendations the organizer accepts one at a time. Accepting
 * never touches entered text, and changing an existing choice (game, cover, milestones) asks first.
 */
export function SetupSuggestions({ form, allowedGames, onChange }: { form: CampaignForm; allowedGames: GameType[]; onChange: (patch: Partial<CampaignForm>) => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<CampaignCategory>(form.category === 'other' ? 'education' : form.category)
  const [accepted, setAccepted] = useState<string[]>([])
  const request = useAiRequest<AiResult<SetupRecommendation[]>>()

  function suggest(next = category) {
    setOpen(true)
    setAccepted([])
    void request.run((signal) => assistantService.recommendCampaignSetup({ category: next, allowedGames }, { signal }))
  }

  function accept(item: SetupRecommendation) {
    const confirmReplace = (what: string) => window.confirm(`Replace your current ${what}?`)
    switch (item.id) {
      case 'template':
        onChange({ category: item.category })
        break
      case 'game':
        if (!item.gameType) return
        if (form.game && form.gameType !== item.gameType && !confirmReplace(`game (${gameMeta(form.gameType).name})`)) return
        onChange({ game: true, gameType: item.gameType, ...gameSettingsFields(item.gameType) })
        break
      case 'milestones': {
        const existing = form.milestonePlan.filter((row) => row.title.trim())
        if (existing.length && !confirmReplace('milestone plan')) return
        onChange({ milestonePlan: item.milestones.map((title) => ({ id: crypto.randomUUID(), title, due: '' })) })
        break
      }
      case 'cover':
        if (form.coverImageId === 'upload' && !confirmReplace('uploaded cover')) return
        onChange({ coverImageId: item.coverId })
        break
      case 'expenses':
        break
    }
    setAccepted((current) => [...current, item.id])
  }

  if (!open) {
    return (
      <div className="readiness-launch">
        <AiButton onClick={() => suggest()}>Suggest a setup</AiButton>
        <span className="muted small">Recommendations for a template, game, milestones, expense categories and cover.</span>
      </div>
    )
  }
  return (
    <AiPanel
      title="Suggest a setup"
      status={request.status}
      error={request.error}
      onCancel={request.cancel}
      onRetry={() => suggest()}
      onClose={() => {
        request.reset()
        setOpen(false)
      }}
      context={
        <label className="field">
          <span className="field-label">Campaign category</span>
          <select
            value={category}
            onChange={(event) => {
              const next = event.target.value as CampaignCategory
              setCategory(next)
              suggest(next)
            }}
          >
            {TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {request.status === 'success' && request.data ? (
        <ul className="setup-list">
          {request.data.content.map((item) => {
            const done = accepted.includes(item.id)
            const current =
              (item.id === 'template' && form.category === item.category) ||
              (item.id === 'game' && item.gameType !== null && form.game && form.gameType === item.gameType) ||
              (item.id === 'cover' && form.coverImageId === item.coverId)
            return (
              <li key={item.id}>
                {item.id === 'cover' ? <img src={coverTemplate(item.coverId).src} alt="" /> : null}
                <div>
                  <span className="eyebrow-label">{{ template: 'Story template', game: 'Game', milestones: 'Milestone examples', expenses: 'Expense categories', cover: 'Cover image' }[item.id]}</span>
                  <strong>{item.label}</strong>
                  {item.id === 'milestones' ? <span className="small">{item.milestones.join(' · ')}</span> : null}
                  <span className="muted small">{item.reason}</span>
                </div>
                {item.id === 'expenses' ? (
                  <span className="muted small">Used later when you report expenses.</span>
                ) : item.id === 'game' && !item.gameType ? null : current || done ? (
                  <span className="trust-pill tone-good">{done ? 'Accepted' : 'Already set'}</span>
                ) : (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => accept(item)}>
                    Accept
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </AiPanel>
  )
}
