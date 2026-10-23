import { useDemoStore } from '../../hooks/useDemoStore.ts'

/** Tells the supporter which sharing page (if any) will be credited, and why. */
export function ReferralCredit({ referralId }: { referralId: string | undefined }) {
  const store = useDemoStore()
  const referral = referralId ? store.referrals.find((item) => item.id === referralId) : undefined
  if (!referral) return null
  return (
    <p className="referral-credit">
      <strong>Credit: {referral.displayName}’s sharing page.</strong> The sharing page used when you began this contribution receives credit. Your
      contribution still goes to the original campaign and is counted once.
    </p>
  )
}
