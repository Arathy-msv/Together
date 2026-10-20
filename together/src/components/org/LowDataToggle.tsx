import { useEffect, useState } from 'react'
import { canUseFeature } from '../../lib/features.ts'
import { setLowDataActive } from '../../lib/lowData.ts'
import type { Organization } from '../../lib/types.ts'

const KEY = 'together.lowData.v1'

function readPreference(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Optional low-data switch. Baseline accessibility and reduced-motion stay on regardless. */
export function LowDataToggle({ org }: { org: Organization }) {
  const [on, setOn] = useState(readPreference)

  useEffect(() => {
    if (!canUseFeature(org, 'lowDataMode')) {
      document.documentElement.classList.remove('low-data')
      setLowDataActive(false)
      return
    }
    document.documentElement.classList.toggle('low-data', on)
    setLowDataActive(on)
    try {
      sessionStorage.setItem(KEY, on ? '1' : '0')
    } catch {
      // Preference is best-effort.
    }
  }, [on, org])

  if (!canUseFeature(org, 'lowDataMode')) return null

  return (
    <div className="low-data-bar">
      <label className="inline-actions">
        <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} />
        <span>Low-data mode: hide photos and video until you ask, and turn off animations</span>
      </label>
    </div>
  )
}
