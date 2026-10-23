import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDemoStore } from '../../hooks/useDemoStore.ts'
import { useCurrentUser, useSupporterId } from '../../hooks/useIdentity.ts'
import { useVoucherStore } from '../../hooks/useVoucherStore.ts'
import { useOptionalOrg } from '../org/OrgContext.tsx'
import { hasActivity } from '../../lib/follows.ts'
import { canUseFeature } from '../../lib/features.ts'
import { holderVouchers } from '../../lib/vouchers.ts'
import { DemoIdentitySwitcher } from './DemoIdentitySwitcher.tsx'

/**
 * Demo-only utilities (identity switching, merchant and admin entry points) folded into one
 * clearly labelled menu, so they never sit in the main navigation.
 * On a public organization site, My activity also lives here.
 */
export function DemoToolsMenu({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser()
  const orgCtx = useOptionalOrg()
  const demo = useDemoStore()
  const vouchers = useVoucherStore()
  const supporterId = useSupporterId()
  const showActivity =
    orgCtx != null &&
    hasActivity(
      demo.campaigns.filter((item) => item.organizationId === orgCtx.org.id).map((item) => item.id),
      holderVouchers(vouchers, orgCtx.org.id, supporterId).length > 0,
      canUseFeature(orgCtx.org, 'supporterHistory'),
    )
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    function close(event: Event) {
      const node = ref.current
      if (!node?.open) return
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return
        node.open = false
        node.querySelector('summary')?.focus()
      } else if (!node.contains(event.target as Node)) node.open = false
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [])
  return (
    <details className="demo-tools" ref={ref}>
      <summary>
        <span className="demo-badge small-badge">Demo</span>
        <span className="demo-tools-who">{user ? user.name : 'Guest visitor'}</span>
      </summary>
      <div className="demo-tools-menu">
        <DemoIdentitySwitcher compact={compact} />
        <nav aria-label="Demo tools" className="demo-tools-links">
          {showActivity ? <Link to={`${orgCtx.base}/my-activity`}>My activity</Link> : null}
          <Link to="/demo-identities">About demo identities</Link>
          <Link to="/workspace">Choose a demo workspace</Link>
          <Link to="/merchant">Merchant portal</Link>
          <Link to="/admin">Platform admin</Link>
        </nav>
      </div>
    </details>
  )
}
