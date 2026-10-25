import { BrandMark } from "./BrandMark";

// Navy top bar from the mockup: logo + wordmark left, nav right.
// HOME is the app; MORE opens the disclaimer page. (There is no About page, so no About link.)
const NAV = [
  { label: "Home", href: "/" },
  { label: "More", href: "#disclaimer" },
];

export function SiteHeader() {
  return (
    <header className="bg-bar text-bar-fg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <a href="/" className="flex min-w-0 items-center gap-2">
          <BrandMark className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
          <span className="whitespace-nowrap text-xs font-bold tracking-wide sm:text-base">
            TEXAS SMART POWER
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex gap-3 text-[10px] font-bold tracking-wide sm:gap-10 sm:text-sm">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="hover:text-bar-accent">
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
