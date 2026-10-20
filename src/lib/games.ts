import type { GameType } from './types.ts'

export const CARTOON_GAMES: GameType[] = ['garden', 'memory', 'puzzle']
export const FLOW_GAMES: GameType[] = ['jacket']

export const GAME_THUMBS: Record<GameType, string> = {
  garden: '/giving-tree/thumb.webp',
  memory: '/games/memory-bg.jpg',
  puzzle: '/games/puzzle-art.jpg',
  jacket: '/games/jacket-zipped.jpg',
}

export const GAMES: { id: GameType; name: string; blurb: string; hint: string; style: 'cartoon' | 'flow' }[] = [
  {
    id: 'garden',
    name: 'Grow a Giving Tree',
    blurb: 'Care for your plant and grow the shared tree together.',
    hint: 'Plant a seed, then water, fertilize and give it sunlight.',
    style: 'cartoon',
  },
  {
    id: 'memory',
    name: 'Memory Match',
    blurb: 'A little focus. A lovely discovery.',
    hint: 'Flip two cards and find the matching pair.',
    style: 'cartoon',
  },
  {
    id: 'puzzle',
    name: 'Community Puzzle',
    blurb: 'Every piece brings us together.',
    hint: 'Choose a piece, then set it in its matching space.',
    style: 'cartoon',
  },
  {
    id: 'jacket',
    name: 'Zip the Jacket',
    blurb: 'A little action goes a long way.',
    hint: 'Pull the zip up in four stages.',
    style: 'flow',
  },
]

export function gameMeta(id: GameType | undefined) {
  return GAMES.find((game) => game.id === id) ?? GAMES[0]
}

export function isGameType(value: unknown): value is GameType {
  return (
    value === 'garden' ||
    value === 'memory' ||
    value === 'puzzle' ||
    value === 'jacket'
  )
}

export function isFlowGame(value: GameType): boolean {
  return FLOW_GAMES.includes(value)
}
