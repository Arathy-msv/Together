import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOptionalOrg } from '../../components/org/OrgContext.tsx'

export function OrgNotFound({ kind, slug }: { kind: 'organization' | 'campaign' | 'page'; slug?: string }) {
  const context = useOptionalOrg()
  const base = context?.base ?? '/'
  const name = context?.org.name ?? 'Together'

  useEffect(() => {
    document.title = 'Not found — Together'
  }, [])

  const copy =
    kind === 'organization'
      ? {
          title: 'We couldn’t find that organization',
          body: slug
            ? `There is no organization at “/o/${slug}” in this browser. Check the link, or start from the Together home page.`
            : 'Check the link, or start from the Together home page.',
          action: 'Go to Together home',
        }
      : kind === 'campaign'
        ? {
            title: 'This campaign isn’t available here',
            body: `The campaign may belong to a different organization, or it was removed when demo data was reset. You can browse ${name}’s campaigns instead.`,
            action: `Browse ${name} campaigns`,
          }
        : {
            title: 'We couldn’t find that page',
            body: 'The link may be mistyped, or the page was moved.',
            action: `Return to ${name}`,
          }

  return (
    <div className="container narrow page-pad">
      <div className="panel empty not-found">
        <span className="not-found-code" aria-hidden="true">
          404
        </span>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.body}</p>
        <Link to={kind === 'campaign' ? `${base}/campaigns` : base} className="btn btn-primary">
          {copy.action}
        </Link>
      </div>
    </div>
  )
}
