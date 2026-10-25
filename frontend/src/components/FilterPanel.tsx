import type { ReactNode } from "react";
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
  description: string;
  /** Shows the small "rec." tag beside the label. */
  recommended?: boolean;
}[] = [
  {
    value: "best",
    label: "Best match",
    recommended: true,
    description:
      "Our score: price, price stability, flexibility and renewable content.",
  },
  {
    value: "lowestBill",
    label: "Lowest bill",
    description: "Cheapest estimated bill at your usage, nothing else.",
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

// A sidebar section: a small monospace label over a hairline.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="label-mono border-b border-line pb-3">{title}</h3>
      {children}
    </section>
  );
}

// One checkbox row with its match count on the right. An option with no
// matches is greyed, never hidden; a ticked one stays clickable so the user can
// always untick it. `count` is null until the plans have loaded.
function OptionRow({
  label,
  ariaLabel,
  count,
  noneInArea,
  checked,
  onToggle,
}: {
  label: string;
  /** Spoken name, when the visible label only makes sense under its heading. */
  ariaLabel?: string;
  count: number | null;
  /** No plan in the whole area matches (before any filter). */
  noneInArea: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const empty = count === 0;
  return (
    <label
      className={`flex items-center gap-3 py-1 text-[15px] ${
        empty ? "text-ink-faint" : "text-ink"
      }`}
    >
      <input
        type="checkbox"
        aria-label={ariaLabel}
        disabled={empty && !checked}
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded-sm accent-brand"
      />
      <span className="flex-1">{label}</span>
      {noneInArea ? (
        <span className="text-xs">No plans available</span>
      ) : (
        count !== null && (
          <span className="font-mono text-xs text-ink-faint">{count}</span>
        )
      )}
    </label>
  );
}

// Two clean modes as radio rows (native inputs, so the arrow keys work), each
// with its own one-line description.
function SortSection({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (next: SortMode) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Sort plans</legend>
      <Section title="SORT BY">
        {SORT_OPTIONS.map((option) => {
          const descriptionId = `sort-description-${option.value}`;
          return (
            <div key={option.value} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-3 py-1 text-[15px]">
                  <input
                    type="radio"
                    name="sort-plans"
                    value={option.value}
                    checked={option.value === value}
                    onChange={() => onChange(option.value)}
                    aria-describedby={descriptionId}
                    className="h-4 w-4 shrink-0 accent-brand"
                  />
                  {option.label}
                </label>
                {option.recommended && (
                  <span
                    aria-hidden="true"
                    title="Recommended"
                    className="font-mono text-xs text-ink-faint"
                  >
                    rec.
                  </span>
                )}
              </div>
              <p
                id={descriptionId}
                className="pl-7 text-sm leading-snug text-ink-soft"
              >
                {option.description}
              </p>
            </div>
          );
        })}
      </Section>
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
    <div className="space-y-8">
      <SortSection value={sort} onChange={onSortChange} />

      <Section title="CONTRACT LENGTH">
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
      </Section>

      <Section title="ENERGY">
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
      </Section>

      <Section title="TIME OF USE">
        <OptionRow
          label="Only these plans"
          ariaLabel="Only time-of-use plans"
          count={hasPlans ? countTimeOfUse(timeOfUsePlans, value) : null}
          noneInArea={hasPlans && timeOfUsePlans.length === 0}
          checked={value.onlyTimeOfUse}
          onToggle={() =>
            onChange({ ...value, onlyTimeOfUse: !value.onlyTimeOfUse })
          }
        />
        <p className="text-sm leading-snug text-ink-soft">{TOU_FILTER_NOTE}</p>
      </Section>

      {providers.length > 0 && (
        <Section title="PROVIDER">
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
        </Section>
      )}
    </div>
  );
}
