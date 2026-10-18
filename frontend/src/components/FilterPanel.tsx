import type { Plan } from "../types/plan";
import {
  countForOption,
  countForProvider,
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

// One checkbox with its match count, e.g. "Fixed / Secured Rate (84)". An option
// with no matches is greyed, never hidden; a ticked one stays clickable so the
// user can always untick it. `count` is null until the plans have loaded.
function OptionRow({
  label,
  count,
  noneInArea,
  checked,
  onToggle,
}: {
  label: string;
  count: number | null;
  /** No plan in the whole area matches (before any filter). */
  noneInArea: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const empty = count === 0;
  return (
    <label
      className={`flex items-center gap-2 py-1.5 text-sm md:py-0 ${
        empty ? "text-brand-navy/40" : "text-brand-navy/80"
      }`}
    >
      <input
        type="checkbox"
        disabled={empty && !checked}
        checked={checked}
        onChange={onToggle}
        className="h-5 w-5 rounded border-brand-navy/40 accent-brand-green md:h-4 md:w-4"
      />
      <span>
        {label}
        {count !== null && ` (${count})`}
      </span>
      {noneInArea && <span className="text-xs">No plans available</span>}
    </label>
  );
}

function GroupHeading({ children }: { children: string }) {
  return (
    <h3 className="text-center text-sm font-bold tracking-wide text-brand-green-700">
      {children}
    </h3>
  );
}

// The filter controls only: no frame, no collapse. The desktop sidebar and the
// phone drawer each wrap this in their own container.
export function FilterPanel({
  plans,
  providers,
  value,
  onChange,
}: {
  /** Every plan in the area, before any filter (used for the option counts). */
  plans: Plan[];
  providers: string[];
  value: PlanFilters;
  onChange: (next: PlanFilters) => void;
}) {
  const hasPlans = plans.length > 0;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <GroupHeading>PRODUCT TYPE</GroupHeading>
        <p className="text-center text-xs text-brand-navy/50">
          (select all that apply)
        </p>
        {PRODUCT_TYPES.map(({ key, label }) => (
          <OptionRow
            key={key}
            label={label}
            count={
              hasPlans
                ? countForOption(plans, value, "productTypes", key)
                : null
            }
            noneInArea={
              hasPlans &&
              countForOption(plans, EMPTY_FILTERS, "productTypes", key) === 0
            }
            checked={value.productTypes.includes(key)}
            onToggle={() =>
              onChange({
                ...value,
                productTypes: toggle(value.productTypes, key),
              })
            }
          />
        ))}
      </div>

      <div className="space-y-2">
        <GroupHeading>CONTRACT LENGTH</GroupHeading>
        {CONTRACT_BUCKETS.map(({ key, label }) => (
          <OptionRow
            key={key}
            label={label}
            count={
              hasPlans
                ? countForOption(plans, value, "contractBuckets", key)
                : null
            }
            noneInArea={
              hasPlans &&
              countForOption(plans, EMPTY_FILTERS, "contractBuckets", key) === 0
            }
            checked={value.contractBuckets.includes(key)}
            onToggle={() =>
              onChange({
                ...value,
                contractBuckets: toggle(value.contractBuckets, key),
              })
            }
          />
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
            countFor={(name) => countForProvider(plans, value, name)}
            selected={value.providers}
            onSelect={(name) => onChange(selectProvider(value, name))}
            onUnselect={(name) =>
              onChange({
                ...value,
                providers: value.providers.filter((n) => n !== name),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
