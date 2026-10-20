import type { CampaignView } from '../../lib/types.ts'
import { WarmthGame } from './WarmthGame.tsx'

export function JacketGame({ view, preview = false }: { view: CampaignView; preview?: boolean }) {
  return <WarmthGame view={view} preview={preview} />
}
