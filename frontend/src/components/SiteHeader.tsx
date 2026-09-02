import { BrandMark } from "./BrandMark";

// Navy top bar from the mockup: logo + wordmark left, nav right.
// The nav targets aren't defined yet — they're placeholders.
const NAV = ["Home", "About", "More"];

export function SiteHeader() {
  return (
    <header className="bg-brand-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <BrandMark className="h-7 w-7" />
          <span className="text-sm font-bold tracking-wide sm:text-base">
            TEXAS SMART POWER
          </span>
        </a>
        <nav aria-label="Primary">
          <ul className="flex gap-6 text-sm font-bold tracking-wide sm:gap-10">
            {NAV.map((item) => (
              <li key={item}>
                <a href="/" className="hover:text-brand-lime">
                  {item.toUpperCase()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
