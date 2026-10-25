import { useEffect, useRef, useState } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { TOU_SECTION_INTRO } from "../lib/timeOfUse";
import type { AwardPick } from "../lib/awards";
import { OurPicks } from "./OurPicks";
import { PlanCard } from "./PlanCard";
import { PlanDetailsModal } from "./PlanDetailsModal";

export const PLANS_PER_PAGE = 6;

const PAGE_BUTTON =
  "min-h-11 rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-ink hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-brand-soft";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// Plans arrive in rank order; the sidebar's preference filters have already
// been applied by the time they reach this component.
//
// Display-only pagination over the in-memory list. The current page lives in
// the parent (`page`, 1-based) so it is the parent that resets it on a filter
// change and leaves it alone on a usage change.
//
// Time-of-use plans are not ranked (docs/BRIEF.md). They arrive separately, in
// `timeOfUsePlans`, already ordered by reference rate, and are drawn in their
// own section under the ranked list. With `showRanked` off (the sidebar's
// "only time-of-use plans") only that section is drawn.
export function PlanList({
  plans,
  totalCount,
  timeOfUsePlans = [],
  showRanked = true,
  picks = [],
  generatedAt,
  page,
  onPageChange,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plans: Plan[];
  totalCount: number;
  timeOfUsePlans?: Plan[];
  showRanked?: boolean;
  /** The "Our picks" winners, from the ranked plans being shown. */
  picks?: AwardPick[];
  generatedAt: string;
  page: number;
  onPageChange: (next: number) => void;
  usageKwh?: number;
}) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const filtered = plans.length !== totalCount;

  const pageCount = Math.max(1, Math.ceil(plans.length / PLANS_PER_PAGE));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * PLANS_PER_PAGE;
  const visible = plans.slice(start, start + PLANS_PER_PAGE);
  const canPrev = current > 1;
  const canNext = current < pageCount;
  const modalOpen = selected !== null;
  const touCount = timeOfUsePlans.length;

  // A page change made by the user (buttons or arrow keys) scrolls back to the
  // top and moves focus to the results line, once the new rows are on screen.
  // Filter changes also reset the page, but those must not scroll.
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const scrollAfterPageChange = useRef(false);
  function goToPage(next: number) {
    scrollAfterPageChange.current = true;
    onPageChange(next);
  }
  useEffect(() => {
    if (!scrollAfterPageChange.current) return;
    scrollAfterPageChange.current = false;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // preventScroll: the smooth scroll above must not be cut short by a jump
    summaryRef.current?.focus({ preventScroll: true });
  }, [current]);

  // The plan count: all of them, or "Showing N of M" under a filter. In the
  // time-of-use-only view the count is of those plans.
  const summaryLine = showRanked
    ? filtered
      ? `Showing ${plans.length} of ${totalCount} ${plural(totalCount, "plan", "plans")}`
      : `${totalCount} ${plural(totalCount, "plan", "plans")}`
    : `${touCount} time-of-use ${plural(touCount, "plan", "plans")}`;

  useEffect(() => {
    if (modalOpen || !showRanked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // Arrows belong to sliders, number boxes and text fields.
      const el = e.target;
      if (
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && canPrev) goToPage(current - 1);
      else if (e.key === "ArrowRight" && canNext) goToPage(current + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, showRanked, canPrev, canNext, current]);

  return (
    <section aria-label="Plans">
      {/* Above the list, on its first page only, like the time-of-use section. */}
      {showRanked && current === 1 && (
        <OurPicks picks={picks} usageKwh={usageKwh} onOpen={setSelected} />
      )}

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p
          ref={summaryRef}
          tabIndex={-1}
          className="text-xs text-ink-soft outline-none sm:text-sm"
        >
          {summaryLine}
        </p>
        <p className="text-xs text-ink-faint">
          Updated {new Date(generatedAt).toLocaleString("en-US")}
        </p>
      </div>

      {showRanked &&
        (plans.length === 0 ? (
          <p className="text-ink-soft">
            {touCount === 0
              ? "No plans match these filters."
              : "No ranked plans match these filters."}
          </p>
        ) : (
          <>
            <ul className="space-y-4">
              {visible.map((plan) => (
                <li key={plan.id}>
                  <PlanCard
                    plan={plan}
                    usageKwh={usageKwh}
                    onMoreDetails={() => setSelected(plan)}
                  />
                </li>
              ))}
            </ul>

            <nav
              aria-label="Plan pagination"
              className="mt-6 flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => goToPage(current - 1)}
                disabled={!canPrev}
                className={PAGE_BUTTON}
              >
                ← Previous
              </button>
              <p aria-live="polite" className="text-sm font-bold text-ink">
                Page {current} of {pageCount}
              </p>
              <button
                type="button"
                onClick={() => goToPage(current + 1)}
                disabled={!canNext}
                className={PAGE_BUTTON}
              >
                Next →
              </button>
            </nav>
          </>
        ))}

      {/* Unranked, outside the paginated list: shown once, on page 1 only (and
          always in the time-of-use-only view, which has no pages). */}
      {touCount > 0 && (!showRanked || current === 1) && (
        <section
          aria-labelledby="tou-heading"
          className={showRanked ? "mt-10 border-t-2 border-line pt-6" : ""}
        >
          <h2 id="tou-heading" className="text-xl font-bold text-brand">
            Time-of-use plans{" "}
            <span className="text-sm font-semibold text-ink-soft">
              (unranked)
            </span>
          </h2>
          <p className="mt-2 text-sm text-ink-soft">{TOU_SECTION_INTRO}</p>
          <ul className="mt-4 space-y-4">
            {timeOfUsePlans.map((plan) => (
              <li key={plan.id}>
                <PlanCard
                  plan={plan}
                  usageKwh={usageKwh}
                  unranked
                  onMoreDetails={() => setSelected(plan)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!showRanked && touCount === 0 && (
        <p className="text-ink-soft">
          No time-of-use plans match these filters.
        </p>
      )}

      {selected && (
        <PlanDetailsModal
          plan={selected}
          usageKwh={usageKwh}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
