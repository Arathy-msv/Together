import { useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SaveResult<T> {
  value: T
  ok: boolean
  error: string
}

/**
 * Debounced save. `save` must throw when persistence fails, so the status never says "Saved" for
 * something that was not stored. Pass a value whose identity changes only when its content does.
 */
export function useAutosave<T>(value: T, save: (value: T) => void, { delay = 700 } = {}) {
  const [initial] = useState(value)
  const [result, setResult] = useState<SaveResult<T> | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const saveRef = useRef(save)

  useEffect(() => {
    saveRef.current = save
  })

  function run(next: T): boolean {
    try {
      saveRef.current(next)
      setResult({ value: next, ok: true, error: '' })
      setSavedAt(new Date().toISOString())
      return true
    } catch (problem) {
      setResult({ value: next, ok: false, error: problem instanceof Error ? problem.message : 'This browser could not save your draft.' })
      return false
    }
  }
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  })

  useEffect(() => {
    if (value === initial) return
    const timer = window.setTimeout(() => runRef.current(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, initial, delay])

  const status: SaveStatus =
    value === initial && !result ? 'idle' : result && result.value === value ? (result.ok ? 'saved' : 'error') : 'saving'

  return { status, savedAt, error: result && !result.ok ? result.error : '', flush: () => run(value) }
}
