/** Delay for a short completion animation, shortened when the supporter prefers reduced motion. */
export function animationDelay(ms: number): number {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return reduced ? 30 : ms
}
