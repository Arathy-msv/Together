import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fillDemoPage } from '../../lib/demoFill.ts'

/**
 * Demo-only control on every page. Writes the Greenwood sales values into the
 * fields that are open. It does not submit, publish, pay, or redeem.
 */
export function DemoFillButton() {
  const { pathname } = useLocation()
  const [status, setStatus] = useState<{ path: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const message = status?.path === pathname ? status.text : ''

  async function fill() {
    if (busy) return
    setBusy(true)
    let total = 0
    try {
      for (let pass = 0; pass < 32; pass += 1) {
        const changed = fillDemoPage()
        total += changed
        if (changed === 0) break
        await new Promise((resolve) => window.setTimeout(resolve, 40))
      }
      const text = total > 0 ? `Filled ${total} demo ${total === 1 ? 'value' : 'values'} on this page. Nothing was submitted.` : 'No empty demo fields on this page.'
      setStatus({ path: pathname, text })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="demo-fill">
      <button type="button" className="demo-fill-button" onClick={() => void fill()} disabled={busy}>
        <span className="demo-badge">Demo</span>
        {busy ? 'Filling…' : 'Fill demo values'}
      </button>
      {message ? (
        <p className="demo-fill-status" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
