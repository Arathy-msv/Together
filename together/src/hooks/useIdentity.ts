import { useEffect, useState } from 'react'
import { currentSupporterId, currentUser, type DemoUser } from '../lib/identity.ts'
import { subscribe } from '../lib/storage.ts'

/** The acting demo identity (null for a guest visitor). Re-renders when it changes. */
export function useCurrentUser(): DemoUser | null {
  const [user, setUser] = useState<DemoUser | null>(() => currentUser())
  useEffect(
    () =>
      subscribe(() =>
        setUser((previous) => {
          const next = currentUser()
          return previous?.id === next?.id && previous?.name === next?.name ? previous : next
        }),
      ),
    [],
  )
  return user
}

/** Supporter profile that owns private records (receipts, vouchers, sharing pages) for the acting identity. */
export function useSupporterId(): string {
  const user = useCurrentUser()
  return user ? user.supporterProfileId : currentSupporterId()
}
