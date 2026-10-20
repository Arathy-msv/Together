import { useEffect, useRef } from 'react'
import { GAME_THUMBS, gameMeta, isFlowGame } from '../lib/games.ts'
import { formToCampaign } from '../lib/wizard.ts'
import type { CampaignForm, CampaignView, GameType } from '../lib/types.ts'
import { GardenGame } from '../pages/play/GardenGame.tsx'
import { JacketGame } from '../pages/play/JacketGame.tsx'
import { MemoryGame } from '../pages/play/MemoryGame.tsx'
import { PuzzleGame } from '../pages/play/PuzzleGame.tsx'

export function previewViewFromForm(form: CampaignForm, gameType?: GameType): CampaignView {
  const campaign = formToCampaign(
    { ...form, game: true, gameType: gameType ?? form.gameType },
    { isDraft: true },
  )
  return {
    campaign,
    raised: 0,
    supporters: 0,
    status: 'active',
    percent: 0,
    canGive: false,
  }
}

export function GamePreviewModal({
  form,
  gameType,
  onClose,
}: {
  form: CampaignForm
  gameType: GameType
  onClose: () => void
}) {
  const view = previewViewFromForm(form, gameType)
  const meta = gameMeta(gameType)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div className="game-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="game-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${meta.name}`}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="game-preview-head">
          <div>
            <strong>{meta.name}</strong>
            <p className="muted small">Interactive preview — no contributions are recorded.</p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className={`game-preview-body${isFlowGame(gameType) ? ' flow' : ''}`}>
          <PreviewGame view={view} gameType={gameType} />
        </div>
      </div>
    </div>
  )
}

function PreviewGame({ view, gameType }: { view: CampaignView; gameType: GameType }) {
  if (gameType === 'memory') return <MemoryGame view={view} preview />
  if (gameType === 'puzzle') return <PuzzleGame view={view} preview />
  if (gameType === 'jacket') return <JacketGame view={view} preview />
  return <GardenGame view={view} preview />
}

export function GameThumb({ gameType, customSrc }: { gameType: GameType; customSrc?: string }) {
  return <img className="game-thumb" src={customSrc || GAME_THUMBS[gameType]} alt="" />
}
