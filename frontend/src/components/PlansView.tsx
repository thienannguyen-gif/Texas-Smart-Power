import { useState } from "react";
import type { TduId } from "../types/plan";
import { useTduPlans } from "../hooks/useTduPlans";
import {
  clampUsage,
  DEFAULT_USAGE_KWH,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
} from "../lib/usage";
import {
  EMPTY_FILTERS,
  excludeProvider,
  filterPlans,
  type PlanFilters,
} from "../lib/filters";
import { PlanList } from "./PlanList";
import { FilterSidebar } from "./FilterSidebar";

// The results screen from the mockup: ZIPCODE pill + an editable "electricity
// usage" kWh field, then a filter sidebar beside the plan list. The usage value
// feeds every card and the details modal.
export function PlansView({
  tdu,
  zip,
  onChangeZip,
}: {
  tdu: TduId;
  zip: string;
  onChangeZip: () => void;
}) {
  const state = useTduPlans(tdu);
  const providers =
    state.status === "success"
      ? [...new Set(state.data.plans.map((p) => p.companyName))].sort()
      : [];

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [usageKwh, setUsageKwh] = useState(DEFAULT_USAGE_KWH);
  // Current page (1-based) of the filtered list. A filter change goes back to
  // page 1; a usage change leaves it alone, so after any re-ranking the user
  // stays on the same page number.
  const [page, setPage] = useState(1);

  function changeFilters(next: PlanFilters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold">
            ZIPCODE: {zip}
          </span>
          <button
            type="button"
            onClick={onChangeZip}
            className="text-sm text-brand-navy/70 underline"
          >
            Change
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold">
          Electricity usage
          <input
            type="number"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={50}
            value={usageKwh}
            onChange={(e) => setUsageKwh(Number(e.target.value))}
            onBlur={(e) => setUsageKwh(clampUsage(Number(e.target.value)))}
            aria-label="Monthly usage in kWh"
            className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-1 text-right font-normal"
          />
          kWh
        </label>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <FilterSidebar
          providers={providers}
          value={filters}
          onChange={changeFilters}
        />

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
              plans={filterPlans(state.data.plans, filters)}
              totalCount={state.data.plans.length}
              generatedAt={state.data.generatedAt}
              page={page}
              onPageChange={setPage}
              onHideProvider={(name) =>
                changeFilters(excludeProvider(filters, name))
              }
              usageKwh={usageKwh}
            />
          )}
        </main>
      </div>
    </div>
  );
}
