import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TduId } from "../types/plan";
import { useTduPlans } from "../hooks/useTduPlans";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  splitForView,
  type PlanFilters,
} from "../lib/filters";
import { sortPlans, type SortMode } from "../lib/sort";
import { PlanList } from "./PlanList";
import { PlansHeader } from "./PlansHeader";
import { CompactBar } from "./CompactBar";
import type { AreaChoice } from "./AreaCard";
import { FilterPanel } from "./FilterPanel";
import { FilterDrawer } from "./FilterDrawer";

// The results screen. The header (search, usage, and for a split ZIP the area)
// sits at the top of the page; once it scrolls away, a slim bar keeps the ZIP,
// area and usage in reach. Below it the filters sit beside the plan list (a
// drawer on phones). The usage value feeds every card and the details modal.
export function PlansView({
  tdu,
  zip,
  onSubmitZip,
  zipBusy = false,
  zipStatus,
  areaChoice,
  serviceArea,
}: {
  tdu: TduId;
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy?: boolean;
  /** Lookup feedback (loading / error) shown under the header. */
  zipStatus?: ReactNode;
  /** Set only when this ZIP returned several utilities. */
  areaChoice?: AreaChoice;
  /** Name of the utility area whose plans are showing (search band). */
  serviceArea?: string;
}) {
  const state = useTduPlans(tdu);
  const isDesktop = useIsDesktop();
  // Ranked plans and time-of-use plans are two separate lists. A data file
  // written before they were split keeps its time-of-use plans inside `plans`
  // (scored with the rest until the next ingestion run), so sort them out here.
  const data = state.status === "success" ? state.data : null;
  const allPlans = (data?.plans ?? []).filter((p) => !p.isTimeOfUse);
  const timeOfUsePlans = [
    ...(data?.timeOfUsePlans ?? []),
    ...(data?.plans ?? []).filter((p) => p.isTimeOfUse),
  ];
  const providers = [
    ...new Set([...allPlans, ...timeOfUsePlans].map((p) => p.companyName)),
  ].sort();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [usageKwh, setUsageKwh] = useState(DEFAULT_USAGE_KWH);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  // Current page (1-based) of the filtered, rank-ordered list. A filter
  // change goes back to page 1; a usage change leaves it alone.
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The slim bar shows once the full header has scrolled out of view.
  const headerRef = useRef<HTMLDivElement>(null);
  const [showCompact, setShowCompact] = useState(false);
  useEffect(() => {
    const update = () => {
      const header = headerRef.current;
      setShowCompact(
        header !== null && header.getBoundingClientRect().bottom < 0,
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // A new area starts at page 1. Filters and usage deliberately carry over.
  useEffect(() => setPage(1), [tdu]);

  // The drawer only exists on phones; close it if the window grows past that.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  // Filter first, then order. "Best match" keeps the ranked order from
  // ingestion; "Lowest bill" re-sorts by the bill at the current usage, so it
  // follows the usage field on every render. The time-of-use section is always
  // cheapest reference rate first, whatever the sort above it says.
  const view = splitForView(allPlans, timeOfUsePlans, filters);
  const visiblePlans = sortPlans(view.ranked, sortMode, usageKwh);
  const visibleTimeOfUse = sortPlans(view.timeOfUse, "lowestBill", usageKwh);
  const activeCount = activeFilterCount(filters);

  function changeSort(next: SortMode) {
    setSortMode(next);
    setPage(1);
  }

  function changeFilters(next: PlanFilters) {
    setFilters(next);
    setPage(1);
  }

  const chosenArea = areaChoice?.options.find(
    (option) => option.code === areaChoice.currentCode,
  );

  const filtersButton = (extraClass: string) =>
    !isDesktop && (
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-haspopup="dialog"
        className={`min-h-10 rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-ink ${extraClass}`}
      >
        {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
      </button>
    );

  return (
    <div>
      <div ref={headerRef}>
        <PlansHeader
          zip={zip}
          onSubmitZip={onSubmitZip}
          zipBusy={zipBusy}
          usageKwh={usageKwh}
          onUsageChange={setUsageKwh}
          areaChoice={areaChoice}
          serviceArea={serviceArea}
        />
      </div>

      {showCompact && (
        <CompactBar
          zip={zip}
          areaLabel={chosenArea?.label}
          usageKwh={usageKwh}
          onUsageChange={setUsageKwh}
          trailing={filtersButton("shrink-0 px-3")}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        {!isDesktop && (
          <div className="mx-auto mb-4 max-w-xl">{filtersButton("w-full")}</div>
        )}

        {zipStatus && <div className="space-y-3">{zipStatus}</div>}

        <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
          {isDesktop && (
            // Sticks below the slim bar (about 3.25rem tall) with a small gap,
            // and scrolls inside itself when taller than the screen, so the
            // provider search at the bottom stays reachable.
            <aside
              aria-label="Filters"
              className="sticky top-20 max-h-[calc(100dvh-6rem)] self-start overflow-y-auto rounded-2xl bg-brand-soft p-5"
            >
              <FilterPanel
                plans={allPlans}
                timeOfUsePlans={timeOfUsePlans}
                providers={providers}
                value={filters}
                onChange={changeFilters}
                sort={sortMode}
                onSortChange={changeSort}
              />
            </aside>
          )}

          <main>
            {state.status === "loading" && (
              <p role="status" className="text-ink-soft">
                Loading plans…
              </p>
            )}

            {state.status === "error" && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-danger-line bg-danger-soft p-4 text-danger"
              >
                <p className="font-bold">Couldn’t load plans.</p>
                <p className="mt-1 text-sm">{state.error}</p>
              </div>
            )}

            {state.status === "empty" && (
              <p className="text-ink-soft">
                No plans available for{" "}
                <span className="font-semibold">{state.tdu}</span> right now.
                Check back after the next data refresh.
              </p>
            )}

            {state.status === "success" && (
              <PlanList
                plans={visiblePlans}
                totalCount={allPlans.length}
                timeOfUsePlans={visibleTimeOfUse}
                showRanked={!filters.onlyTimeOfUse}
                generatedAt={state.data.generatedAt}
                page={page}
                onPageChange={setPage}
                usageKwh={usageKwh}
              />
            )}
          </main>
        </div>
      </div>

      {drawerOpen && !isDesktop && (
        <FilterDrawer
          plans={allPlans}
          timeOfUsePlans={timeOfUsePlans}
          providers={providers}
          applied={filters}
          appliedSort={sortMode}
          onApply={(next, sort) => {
            changeFilters(next);
            changeSort(sort);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
