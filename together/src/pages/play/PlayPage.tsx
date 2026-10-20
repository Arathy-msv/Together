import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useCampaignView } from '../../hooks/useDemoStore.ts'
import { campaignDetailsPath, campaignPlayPath } from '../../lib/campaigns.ts'
import { useOrgBase } from '../../components/org/OrgContext.tsx'
import { gameMeta, isGameType } from '../../lib/games.ts'
import { getPending, hasSeenGameIntro, isUnlocked, markGameIntroSeen } from '../../lib/pending.ts'
import { GameIntro } from '../../components/GameIntro.tsx'
import { currentPlayer, rememberReferral } from '../../lib/players.ts'
import { NotFoundPage } from '../NotFound.tsx'
import { GardenGame } from './GardenGame.tsx'
import { JacketGame } from './JacketGame.tsx'
import { MemoryGame } from './MemoryGame.tsx'
import { PuzzleGame } from './PuzzleGame.tsx'

export function PlayPage() {
  const { id = '', game } = useParams()
  const [params] = useSearchParams()
  const view = useCampaignView(id)
  const base = useOrgBase()
  const [introDone, setIntroDone] = useState(() => hasSeenGameIntro(id) || getPending(id)?.method === 'game')

  useEffect(() => {
    const ref = params.get('ref')
    if (id && ref) rememberReferral(id, ref)
  }, [id, params])

  useEffect(() => {
    if (!view) return
    const active = isGameType(game) ? game : view.campaign.gameType
    document.title = `${gameMeta(active).name} — Together`
  }, [view, game])

  if (!view) return <NotFoundPage />
  if (!view.campaign.participation.game) {
    return <Navigate to={campaignDetailsPath(view.campaign.id, base)} replace />
  }
  if (
    view.campaign.access === 'closed' &&
    !view.campaign.isDraft &&
    (!isUnlocked(view.campaign.id) || !currentPlayer(view.campaign.id))
  ) {
    return <Navigate to={campaignDetailsPath(view.campaign.id, base)} replace />
  }
  if (!isGameType(game) || game !== view.campaign.gameType) {
    return <Navigate to={campaignPlayPath(view.campaign.id, view.campaign.gameType, base)} replace />
  }
  if (!introDone && !view.campaign.isDraft) {
    return (
      <GameIntro
        view={view}
        onStart={() => {
          markGameIntroSeen(id)
          setIntroDone(true)
        }}
      />
    )
  }
  if (game === 'memory') return <MemoryGame view={view} />
  if (game === 'puzzle') return <PuzzleGame view={view} />
  if (game === 'jacket') return <JacketGame view={view} />
  return <GardenGame view={view} />
}
