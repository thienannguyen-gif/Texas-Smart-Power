import { useRef, type MouseEvent } from "react";
import { BrandMark } from "./BrandMark";

// Navy top bar: logo + wordmark left, one link right.
// The logo is the way back to the top (so there is no HOME link, which would be
// a second link to the same place). Disclaimer already says where the data comes
// from, what is left out and what the app does not know.
export function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);

  // Scroll back up and keep everything: no reload, no state cleared. If the
  // disclaimer is open, leave it first (the app underneath is only hidden).
  function backToTop(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return; // let "open in a new tab" work as a normal link
    }
    event.preventDefault();
    if (window.location.hash) window.location.hash = "";
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    headerRef.current?.scrollIntoView?.({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <header ref={headerRef} className="bg-bar text-bar-fg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <a
          href="/"
          onClick={backToTop}
          aria-label="Texas Smart Power — back to top"
          className="flex min-w-0 items-center gap-2 hover:underline focus-visible:underline"
        >
          <BrandMark className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
          <span className="whitespace-nowrap text-[13px] font-bold tracking-wide sm:text-base">
            TEXAS SMART POWER
          </span>
        </a>
        <nav aria-label="Primary">
          <a
            href="#disclaimer"
            className="text-[13px] font-bold tracking-wide hover:text-bar-fg-soft sm:text-sm sm:uppercase"
          >
            Disclaimer
          </a>
        </nav>
      </div>
    </header>
  );
}
