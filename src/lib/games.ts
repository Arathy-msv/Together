import type { GameType } from './types.ts'

export const GAMES: { id: GameType; name: string; blurb: string; hint: string }[] = [
  {
    id: 'garden',
    name: 'Grow Our Garden',
    blurb: 'Plant a little encouragement.',
    hint: 'Choose a flower, then select a plot.',
  },
  {
    id: 'memory',
    name: 'Memory Match',
    blurb: 'A little focus. A lovely discovery.',
    hint: 'Flip two cards and find the matching pair.',
  },
  {
    id: 'puzzle',
    name: 'Community Puzzle',
    blurb: 'Every piece brings us together.',
    hint: 'Choose a piece, then place it in the right spot.',
  },
]

export function gameMeta(id: GameType | undefined) {
  return GAMES.find((game) => game.id === id) ?? GAMES[0]
}

export function isGameType(value: unknown): value is GameType {
  return value === 'garden' || value === 'memory' || value === 'puzzle'
}
