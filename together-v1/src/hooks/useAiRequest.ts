import { useEffect, useRef, useState } from 'react'
import { AiCancelledError } from '../lib/ai/types.ts'

export type AiStatus = 'idle' | 'loading' | 'success' | 'error' | 'cancelled'

/**
 * Runs one assistant request at a time. A newer request always wins: responses from older,
 * superseded requests are ignored so they can never replace a newer suggestion.
 */
export function useAiRequest<T>() {
  const [status, setStatus] = useState<AiStatus>('idle')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const latest = useRef(0)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  async function run(request: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const id = ++latest.current
    setStatus('loading')
    setError('')
    try {
      const value = await request(abort.signal)
      if (id !== latest.current) return null
      setData(value)
      setStatus('success')
      return value
    } catch (problem) {
      if (id !== latest.current) return null
      if (problem instanceof AiCancelledError) {
        setStatus('cancelled')
        return null
      }
      setError(problem instanceof Error ? problem.message : 'The suggestion could not be prepared.')
      setStatus('error')
      return null
    }
  }

  function cancel() {
    controller.current?.abort()
  }

  function reset() {
    controller.current?.abort()
    latest.current += 1
    setStatus('idle')
    setData(null)
    setError('')
  }

  return { status, data, error, run, cancel, reset, setData }
}
