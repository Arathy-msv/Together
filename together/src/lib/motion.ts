import { useSyncExternalStore } from 'react'

function motionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

export function prefersReducedMotion(): boolean {
  return motionQuery()?.matches ?? false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = motionQuery()
      if (!query) return () => {}
      query.addEventListener('change', listener)
      return () => query.removeEventListener('change', listener)
    },
    prefersReducedMotion,
    () => false,
  )
}

/** Delay for a short completion animation, shortened when the supporter prefers reduced motion. */
export function animationDelay(ms: number): number {
  return prefersReducedMotion() ? 30 : ms
}
