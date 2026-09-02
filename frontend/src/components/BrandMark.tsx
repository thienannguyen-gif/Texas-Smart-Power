// The hexagon logo mark from the mockup. Decorative; paired with the wordmark.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Texas Smart Power"
    >
      <path
        d="M16 2 28 9v14L16 30 4 23V9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17 8 10 18h5l-1 6 8-11h-5z" fill="currentColor" />
    </svg>
  );
}
