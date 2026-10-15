import { useEffect, useState } from "react";
import {
  EMPTY_FILTERS,
  type ContractBucket,
  type PlanFilters,
  type ProductType,
  selectProvider,
} from "../lib/filters";
import { ProviderPicker } from "./ProviderPicker";

// User-preference filters are applied after the ingestion pipeline ranks plans.

const PRODUCT_TYPES: { key: ProductType; label: string }[] = [
  { key: "fixed", label: "Fixed / Secured Rate" },
  { key: "renewable100", label: "100% Renewable" },
];

const CONTRACT_BUCKETS: { key: ContractBucket; label: string }[] = [
  { key: "mtm", label: "Month-to-month" },
  { key: "m1_6", label: "1–6 months" },
  { key: "m7_12", label: "7–12 months" },
  { key: "m12plus", label: "12+ months" },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function GroupHeading({ children }: { children: string }) {
  return (
    <h3 className="text-center text-sm font-bold tracking-wide text-brand-green-700">
      {children}
    </h3>
  );
}

export function FilterSidebar({
  providers,
  value,
  onChange,
}: {
  providers: string[];
  value: PlanFilters;
  onChange: (next: PlanFilters) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const breakpoint = window.matchMedia("(min-width: 768px)");
    const syncWithViewport = (event: MediaQueryListEvent) => {
      setFiltersOpen(event.matches);
    };
    breakpoint.addEventListener("change", syncWithViewport);
    return () => breakpoint.removeEventListener("change", syncWithViewport);
  }, []);

  return (
    <aside
      className="filter-panel rounded-2xl bg-brand-lime-200 p-4 sm:p-5"
      aria-label="Filters"
    >
      <details
        open={filtersOpen}
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none text-sm font-bold tracking-wide text-brand-green-800 marker:hidden [&::-webkit-details-marker]:hidden">
          FILTERS
          <span className="float-right font-normal">Tap to expand</span>
        </summary>
        <div className="filter-panel-content mt-4 space-y-6">
          <div className="space-y-2">
            <GroupHeading>PRODUCT TYPE</GroupHeading>
            <p className="text-center text-xs text-brand-navy/50">
              (select all that apply)
            </p>
            {PRODUCT_TYPES.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-brand-navy/80"
              >
                <input
                  type="checkbox"
                  checked={value.productTypes.includes(key)}
                  onChange={() =>
                    onChange({
                      ...value,
                      productTypes: toggle(value.productTypes, key),
                    })
                  }
                  className="h-4 w-4 rounded border-brand-navy/40 accent-brand-green"
                />
                {label}
              </label>
            ))}
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="text-sm text-brand-navy/70 underline"
            >
              Show All
            </button>
          </div>

          <div className="space-y-2">
            <GroupHeading>CONTRACT LENGTH</GroupHeading>
            {CONTRACT_BUCKETS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-brand-navy/80"
              >
                <input
                  type="checkbox"
                  checked={value.contractBuckets.includes(key)}
                  onChange={() =>
                    onChange({
                      ...value,
                      contractBuckets: toggle(value.contractBuckets, key),
                    })
                  }
                  className="h-4 w-4 rounded border-brand-navy/40 accent-brand-green"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <GroupHeading>RENEWABLE ENERGY</GroupHeading>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value.minRenewablePct}
              onChange={(e) =>
                onChange({ ...value, minRenewablePct: Number(e.target.value) })
              }
              className="w-full accent-brand-green"
              aria-label="Minimum renewable percentage"
            />
            <p className="text-center text-xs text-brand-navy/60">
              at least {value.minRenewablePct}% renewable
            </p>
          </div>

          {providers.length > 0 && (
            <div className="space-y-2">
              <GroupHeading>PROVIDER</GroupHeading>
              <ProviderPicker
                providers={providers}
                selected={value.providers}
                excluded={value.excludedProviders}
                onSelect={(name) => onChange(selectProvider(value, name))}
                onUnselect={(name) =>
                  onChange({
                    ...value,
                    providers: value.providers.filter((n) => n !== name),
                  })
                }
                onUnexclude={(name) =>
                  onChange({
                    ...value,
                    excludedProviders: value.excludedProviders.filter(
                      (n) => n !== name,
                    ),
                  })
                }
              />
            </div>
          )}
        </div>
      </details>
    </aside>
  );
}
