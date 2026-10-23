import { useState } from 'react'
import { loadStore, dismissUnreadableNotice, unreadableSavedAt } from '../lib/storage.ts'
import { formatDateTime } from '../lib/format.ts'

/** Tells the visitor when saved data could not be read and sample data was loaded instead. */
export function UnreadableDataNotice() {
  const [savedAt, setSavedAt] = useState(() => {
    loadStore()
    return unreadableSavedAt()
  })
  if (!savedAt) return null
  return (
    <div className="unreadable-notice" role="status">
      <p>
        <strong>Your saved demo data couldn’t be read</strong>, so sample data was loaded on {formatDateTime(savedAt)}. A copy of the unreadable data is kept in
        this browser and nothing else was deleted.
      </p>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => {
          dismissUnreadableNotice()
          setSavedAt(null)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
