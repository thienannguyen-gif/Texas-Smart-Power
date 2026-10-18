import { useEffect, useRef, useState } from "react";
import type { Plan } from "../types/plan";
import { EMPTY_FILTERS, filterPlans, type PlanFilters } from "../lib/filters";
import { FilterPanel } from "./FilterPanel";

// Phone-only slide-up panel holding the filters. Edits go to a draft: Apply
// commits it, Clear empties the draft, and closing any other way (✕, backdrop,
// Escape) throws it away.
export function FilterDrawer({
  plans,
  providers,
  applied,
  onApply,
  onClose,
}: {
  plans: Plan[];
  providers: string[];
  /** The filters currently in effect; the draft starts as a copy. */
  applied: PlanFilters;
  onApply: (next: PlanFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(applied);
  const closeRef = useRef<HTMLButtonElement>(null);
  const matching = filterPlans(plans, draft).length;

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
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="slide-up flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-brand-lime-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="text-sm font-bold tracking-wide text-brand-green-800">
            FILTERS
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="min-h-11 min-w-11 rounded-full text-brand-navy/70 hover:bg-brand-lime-100"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-4">
          <FilterPanel
            plans={plans}
            providers={providers}
            value={draft}
            onChange={setDraft}
          />
        </div>

        <div className="border-t border-brand-navy/10 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-center text-xs text-brand-navy/60">
            {matching} {matching === 1 ? "plan matches" : "plans match"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_FILTERS)}
              className="min-h-11 flex-1 rounded-full border-2 border-brand-navy/30 px-4 py-2 text-sm font-bold text-brand-navy"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="min-h-11 flex-1 rounded-full bg-brand-green px-4 py-2 text-sm font-bold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
