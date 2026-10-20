import { createContext, useContext } from 'react'
import { orgBase } from '../../lib/organizations.ts'
import type { Organization } from '../../lib/types.ts'

export interface OrgContextValue {
  org: Organization
  /** Route prefix for this organization, e.g. `/o/maple-grove`. */
  base: string
}

export const OrgContext = createContext<OrgContextValue | null>(null)

export function orgContextValue(org: Organization): OrgContextValue {
  return { org, base: orgBase(org.slug) }
}

/** The organization for the current route. Only call inside organization routes. */
export function useOrg(): OrgContextValue {
  const value = useContext(OrgContext)
  if (!value) throw new Error('useOrg must be used inside an organization route.')
  return value
}

export function useOptionalOrg(): OrgContextValue | null {
  return useContext(OrgContext)
}

/** Organization route prefix, or '' outside organization routes (legacy links then redirect). */
export function useOrgBase(): string {
  return useContext(OrgContext)?.base ?? ''
}
