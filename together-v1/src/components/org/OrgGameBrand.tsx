import { Link } from 'react-router-dom'
import { LeafMark } from '../illustrations.tsx'
import { OrgLogoMark } from './OrgChrome.tsx'
import { useOptionalOrg } from './OrgContext.tsx'

/** Organization logo and name for game headers. Falls back to the Together mark outside organization routes. */
export function OrgGameBrand({ className, preview = false, size = 26 }: { className: string; preview?: boolean; size?: number }) {
  const context = useOptionalOrg()
  const content = context ? (
    <>
      <OrgLogoMark org={context.org} size={size} />
      <span className="game-brand-name">{context.org.name}</span>
    </>
  ) : (
    <>
      <LeafMark size={22} /> Together
    </>
  )
  if (preview) return <span className={`${className} game-brand`}>{content}</span>
  return (
    <Link to={context?.base ?? '/'} className={`${className} game-brand`} aria-label={`${context?.org.name ?? 'Together'} home`}>
      {content}
    </Link>
  )
}
