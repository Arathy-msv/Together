import { useEffect, useState } from 'react'
import { loadOrganizations } from '../lib/orgStorage.ts'
import { subscribe } from '../lib/storage.ts'
import type { Organization } from '../lib/types.ts'

export function useOrganizations(): Organization[] {
  const [organizations, setOrganizations] = useState<Organization[]>(() => loadOrganizations())
  useEffect(() => subscribe(() => setOrganizations(loadOrganizations())), [])
  return organizations
}
