// Presales cut, target 2–3 minutes. Reuses the full recording and narration, so the length is the
// sum of these scenes from the last assembly (about 2:43): public site, the give-or-play choice,
// a simulated gift, delivery kept separate from the funding total, and the closing line.
// output/together-presales.mp4 is still the previous 10:43 file until narrate → record → assemble
// runs again. Do not describe that file as this cut.
export const PRESALES_SCENES = [
  'op-home',
  'op-game',
  'sp-direct',
  'fn-public',
  'card-end',
]
