import type { CareKind } from '../../../lib/givingTree.ts'

type IconProps = { size?: number; className?: string }

export function TogetherLeaf({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M15 28C15 18 9 12 3 10c0 9 4 16 12 18Z" fill="#2f7a55" />
      <path d="M17 28c0-11 5-19 13-22 1 11-4 20-13 22Z" fill="#1b5a40" />
      <path d="M16 29V16" stroke="#123f2e" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowLeft({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 10H4M9 5l-5 5 5 5" />
    </svg>
  )
}

export function ArrowRight({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  )
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  )
}

export function InfoIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v5M10 6.2v.1" strokeLinecap="round" />
    </svg>
  )
}

export function CloudCheck({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18Z" />
      <path d="M9.5 13.5l2 2 3.5-3.6" />
    </svg>
  )
}

export function SproutMark({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21v-8" stroke="#2f6b4f" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 13C12 8 8.5 5 4 5c0 4.6 3.4 8 8 8Z" fill="#3f8a5c" />
      <path d="M12 12c0-4.4 3.2-7.4 8-7.4 0 4.4-3.4 7.4-8 7.4Z" fill="#2a6b4b" />
    </svg>
  )
}

export function CartIcon({ size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none">
      <path d="M3 7h5l4.4 18.2a2 2 0 0 0 2 1.5h15.8a2 2 0 0 0 1.9-1.4L36 13H10" stroke="#17392e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="33" r="2.6" fill="#17392e" />
      <circle cx="29" cy="33" r="2.6" fill="#17392e" />
    </svg>
  )
}

export function BookIcon({ size = 30 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="#1e4a3a" strokeWidth="2.4" strokeLinejoin="round">
      <path d="M20 10c-4-3-9-3.5-15-3v24c6-.6 11 0 15 3 4-3 9-3.6 15-3V7c-6-.5-11 0-15 3Z" fill="#cfe2d3" />
      <path d="M20 10v24" />
      <path d="M9 13c2.6-.3 5 0 7 1M9 18c2.6-.3 5 0 7 1M24 14c2-1 4.4-1.3 7-1M24 19c2-1 4.4-1.3 7-1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function LeafPoints({ size = 34 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="lp-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fb26b" />
          <stop offset="1" stopColor="#2c7046" />
        </linearGradient>
        <linearGradient id="lp-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f9a5a" />
          <stop offset="1" stopColor="#1d5638" />
        </linearGradient>
      </defs>
      <path d="M19 35C19 22 12 13 3 11c-.5 12 6 21 16 24Z" fill="url(#lp-a)" />
      <path d="M21 35c0-14 6-24 16-28 1.5 13-5 25-16 28Z" fill="url(#lp-b)" />
      <path d="M20 36V20" stroke="#1d4a33" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Painterly-style toolbar icons for each care action. */
export function CareIcon({ kind, size = 40 }: { kind: CareKind; size?: number }) {
  if (kind === 'seed') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <radialGradient id="ci-seed" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#c98a55" />
            <stop offset="0.6" stopColor="#8e4f27" />
            <stop offset="1" stopColor="#5c2f15" />
          </radialGradient>
        </defs>
        <path d="M27 7c5 4 4 15-3 22-6 6-14 6-15 2-2-6 3-17 9-22 3-2.4 6.6-3.5 9-2Z" fill="url(#ci-seed)" />
        <path d="M25 9c-2 6-6 13-13 20" stroke="#4a2410" strokeWidth="1.2" fill="none" opacity="0.6" />
        <path d="M24 10c-3 3-5 6-6 9" stroke="#f0c592" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
    )
  }
  if (kind === 'water') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="ci-drop" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#7cc8f2" />
            <stop offset="1" stopColor="#1f7fc4" />
          </linearGradient>
        </defs>
        <path d="M20 4c6 9 11 14 11 21a11 11 0 0 1-22 0C9 18 14 13 20 4Z" fill="url(#ci-drop)" />
        <path d="M14.5 24c0 3.5 2 6 5 7" stroke="#e3f5ff" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" />
      </svg>
    )
  }
  if (kind === 'fertilizer') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="ci-leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7fbf62" />
            <stop offset="1" stopColor="#2f7444" />
          </linearGradient>
        </defs>
        <path d="M20 35V17" stroke="#2c5e3a" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 20C20 12 14 7 6 7c0 8 6 13 14 13Z" fill="url(#ci-leaf)" />
        <path d="M20 23c0-8 6-14 14-14 0 8-6 14-14 14Z" fill="url(#ci-leaf)" />
        <path d="M14 13c2 1.7 4 3.7 6 6.5M26 16c-2 1.7-4 3.7-6 6.5" stroke="#d9efc9" strokeWidth="1" fill="none" opacity="0.7" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id="ci-sun" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffe48a" />
          <stop offset="0.7" stopColor="#f6b632" />
          <stop offset="1" stopColor="#e58f12" />
        </radialGradient>
      </defs>
      <g stroke="#f4a823" strokeWidth="2.6" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index * Math.PI) / 4
          return (
            <line
              key={index}
              x1={20 + Math.cos(angle) * 13}
              y1={20 + Math.sin(angle) * 13}
              x2={20 + Math.cos(angle) * 17.5}
              y2={20 + Math.sin(angle) * 17.5}
            />
          )
        })}
      </g>
      <circle cx="20" cy="20" r="9.5" fill="url(#ci-sun)" />
    </svg>
  )
}
