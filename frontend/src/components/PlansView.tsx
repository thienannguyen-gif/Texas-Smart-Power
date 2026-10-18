import { useEffect, useState, type ReactNode } from "react";
import type { TduId } from "../types/plan";
import { useTduPlans } from "../hooks/useTduPlans";
import {
  clampUsage,
  DEFAULT_USAGE_KWH,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
} from "../lib/usage";
import { EMPTY_FILTERS, filterPlans, type PlanFilters } from "../lib/filters";
import { PlanList } from "./PlanList";
import { FilterSidebar } from "./FilterSidebar";

// The results screen from the mockup: ZIPCODE pill + an editable "electricity
// usage" kWh field, then a filter sidebar beside the plan list. The usage value
// feeds every card and the details modal.
export function PlansView({
  tdu,
  zip,
  onSubmitZip,
  zipBusy = false,
  zipStatus,
}: {
  tdu: TduId;
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy?: boolean;
  /** Lookup feedback (loading / error / area picker) shown under the ZIP bar. */
  zipStatus?: ReactNode;
}) {
  const state = useTduPlans(tdu);
  const allPlans = state.status === "success" ? state.data.plans : [];
  const providers = [...new Set(allPlans.map((p) => p.companyName))].sort();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [usageKwh, setUsageKwh] = useState(DEFAULT_USAGE_KWH);
  // Current page (1-based) of the filtered, rank-ordered list. A filter
  // change goes back to page 1; a usage change leaves it alone.
  const [page, setPage] = useState(1);
  const [editingZip, setEditingZip] = useState(false);
  const [zipDraft, setZipDraft] = useState(zip);
  const zipValid = /^\d{5}$/.test(zipDraft);

  // A new area starts at page 1. Filters and usage deliberately carry over.
  useEffect(() => setPage(1), [tdu]);

  const visiblePlans = filterPlans(allPlans, filters);

  function changeFilters(next: PlanFilters) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        {editingZip ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!zipValid) return;
              setEditingZip(false);
              if (zipDraft !== zip) onSubmitZip(zipDraft);
            }}
          >
            <label className="flex items-center gap-2 rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold">
              ZIPCODE:
              <input
                autoFocus
                inputMode="numeric"
                maxLength={5}
                value={zipDraft}
                onChange={(e) => setZipDraft(e.target.value.replace(/\D/g, ""))}
                aria-label="ZIP code"
                aria-invalid={!zipValid}
                className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-1 font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={!zipValid}
              className="rounded-full bg-brand-green px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setEditingZip(false)}
              className="px-2 py-2 text-sm text-brand-navy/70 underline"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold">
              ZIPCODE: {zip}
            </span>
            <button
              type="button"
              disabled={zipBusy}
              onClick={() => {
                setZipDraft(zip);
                setEditingZip(true);
              }}
              className="px-2 py-2 text-sm text-brand-navy/70 underline disabled:opacity-50"
            >
              Change
            </button>
          </div>
        )}

        <label className="flex items-center justify-between gap-2 rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold sm:justify-start">
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
            className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-2 text-right font-normal"
          />
          kWh
        </label>
      </div>

      {zipStatus && <div className="mt-4 space-y-3">{zipStatus}</div>}

      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <FilterSidebar
          plans={allPlans}
          resultCount={visiblePlans.length}
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
  );
}
