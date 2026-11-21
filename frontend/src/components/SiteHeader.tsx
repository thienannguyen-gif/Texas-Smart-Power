import type { MouseEvent } from "react";
import { BrandMark } from "./BrandMark";

// Navy top bar: logo + wordmark. The disclaimer and terms are in the footer,
// where people look for legal pages.
// The logo goes home: back to the landing page as it is when the site is first
// opened (no ZIP, no plans, no usage in the address), without a reload.
export function SiteHeader({ onHome }: { onHome?: () => void }) {
  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !onHome ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return; // let "open in a new tab" work as a normal link
    }
    event.preventDefault();
    onHome();
  }

  return (
    <header className="bg-bar text-bar-fg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <a
          href="/"
          onClick={goHome}
          aria-label="Texas Smart Power — home"
          className="flex min-w-0 items-center gap-2 hover:underline focus-visible:underline"
        >
          <BrandMark className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
          <span className="text-[13px] font-bold whitespace-nowrap sm:text-base">
            Texas Smart Power
          </span>
        </a>
      </div>
    </header>
  );
}
