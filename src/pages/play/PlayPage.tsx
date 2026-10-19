import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useCampaignView } from '../../hooks/useDemoStore.ts'
import { gameMeta, isFlowGame, isGameType } from '../../lib/games.ts'
import { NotFoundPage } from '../NotFound.tsx'
import { GardenGame } from './GardenGame.tsx'
import { JacketGame } from './JacketGame.tsx'
import { MemoryGame } from './MemoryGame.tsx'
import { PageGame } from './PageGame.tsx'
import { PencilGame } from './PencilGame.tsx'
import { PuzzleGame } from './PuzzleGame.tsx'
import { WeightGame } from './WeightGame.tsx'

export function PlayPage() {
  const { id = '', game } = useParams()
  const view = useCampaignView(id)

  useEffect(() => {
    if (!view) return
    const active = isGameType(game) ? game : view.campaign.gameType
    document.title = `${gameMeta(active).name} — Together`
  }, [view, game])

  if (!view) return <NotFoundPage />
  if (!view.campaign.participation.game) {
    return <Navigate to={`/campaigns/${view.campaign.id}`} replace />
  }
  if (!isGameType(game) || game !== view.campaign.gameType) {
    return <Navigate to={`/campaigns/${view.campaign.id}/play/${view.campaign.gameType}`} replace />
  }
  if (game === 'memory') return <MemoryGame view={view} />
  if (game === 'puzzle') return <PuzzleGame view={view} />
  if (game === 'weight') return <WeightGame view={view} />
  if (game === 'page') return <PageGame view={view} />
  if (game === 'jacket') return <JacketGame view={view} />
  if (game === 'pencil') return <PencilGame view={view} />
  if (isFlowGame(game)) return <WeightGame view={view} />
  return <GardenGame view={view} />
}
