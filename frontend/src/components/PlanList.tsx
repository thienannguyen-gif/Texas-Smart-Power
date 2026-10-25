import { Fragment, useEffect, useState, type ReactNode } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { summarizePlans } from "../lib/filters";
import { formatKwh } from "../lib/money";
import { priceCurveWarning } from "../lib/ranking";
import { TOU_SECTION_INTRO } from "../lib/timeOfUse";
import { PlanCard } from "./PlanCard";
import { PlanDetailsModal } from "./PlanDetailsModal";
import { ROW_GRID } from "./planRow";

export const PLANS_PER_PAGE = 6;

const PAGE_BUTTON =
  "min-h-11 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt disabled:opacity-40 disabled:hover:bg-surface";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const bold = (n: number) => <strong className="font-semibold">{n}</strong>;

/** "24 Oct 2026, 4:42 PM" — the date and time the data was last pulled. */
function formatUpdated(iso: string): string {
  const when = new Date(iso);
  const date = when.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = when.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

// Column titles over the rows. Wide screens only: on a phone each value carries
// its own label.
function RowHeader({
  unranked = false,
  usageKwh,
}: {
  unranked?: boolean;
  usageKwh: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`label-mono hidden border-b border-line-soft pr-[17px] pb-2 pl-5 row:grid row:items-end ${ROW_GRID}`}
    >
      <span>Plan</span>
      <span className="text-right">Est. bill</span>
      <span className="text-right">
        {unranked ? "Ref. rate / kWh" : "Rate / kWh"}
        {/* the usage level the rates are quoted at, said once here */}
        <span className="block tracking-normal normal-case">
          at {formatKwh(usageKwh)} kWh
        </span>
      </span>
      <span className="text-right">Term</span>
      <span className="text-right">Renewable</span>
      <span />
    </div>
  );
}

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
  bestMatchId,
  generatedAt,
  page,
  onPageChange,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plans: Plan[];
  totalCount: number;
  timeOfUsePlans?: Plan[];
  showRanked?: boolean;
  /** The plan to mark "Best match": the top one under Best match sorting. */
  bestMatchId?: number;
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
  const anyFlagged = visible.some((plan) => priceCurveWarning(plan) !== null);

  // One line: how many ranked plans are showing, how many of those are 100%
  // renewable and 12 months (parts that would say "0" are left out), and how
  // many time-of-use plans are shown separately.
  const { renewable100, months12 } = summarizePlans(plans);
  const parts: ReactNode[] = showRanked
    ? [
        filtered ? (
          <>
            Showing {bold(plans.length)} of {bold(totalCount)}{" "}
            {plural(totalCount, "plan", "plans")}
          </>
        ) : (
          <>
            {bold(totalCount)} {plural(totalCount, "plan", "plans")}
          </>
        ),
        renewable100 > 0 && (
          <>
            {bold(renewable100)} {renewable100 === 1 ? "is" : "are"} 100%
            renewable
          </>
        ),
        months12 > 0 && (
          <>
            {bold(months12)} {months12 === 1 ? "is" : "are"} 12 months
          </>
        ),
        touCount > 0 && (
          <>
            {bold(touCount)} time-of-use {plural(touCount, "plan", "plans")}{" "}
            shown separately
          </>
        ),
      ].filter(Boolean)
    : [
        <>
          {bold(touCount)} time-of-use {plural(touCount, "plan", "plans")}
        </>,
      ];

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p data-testid="results-summary" className="text-[15px]">
          {parts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && " · "}
              {part}
            </Fragment>
          ))}
        </p>
        <p className="ml-auto font-mono text-xs text-ink-faint">
          Updated {formatUpdated(generatedAt)}
        </p>
      </div>

      {showRanked &&
        (plans.length === 0 ? (
          <p className="mt-6 text-ink-soft">
            {touCount === 0
              ? "No plans match these filters."
              : "No ranked plans match these filters."}
          </p>
        ) : (
          <div className="mt-5">
            <RowHeader usageKwh={usageKwh} />
            <ul className="overflow-hidden rounded-lg border border-line bg-surface">
              {visible.map((plan) => (
                <li
                  key={plan.id}
                  className="border-b border-line-soft last:border-b-0"
                >
                  <PlanCard
                    plan={plan}
                    usageKwh={usageKwh}
                    bestMatch={plan.id === bestMatchId}
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
              <p aria-live="polite" className="font-mono text-sm text-ink">
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

            {anyFlagged && (
              <p className="mt-8 rounded-lg border border-line bg-surface-alt p-5 text-[15px] leading-relaxed">
                <strong className="font-semibold">
                  Plans with the Unstable price mark are flagged.
                </strong>{" "}
                Their rate per kWh dips or rises around 1,000 kWh compared with
                500 and 2,000 — the signature of a usage-based bill credit. It
                pays off only if your usage lands in a narrow window. They still
                appear in the list, but rank lower.
              </p>
            )}
          </div>
        ))}

      {touCount > 0 && (
        <section
          aria-labelledby="tou-heading"
          className={showRanked ? "mt-10 border-t border-line pt-6" : "mt-5"}
        >
          <h2 id="tou-heading" className="font-display text-xl font-semibold">
            Time-of-use plans{" "}
            <span className="label-mono align-middle">(unranked)</span>
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">{TOU_SECTION_INTRO}</p>
          <div className="mt-5">
            <RowHeader unranked usageKwh={usageKwh} />
            <ul className="overflow-hidden rounded-lg border border-line bg-surface">
              {timeOfUsePlans.map((plan) => (
                <li
                  key={plan.id}
                  className="border-b border-line-soft last:border-b-0"
                >
                  <PlanCard
                    plan={plan}
                    usageKwh={usageKwh}
                    unranked
                    onMoreDetails={() => setSelected(plan)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!showRanked && touCount === 0 && (
        <p className="mt-6 text-ink-soft">
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
