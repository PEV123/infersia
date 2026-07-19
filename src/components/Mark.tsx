// The Infersia mark: a monolith split by a gold seam.
export function Mark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect x="9" y="3" width="14" height="11" rx="1.4" fill="currentColor" />
      <rect x="9" y="18" width="14" height="11" rx="1.4" fill="currentColor" />
      <rect x="9" y="14.9" width="14" height="2.2" fill="#D9A441" />
    </svg>
  )
}
