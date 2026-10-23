export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28c-1.2-6.6 1.6-12.3 9.6-15.2 0.8 7.4-3.4 13.2-9.6 15.2Z" fill="#2F6B4F" />
      <path d="M16 28C9.8 26 5.6 20.2 6.4 12.8 14.4 15.7 17.2 21.4 16 28Z" fill="#7FA35B" />
      <path d="M16 20c-1.6-4.2-0.8-8.6 2.2-12.4 2.4 4.1 1.6 8.6-2.2 12.4Z" fill="#E9A23B" />
    </svg>
  )
}
