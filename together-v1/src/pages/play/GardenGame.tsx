import type { CampaignView } from '../../lib/types.ts'
import { GivingTreeGame } from './giving-tree/GivingTreeGame.tsx'

export function GardenGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  return <GivingTreeGame view={view} preview={preview} />
}
