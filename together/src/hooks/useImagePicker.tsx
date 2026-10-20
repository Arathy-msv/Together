import { useRef, useState, type ChangeEvent } from 'react'
import { IMAGE_ACCEPT, readImageFile } from '../lib/image.ts'

/** Hidden file input plus processing state for one image field. Images are resized before storage. */
export function useImagePicker(onPicked: (dataUrl: string) => void, options: Parameters<typeof readImageFile>[1]) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onPicked(await readImageFile(file, options))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That image could not be used.')
    } finally {
      setBusy(false)
    }
  }

  const input = (
    <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} hidden onChange={(event) => void onChange(event)} />
  )
  return { input, open: () => inputRef.current?.click(), busy, error }
}
