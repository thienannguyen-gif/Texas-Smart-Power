import type { Plan } from "../types/plan.js";

// User-preference filters for the sidebar. These are separate from the
// stability filter and ranking, which are applied during ingestion.
// Each mapping below reads an existing `Plan` field.

export type ContractBucket = "mtm" | "m1_6" | "m7_12" | "m12plus";

export interface PlanFilters {
  contractBuckets: ContractBucket[];
  /** Show only these providers (OR). */
  providers: string[];
  /** From the renewable slider (0 = off). */
  minRenewablePct: number;
  /**
   * Show only the time-of-use section. Not a per-plan test (see filterPlans):
   * time-of-use plans live in their own unranked list, and this switches the
   * ranked list off.
   */
  onlyTimeOfUse: boolean;
}

export const EMPTY_FILTERS: PlanFilters = {
  contractBuckets: [],
  providers: [],
  minRenewablePct: 0,
  onlyTimeOfUse: false,
};

/** Add `name` to the selected providers (no duplicates). */
export function selectProvider(
  filters: PlanFilters,
  name: string,
): PlanFilters {
  return {
    ...filters,
    providers: filters.providers.includes(name)
      ? filters.providers
      : [...filters.providers, name],
  };
}

/** Leading percentage in `renewableDescription` ("6% renewable" -> 6), or null. */
export function renewablePct(plan: Plan): number | null {
  const match = plan.renewableDescription?.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function matchesContractBucket(plan: Plan, bucket: ContractBucket): boolean {
  const m = plan.termMonths;
  switch (bucket) {
    case "mtm": // confirm: month-to-month = null or <= 1
      return m === null || m <= 1;
    case "m1_6": // confirm: 2–6
      return m !== null && m >= 2 && m <= 6;
    case "m7_12": // confirm: 7–12 (12 lands here, not "12+")
      return m !== null && m >= 7 && m <= 12;
    case "m12plus": // confirm: 13+
      return m !== null && m > 12;
  }
}

/**
 * Within a group the selected options are OR'd; the groups are AND'd. An empty
 * group means "no constraint". Plans with no parseable renewable % are excluded
 * once the slider is above 0.
 */
export function filterPlans(plans: Plan[], filters: PlanFilters): Plan[] {
  return plans.filter((plan) => {
    if (
      filters.contractBuckets.length > 0 &&
      !filters.contractBuckets.some((b) => matchesContractBucket(plan, b))
    ) {
      return false;
    }
    if (
      filters.providers.length > 0 &&
      !filters.providers.includes(plan.companyName)
    ) {
      return false;
    }
    if (filters.minRenewablePct > 0) {
      const pct = renewablePct(plan);
      if (pct === null || pct < filters.minRenewablePct) return false;
    }
    return true;
  });
}

/**
 * The two lists the page shows, after the filters. Every filter except
 * "only time-of-use" applies to both lists; "only time-of-use" empties the
 * ranked one.
 */
export function splitForView(
  ranked: Plan[],
  timeOfUse: Plan[],
  filters: PlanFilters,
): { ranked: Plan[]; timeOfUse: Plan[] } {
  return {
    ranked: filters.onlyTimeOfUse ? [] : filterPlans(ranked, filters),
    timeOfUse: filterPlans(timeOfUse, filters),
  };
}

/** The plans the option counts are taken over: whatever the lists could show. */
export function plansInScope(
  ranked: Plan[],
  timeOfUse: Plan[],
  filters: PlanFilters,
): Plan[] {
  return filters.onlyTimeOfUse ? timeOfUse : [...ranked, ...timeOfUse];
}

/** Time-of-use plans that pass the other active filters. */
export function countTimeOfUse(
  timeOfUse: Plan[],
  filters: PlanFilters,
): number {
  return filterPlans(timeOfUse, filters).length;
}

/**
 * How many plans a contract-length option would show. Counts honour every
 * other active filter; the contract-length group itself is replaced by just
 * this option (selected options in the group are OR'd, so the other ticks in
 * it are ignored).
 */
export function countForBucket(
  plans: Plan[],
  filters: PlanFilters,
  key: ContractBucket,
): number {
  return filterPlans(plans, { ...filters, contractBuckets: [key] }).length;
}

/** Plans a provider would show given every other active filter. */
export function countForProvider(
  plans: Plan[],
  filters: PlanFilters,
  name: string,
): number {
  return filterPlans(plans, {
    ...filters,
    providers: [name],
  }).length;
}

/** Counts shown in the results summary line, over whatever plans are showing. */
export function summarizePlans(plans: Plan[]): {
  renewable100: number;
  months7to12: number;
} {
  return {
    renewable100: plans.filter((p) => renewablePct(p) === 100).length,
    months7to12: plans.filter((p) => matchesContractBucket(p, "m7_12")).length,
  };
}

/** How many separate filter choices are active (shown on the phone header). */
export function activeFilterCount(filters: PlanFilters): number {
  return (
    filters.contractBuckets.length +
    filters.providers.length +
    (filters.minRenewablePct > 0 ? 1 : 0) +
    (filters.onlyTimeOfUse ? 1 : 0)
  );
}

export function isFiltering(filters: PlanFilters): boolean {
  return (
    filters.contractBuckets.length > 0 ||
    filters.providers.length > 0 ||
    filters.minRenewablePct > 0 ||
    filters.onlyTimeOfUse
  );
}
