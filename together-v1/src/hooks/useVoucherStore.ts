import { useEffect, useState } from 'react'
import { subscribe } from '../lib/storage.ts'
import { currentSupporterProfile, loadVoucherStore, type SupporterProfile, type VoucherStore } from '../lib/vouchers.ts'

export function useVoucherStore(): VoucherStore {
  const [store, setStore] = useState<VoucherStore>(() => loadVoucherStore())
  useEffect(() => subscribe(() => setStore(loadVoucherStore())), [])
  return store
}

export function useSupporterProfile(): SupporterProfile | null {
  const [profile, setProfile] = useState<SupporterProfile | null>(() => currentSupporterProfile())
  useEffect(() => subscribe(() => setProfile(currentSupporterProfile())), [])
  return profile
}
