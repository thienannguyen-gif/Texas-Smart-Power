import { useEffect, useRef, useState } from "react";
import type { Plan } from "../types/plan";
import { EMPTY_FILTERS, splitForView, type PlanFilters } from "../lib/filters";
import type { SortMode } from "../lib/sort";
import { FilterPanel } from "./FilterPanel";

// Phone-only slide-up panel holding the sort and the filters. Edits go to a
// draft: Apply commits both, Clear empties the filters in the draft (the sort
// is not a filter, so it stays as chosen), and closing any other way (✕, backdrop,
// Escape) throws it away.
export function FilterDrawer({
  plans,
  timeOfUsePlans,
  providers,
  applied,
  appliedSort,
  onApply,
  onClose,
}: {
  plans: Plan[];
  timeOfUsePlans: Plan[];
  providers: string[];
  /** The filters currently in effect; the draft starts as a copy. */
  applied: PlanFilters;
  /** The sort in effect; the draft starts as a copy. */
  appliedSort: SortMode;
  onApply: (next: PlanFilters, sort: SortMode) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(applied);
  const [draftSort, setDraftSort] = useState(appliedSort);
  const closeRef = useRef<HTMLButtonElement>(null);
  const view = splitForView(plans, timeOfUsePlans, draft);
  const matching = view.ranked.length + view.timeOfUse.length;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // keep the page behind the drawer from scrolling
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-scrim"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="slide-up flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-brand-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="text-sm font-bold tracking-wide text-brand">
            FILTERS
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="min-h-11 min-w-11 rounded-full text-ink-soft hover:bg-surface-alt"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel
            plans={plans}
            timeOfUsePlans={timeOfUsePlans}
            providers={providers}
            value={draft}
            onChange={setDraft}
            sort={draftSort}
            onSortChange={setDraftSort}
          />
        </div>

        <div className="border-t border-line-soft px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-center text-xs text-ink-soft">
            {matching} {matching === 1 ? "plan matches" : "plans match"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="min-h-11 flex-1 rounded-full border-2 border-line px-4 py-2 text-sm font-bold text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onApply(draft, draftSort)}
              className="min-h-11 flex-1 rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-ink"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
