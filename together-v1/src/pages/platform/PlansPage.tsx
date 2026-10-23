import { useEffect } from 'react'
import { useStartWebsite } from '../../hooks/useStartWebsite.ts'

/** Legacy /plans URL — starts setup on the default demo plan. Plan choice was removed from the platform site. */
export function PlansPage() {
  const startWebsite = useStartWebsite()
  useEffect(() => {
    document.title = 'Create your website — Together'
    startWebsite()
    // Start once on entry; startWebsite is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="container narrow page-pad">
      <p className="muted">Starting your website setup…</p>
    </div>
  )
}
