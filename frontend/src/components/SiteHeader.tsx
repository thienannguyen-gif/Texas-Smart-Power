// Deep green top bar: bolt mark and spaced wordmark on the left, nav on the right.
// HOME is the app; MORE opens the disclaimer page. (There is no About page, so no About link.)
const NAV = [
  { label: "Home", href: "/" },
  { label: "More", href: "#disclaimer" },
];

function Bolt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Texas Smart Power"
    >
      <path d="M13.5 2.5 5.5 13.5h5.2l-1.2 8 8-11h-5.2z" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-bar text-bar-fg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <a href="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-bar-line bg-bar-fg/5 text-bar-accent">
            <Bolt className="h-5 w-5" />
          </span>
          <span className="text-xs font-semibold tracking-[0.12em] whitespace-nowrap uppercase sm:text-base sm:tracking-[0.18em]">
            Texas Smart Power
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex gap-4 text-xs font-medium tracking-[0.14em] sm:gap-10 sm:text-sm sm:tracking-[0.18em]">
            {NAV.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-bar-fg-soft transition-colors hover:text-bar-fg"
                >
                  {item.label.toUpperCase()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
