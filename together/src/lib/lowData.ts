import { useSyncExternalStore } from 'react'

/* Whether low-data mode is in effect right now (the organization offers it and the visitor turned it on). */

let active = false
const listeners = new Set<() => void>()

export function setLowDataActive(next: boolean): void {
  if (next === active) return
  active = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLowData(): boolean {
  return useSyncExternalStore(subscribe, () => active, () => false)
}
