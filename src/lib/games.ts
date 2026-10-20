import type { GameType } from './types.ts'

export const CARTOON_GAMES: GameType[] = ['garden', 'memory', 'puzzle']
export const FLOW_GAMES: GameType[] = ['weight', 'page', 'jacket', 'pencil']

export const GAME_THUMBS: Record<GameType, string> = {
  garden: '/games/garden-bg.jpg',
  memory: '/games/memory-bg.jpg',
  puzzle: '/games/puzzle-art.jpg',
  weight: '/games/weight-seedling.jpg',
  page: '/games/page-drawing.jpg',
  jacket: '/games/jacket-zipped.jpg',
  pencil: '/games/pencil.jpg',
}

export const GAMES: { id: GameType; name: string; blurb: string; hint: string; style: 'cartoon' | 'flow' }[] = [
  {
    id: 'garden',
    name: 'Grow Our Garden',
    blurb: 'Plant a little encouragement.',
    hint: 'Choose a flower, then select a plot.',
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
    hint: 'Three pieces are left. Choose one, then set it in place.',
    style: 'cartoon',
  },
  {
    id: 'weight',
    name: 'Lift the Weight',
    blurb: 'Drag the stone aside to help something grow.',
    hint: 'Drag the stone aside.',
    style: 'flow',
  },
  {
    id: 'page',
    name: 'Turn the Page',
    blurb: 'Unfold a page and give creativity room.',
    hint: 'Drag a corner to unfold.',
    style: 'flow',
  },
  {
    id: 'jacket',
    name: 'Zip the Jacket',
    blurb: 'A little action goes a long way.',
    hint: 'Pull the zip upward.',
    style: 'flow',
  },
  {
    id: 'pencil',
    name: 'Write a Line',
    blurb: 'Drag to write a brighter future.',
    hint: 'Drag to write.',
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
    value === 'weight' ||
    value === 'page' ||
    value === 'jacket' ||
    value === 'pencil'
  )
}

export function isFlowGame(value: GameType): boolean {
  return FLOW_GAMES.includes(value)
}
