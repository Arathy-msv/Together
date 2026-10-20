/**
 * Gesture games move through fixed checkpoints, e.g. a zip at 25%, 50%, 75% and 100%.
 * A drag can travel freely below the next uncompleted checkpoint but never past it,
 * so one fast gesture completes at most one stage.
 */
export function clampToNextStage(
  candidate: number,
  done: number,
  boundaries: number[],
): { progress: number; reached: boolean } {
  const value = Number.isFinite(candidate) ? candidate : 0
  if (done >= boundaries.length) return { progress: Math.max(0, Math.min(1, value)), reached: false }
  const next = boundaries[done]
  const progress = Math.max(0, Math.min(next, value))
  return { progress, reached: value >= next - 1e-6 }
}

export function evenBoundaries(stages: number): number[] {
  return Array.from({ length: stages }, (_, index) => (index + 1) / stages)
}

/** Progress at the most recently completed checkpoint. */
export function settledProgress(done: number, boundaries: number[]): number {
  if (done <= 0) return 0
  return boundaries[Math.min(done, boundaries.length) - 1]
}
