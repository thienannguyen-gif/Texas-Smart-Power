import { useEffect, useState } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { summarizePlans } from "../lib/filters";
import { TOU_SECTION_INTRO } from "../lib/timeOfUse";
import { PlanCard } from "./PlanCard";
import { PlanDetailsModal } from "./PlanDetailsModal";

export const PLANS_PER_PAGE = 6;

const PAGE_BUTTON =
  "min-h-11 rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold text-brand-navy hover:bg-brand-lime-100 disabled:opacity-40 disabled:hover:bg-brand-lime-200";

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
  generatedAt,
  page,
  onPageChange,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plans: Plan[];
  totalCount: number;
  timeOfUsePlans?: Plan[];
  showRanked?: boolean;
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

  // One line: how many ranked plans are showing, how many of those are 100%
  // renewable and 12 months (parts that would say "0" are left out), and how
  // many time-of-use plans are shown separately.
  const { renewable100, months12 } = summarizePlans(plans);
  const summaryLine = showRanked
    ? [
        filtered
          ? `Showing ${plans.length} of ${totalCount} ${plural(totalCount, "plan", "plans")}`
          : `${totalCount} ${plural(totalCount, "plan", "plans")}`,
        renewable100 > 0
          ? `${renewable100} ${renewable100 === 1 ? "is" : "are"} 100% renewable`
          : null,
        months12 > 0
          ? `${months12} ${months12 === 1 ? "is" : "are"} 12 months`
          : null,
        touCount > 0
          ? `${touCount} time-of-use ${plural(touCount, "plan", "plans")} shown separately`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
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
      if (e.key === "ArrowLeft" && canPrev) onPageChange(current - 1);
      else if (e.key === "ArrowRight" && canNext) onPageChange(current + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, showRanked, canPrev, canNext, current, onPageChange]);

  return (
    <section aria-label="Plans">
      <p className="text-xs text-brand-navy/70 sm:text-sm">{summaryLine}</p>
      <p className="mb-2 text-xs text-brand-navy/50">
        Updated {new Date(generatedAt).toLocaleString("en-US")}
      </p>

      {showRanked &&
        (plans.length === 0 ? (
          <p className="text-brand-navy/70">
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
                onClick={() => onPageChange(current - 1)}
                disabled={!canPrev}
                className={PAGE_BUTTON}
              >
                ← Previous
              </button>
              <p
                aria-live="polite"
                className="text-sm font-bold text-brand-navy"
              >
                Page {current} of {pageCount}
              </p>
              <button
                type="button"
                onClick={() => onPageChange(current + 1)}
                disabled={!canNext}
                className={PAGE_BUTTON}
              >
                Next →
              </button>
            </nav>
          </>
        ))}

      {touCount > 0 && (
        <section
          aria-labelledby="tou-heading"
          className={
            showRanked ? "mt-10 border-t-2 border-brand-navy/15 pt-6" : ""
          }
        >
          <h2
            id="tou-heading"
            className="text-xl font-bold text-brand-green-700"
          >
            Time-of-use plans{" "}
            <span className="text-sm font-semibold text-brand-navy/60">
              (unranked)
            </span>
          </h2>
          <p className="mt-2 text-sm text-brand-navy/80">{TOU_SECTION_INTRO}</p>
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
        <p className="text-brand-navy/70">
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
