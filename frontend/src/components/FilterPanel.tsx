import type { Plan } from "../types/plan";
import {
  countForBucket,
  countForProvider,
  countRenewable100,
  countTimeOfUse,
  plansInScope,
  EMPTY_FILTERS,
  type ContractBucket,
  type PlanFilters,
  selectProvider,
} from "../lib/filters";
import type { SortMode } from "../lib/sort";
import { TOU_FILTER_NOTE } from "../lib/timeOfUse";
import { ProviderPicker } from "./ProviderPicker";

// User-preference filters are applied after the ingestion pipeline ranks plans.

const SORT_OPTIONS: {
  value: SortMode;
  label: string;
  /** Shown under the option's name. */
  description: string;
}[] = [
  {
    value: "lowestCost",
    label: "Lowest total cost",
    description: "What the contract costs at your usage. Cheapest first.",
  },
  {
    value: "best",
    label: "Best match (recommended)",
    // the score's parts: price (8/12), contract length and fee (3/12), renewable share (1/12)
    description: "Balances price, contract length, fees and renewable share.",
  },
];

const CONTRACT_BUCKETS: { key: ContractBucket; label: string }[] = [
  { key: "m1_6", label: "1–6 months" },
  { key: "m7_11", label: "7–11 months" },
  { key: "m12", label: "12 months" },
  { key: "m13plus", label: "13+ months" },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

// One checkbox with its match count, e.g. "7–12 months (84)". An option
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
        empty ? "text-ink-faint" : "text-ink-soft"
      }`}
    >
      <input
        type="checkbox"
        disabled={empty && !checked}
        checked={checked}
        onChange={onToggle}
        className="h-5 w-5 rounded border-line accent-brand md:h-4 md:w-4"
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
  return <h3 className="text-sm font-semibold text-ink">{children}</h3>;
}

// Two modes, each a row with its description under the name; the chosen one is
// tinted. Native radio inputs, so the arrow keys work.
function SortSection({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (next: SortMode) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Sort plans</legend>
      <GroupHeading>Sort by</GroupHeading>
      {SORT_OPTIONS.map((option) => {
        const on = option.value === value;
        const descId = `sort-desc-${option.value}`;
        return (
          <div
            key={option.value}
            className={`flex gap-3 rounded-xl border px-3 py-2.5 ${
              on ? "border-brand-soft bg-brand-soft/60" : "border-transparent"
            }`}
          >
            <input
              id={`sort-${option.value}`}
              type="radio"
              name="sort-plans"
              value={option.value}
              checked={on}
              onChange={() => onChange(option.value)}
              aria-describedby={descId}
              className="mt-0.5 h-4 w-4 shrink-0 border-line accent-brand"
            />
            <div>
              <label
                htmlFor={`sort-${option.value}`}
                className="block cursor-pointer text-sm font-semibold text-ink"
              >
                {option.label}
              </label>
              <p id={descId} className="mt-0.5 text-xs text-ink-soft">
                {option.description}
              </p>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}

// The sort and filter controls only: no frame, no collapse. The desktop sidebar and the
// phone drawer each wrap this in their own container.
export function FilterPanel({
  plans,
  timeOfUsePlans,
  providers,
  value,
  onChange,
  sort,
  onSortChange,
}: {
  /** Every ranked plan in the area, before any filter (used for the option counts). */
  plans: Plan[];
  /** Every time-of-use plan in the area (they are not ranked). */
  timeOfUsePlans: Plan[];
  providers: string[];
  value: PlanFilters;
  onChange: (next: PlanFilters) => void;
  sort: SortMode;
  onSortChange: (next: SortMode) => void;
}) {
  const allPlans = [...plans, ...timeOfUsePlans];
  const hasPlans = allPlans.length > 0;
  // counts are taken over the plans the lists could show right now
  const scope = plansInScope(plans, timeOfUsePlans, value);
  return (
    <div className="space-y-6">
      <SortSection value={sort} onChange={onSortChange} />

      <div className="space-y-2">
        <GroupHeading>Time-of-use plans</GroupHeading>
        <OptionRow
          label="Only time-of-use plans"
          count={hasPlans ? countTimeOfUse(timeOfUsePlans, value) : null}
          noneInArea={hasPlans && timeOfUsePlans.length === 0}
          checked={value.onlyTimeOfUse}
          onToggle={() =>
            onChange({ ...value, onlyTimeOfUse: !value.onlyTimeOfUse })
          }
        />
        <p className="text-xs text-ink-soft">{TOU_FILTER_NOTE}</p>
      </div>

      <div className="space-y-2">
        <GroupHeading>Contract length</GroupHeading>
        {CONTRACT_BUCKETS.map(({ key, label }) => (
          <OptionRow
            key={key}
            label={label}
            count={hasPlans ? countForBucket(scope, value, key) : null}
            noneInArea={
              hasPlans && countForBucket(allPlans, EMPTY_FILTERS, key) === 0
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
        <GroupHeading>Renewable energy</GroupHeading>
        <OptionRow
          label="100% renewable only"
          count={hasPlans ? countRenewable100(scope, value) : null}
          noneInArea={
            hasPlans && countRenewable100(allPlans, EMPTY_FILTERS) === 0
          }
          checked={value.renewable100Only}
          onToggle={() =>
            onChange({ ...value, renewable100Only: !value.renewable100Only })
          }
        />
      </div>

      {providers.length > 0 && (
        <div className="space-y-2">
          <GroupHeading>Provider</GroupHeading>
          <ProviderPicker
            providers={providers}
            countFor={(name) => countForProvider(scope, value, name)}
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
