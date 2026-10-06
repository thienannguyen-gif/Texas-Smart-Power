import { useEffect, useState } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { PlanCard } from "./PlanCard";
import { PlanDetailsModal } from "./PlanDetailsModal";

export const PLANS_PER_PAGE = 6;

const PAGE_BUTTON =
  "rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold text-brand-navy hover:bg-brand-lime-100 disabled:opacity-40 disabled:hover:bg-brand-lime-200";

// Plans render in the order delivered — no scoring. Ranking and the stability
// filter come later, once BRIEF.md defines them. The sidebar's preference
// filters have already been applied to `plans` by the time they reach here.
//
// Display-only pagination over the in-memory list. The current page lives in
// the parent (`page`, 1-based) so it is the parent that resets it on a filter
// change and leaves it alone on a usage change.
export function PlanList({
  plans,
  totalCount,
  generatedAt,
  page,
  onPageChange,
  onHideProvider,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plans: Plan[];
  totalCount: number;
  generatedAt: string;
  page: number;
  onPageChange: (next: number) => void;
  onHideProvider?: (companyName: string) => void;
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

  useEffect(() => {
    if (modalOpen) return;
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
  }, [modalOpen, canPrev, canNext, current, onPageChange]);

  return (
    <section aria-label="Plans">
      <p className="mb-1 text-sm text-brand-navy/70">
        {filtered
          ? `Showing ${plans.length} of ${totalCount} plans`
          : `${totalCount} ${totalCount === 1 ? "plan" : "plans"}`}{" "}
        · updated {new Date(generatedAt).toLocaleString("en-US")}
      </p>
      <p className="mb-4 text-xs text-brand-green-800">
        Unranked scaffold view — listed in the order the data provides.
      </p>

      {plans.length === 0 ? (
        <p className="text-brand-navy/70">No plans match these filters.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {visible.map((plan) => (
              <li key={plan.id}>
                <PlanCard
                  plan={plan}
                  usageKwh={usageKwh}
                  onMoreDetails={() => setSelected(plan)}
                  onHideProvider={onHideProvider}
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
            <p aria-live="polite" className="text-sm font-bold text-brand-navy">
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
