import { useEffect, useState, type ReactNode } from "react";
import type { TduId } from "../types/plan";
import { useTduPlans } from "../hooks/useTduPlans";
import { useIsDesktop } from "../hooks/useIsDesktop";
import {
  clampUsage,
  DEFAULT_USAGE_KWH,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
} from "../lib/usage";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filterPlans,
  type PlanFilters,
} from "../lib/filters";
import { PlanList } from "./PlanList";
import { FilterPanel } from "./FilterPanel";
import { FilterDrawer } from "./FilterDrawer";

const PILL =
  "rounded-full bg-brand-lime-200 px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm";
const LINK =
  "px-2 py-1.5 text-xs text-brand-navy/70 underline disabled:opacity-50 sm:py-2 sm:text-sm";

// The results screen from the mockup. A sticky bar holds the ZIP (and, for a
// split ZIP, the area), the usage field and — on phones — the Filters button;
// below it the filters sit beside the plan list (a drawer on phones). The usage
// value feeds every card and the details modal.
export function PlansView({
  tdu,
  zip,
  onSubmitZip,
  zipBusy = false,
  zipStatus,
  areaSwitch,
}: {
  tdu: TduId;
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy?: boolean;
  /** Lookup feedback (loading / error / area picker) shown under the bar. */
  zipStatus?: ReactNode;
  /** Set only when this ZIP returned several utilities: the bar then shows a
   *  select of them, labelled with each area's full company name. */
  areaSwitch?: {
    currentCode: string;
    options: { code: string; label: string }[];
    onSelect: (code: string) => void;
  };
}) {
  const state = useTduPlans(tdu);
  const isDesktop = useIsDesktop();
  const allPlans = state.status === "success" ? state.data.plans : [];
  const providers = [...new Set(allPlans.map((p) => p.companyName))].sort();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [usageKwh, setUsageKwh] = useState(DEFAULT_USAGE_KWH);
  // Current page (1-based) of the filtered, rank-ordered list. A filter
  // change goes back to page 1; a usage change leaves it alone.
  const [page, setPage] = useState(1);
  const [editingZip, setEditingZip] = useState(false);
  const [zipDraft, setZipDraft] = useState(zip);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const zipValid = /^\d{5}$/.test(zipDraft);

  // A new area starts at page 1. Filters and usage deliberately carry over.
  useEffect(() => setPage(1), [tdu]);

  // The drawer only exists on phones; close it if the window grows past that.
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  const visiblePlans = filterPlans(allPlans, filters);
  const activeCount = activeFilterCount(filters);

  function changeFilters(next: PlanFilters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-brand-navy/10 bg-brand-lime/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3">
          {editingZip ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!zipValid) return;
                setEditingZip(false);
                // Always forwarded: the parent decides what a repeated ZIP
                // means (for a split ZIP, it re-opens the area choice).
                onSubmitZip(zipDraft);
              }}
            >
              <label className={`flex items-center gap-2 ${PILL}`}>
                ZIPCODE:
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={5}
                  value={zipDraft}
                  onChange={(e) =>
                    setZipDraft(e.target.value.replace(/\D/g, ""))
                  }
                  aria-label="ZIP code"
                  aria-invalid={!zipValid}
                  className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-1 text-base font-normal sm:text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={!zipValid}
                className="min-h-9 rounded-full bg-brand-green px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50 sm:text-sm"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => setEditingZip(false)}
                className={LINK}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 sm:gap-x-3">
              <span className={PILL}>ZIPCODE: {zip}</span>
              <button
                type="button"
                disabled={zipBusy}
                onClick={() => {
                  setZipDraft(zip);
                  setEditingZip(true);
                }}
                className={LINK}
              >
                Change
              </button>
              {areaSwitch && (
                <>
                  <span aria-hidden="true" className="text-brand-navy/40">
                    |
                  </span>
                  <label className="flex min-w-0 items-center gap-2 text-xs font-bold sm:text-sm">
                    AREA:
                    <select
                      value={areaSwitch.currentCode}
                      onChange={(e) => areaSwitch.onSelect(e.target.value)}
                      aria-label="Utility area"
                      className="min-h-9 max-w-[15rem] min-w-0 truncate rounded-full border-0 bg-brand-lime-200 py-1.5 pr-2 pl-3 text-base font-bold sm:max-w-xs sm:text-sm"
                    >
                      {areaSwitch.options.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <label className={`flex items-center gap-2 ${PILL}`}>
              <span>
                <span className="hidden sm:inline">Electricity </span>
                usage
              </span>
              <input
                type="number"
                min={MIN_USAGE_KWH}
                max={MAX_USAGE_KWH}
                step={50}
                value={usageKwh}
                onChange={(e) => setUsageKwh(Number(e.target.value))}
                onBlur={(e) => setUsageKwh(clampUsage(Number(e.target.value)))}
                aria-label="Monthly usage in kWh"
                className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-1 text-right text-base font-normal sm:text-sm"
              />
              kWh
            </label>
            {!isDesktop && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-haspopup="dialog"
                className="min-h-10 rounded-full bg-brand-green px-4 py-1.5 text-sm font-bold text-white"
              >
                {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:px-6">
        {zipStatus && <div className="space-y-3">{zipStatus}</div>}

        <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
          {isDesktop && (
            // Sticks below the sticky bar (about 4rem tall) with a small gap, and
            // scrolls inside itself when taller than the screen, so the provider
            // search at the bottom stays reachable.
            <aside
              aria-label="Filters"
              className="sticky top-20 max-h-[calc(100dvh-6rem)] self-start overflow-y-auto rounded-2xl bg-brand-lime-200 p-5"
            >
              <FilterPanel
                plans={allPlans}
                providers={providers}
                value={filters}
                onChange={changeFilters}
              />
            </aside>
          )}

          <main>
            {state.status === "loading" && (
              <p role="status" className="text-brand-navy/70">
                Loading plans…
              </p>
            )}

            {state.status === "error" && (
              <div
                role="alert"
                className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800"
              >
                <p className="font-bold">Couldn’t load plans.</p>
                <p className="mt-1 text-sm">{state.error}</p>
              </div>
            )}

            {state.status === "empty" && (
              <p className="text-brand-navy/70">
                No plans available for{" "}
                <span className="font-semibold">{state.tdu}</span> right now.
                Check back after the next data refresh.
              </p>
            )}

            {state.status === "success" && (
              <PlanList
                plans={visiblePlans}
                totalCount={state.data.plans.length}
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
          providers={providers}
          applied={filters}
          onApply={(next) => {
            changeFilters(next);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}
