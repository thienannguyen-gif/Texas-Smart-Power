// The logo mark: a bolt on an amber rounded square. Paired with the wordmark.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Texas Smart Power"
    >
      <rect width="32" height="32" rx="8" className="fill-gold" />
      <path
        d="M17.5 6 9 18h6l-1.5 8L22 14h-6z"
        fill="none"
        className="stroke-bar"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
