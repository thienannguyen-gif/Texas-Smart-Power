// Decorative city skyline for the hero, matching the mockup's flat-grey
// buildings + trees. Purely ornamental — aria-hidden.
export function Skyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
    >
      <g fill="#c7ccc9">
        <rect x="40" y="120" width="110" height="140" />
        <rect x="170" y="80" width="90" height="180" />
        <rect x="470" y="60" width="120" height="200" />
        <rect x="760" y="100" width="100" height="160" />
        <rect x="1010" y="70" width="130" height="190" />
      </g>
      <g fill="#d8dcd8">
        <rect x="120" y="150" width="90" height="110" />
        <rect x="300" y="110" width="150" height="150" />
        <rect x="600" y="130" width="120" height="130" />
        <rect x="880" y="90" width="120" height="170" />
      </g>
      <g fill="#eef0ec">
        <rect x="230" y="180" width="80" height="80" />
        <rect x="430" y="170" width="60" height="90" />
        <rect x="700" y="160" width="70" height="100" />
        <rect x="960" y="150" width="70" height="110" />
      </g>
      <g fill="#b7bdb8">
        <rect x="0" y="200" width="60" height="60" />
        <rect x="1140" y="185" width="60" height="75" />
      </g>
      <g fill="#6f9e4b">
        <circle cx="70" cy="235" r="16" />
        <circle cx="520" cy="240" r="14" />
        <circle cx="820" cy="238" r="15" />
        <circle cx="1120" cy="236" r="16" />
      </g>
    </svg>
  );
}
