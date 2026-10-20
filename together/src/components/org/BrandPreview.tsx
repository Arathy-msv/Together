import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { themeVars } from '../../lib/theme.ts'
import type { CampaignView, Organization } from '../../lib/types.ts'
import { OrgFooter, OrgHeaderPreview } from './OrgChrome.tsx'
import { OrgContext, orgContextValue } from './OrgContext.tsx'
import { OrgHomeView } from './OrgHomeView.tsx'

const WIDTHS = { desktop: 1200, mobile: 390 } as const

/**
 * Renders the real homepage components with unsaved settings. Theme variables are scoped to this
 * frame, so the live site keeps its saved branding. Layout responds to the frame width through
 * container queries, and the frame is scaled down to fit the column.
 */
export function BrandPreview({ org, views, device }: { org: Organization; views: CampaignView[]; device: 'desktop' | 'mobile' }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(0)
  const width = WIDTHS[device]
  const vars = useMemo(() => themeVars(org.branding), [org.branding])
  const context = useMemo(() => orgContextValue(org), [org])

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      const next = Math.min(1, outer.clientWidth / width)
      setScale(next)
      setHeight(inner.offsetHeight * next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(inner)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outerRef} className={`brand-preview-stage ${device}`} style={{ height: height || undefined }}>
      <div
        ref={innerRef}
        className="brand-preview-frame org-theme org-frame pro"
        style={{ ...(vars as CSSProperties), width, transform: `scale(${scale})` }}
        inert
        aria-hidden="true"
      >
        <OrgContext.Provider value={context}>
          <OrgHeaderPreview org={org} />
          <div className="container">
            <OrgHomeView org={org} views={views} base={context.base} preview />
          </div>
          <OrgFooter org={org} base={context.base} preview />
        </OrgContext.Provider>
      </div>
    </div>
  )
}
