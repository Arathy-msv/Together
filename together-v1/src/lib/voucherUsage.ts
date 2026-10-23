import type { VoucherCapability } from './types.ts'

export const VOUCHER_STORAGE_KEY = 'together.vouchers.v1'

const CAPABILITIES: VoucherCapability[] = ['contributionRewards', 'storeValueVouchers', 'onlineOffers']

/**
 * Capabilities an organization has already used, read straight from storage. Only used to migrate
 * organizations saved before vouchers were an optional module. Has no imports so organization
 * normalization can call it without an import cycle.
 */
export function voucherUsage(organizationId: string): VoucherCapability[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(VOUCHER_STORAGE_KEY) ?? 'null') as {
      offers?: { organizationId?: unknown; capability?: unknown }[]
      vouchers?: { organizationId?: unknown; capability?: unknown }[]
    } | null
    const used = new Set<VoucherCapability>()
    for (const item of [...(parsed?.offers ?? []), ...(parsed?.vouchers ?? [])]) {
      if (item?.organizationId === organizationId && CAPABILITIES.includes(item.capability as VoucherCapability)) {
        used.add(item.capability as VoucherCapability)
      }
    }
    return [...used]
  } catch {
    return []
  }
}
