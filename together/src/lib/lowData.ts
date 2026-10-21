import { useSyncExternalStore } from 'react'

/* Whether low-data mode is in effect right now (the organization offers it and the visitor turned it on). */

const STORAGE_KEY = 'together.lowData.v1'

let active = false
const listeners = new Set<() => void>()

/** The visitor's saved preference. Applying it still depends on the organization offering the feature. */
export function readStoredLowData(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeStoredLowData(on: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    // Preference is best-effort.
  }
}

/** Leaves low-data mode. Organization pages turn it back on from the saved preference. */
export function clearLowData(): void {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('low-data')
  setLowDataActive(false)
}

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
