import type { Plan } from "../types/plan.js";

// User-preference filters for the sidebar. These are separate from the
// stability filter and ranking, which are applied during ingestion.
// Each mapping below reads an existing `Plan` field.

export type ContractBucket = "m1_6" | "m7_11" | "m12" | "m13plus";

export interface PlanFilters {
  contractBuckets: ContractBucket[];
  /** Show only these providers (OR). */
  providers: string[];
  /** Show only plans that are 100% renewable. */
  renewable100Only: boolean;
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
  renewable100Only: false,
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
    // Four buckets that never overlap; exactly 12 months has its own, so it
    // is not lost between "7–11" and "13+". A plan with no term matches none.
    case "m1_6":
      return m !== null && m <= 6;
    case "m7_11":
      return m !== null && m >= 7 && m <= 11;
    case "m12":
      return m === 12;
    case "m13plus":
      return m !== null && m >= 13;
  }
}

/**
 * Within a group the selected options are OR'd; the groups are AND'd. An empty
 * group means "no constraint". With "100% renewable only" on, a plan whose
 * renewable % is not 100 (or cannot be read) is excluded.
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
    if (filters.renewable100Only && renewablePct(plan) !== 100) return false;
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

/** How many plans the "100% renewable only" option would show, given the other filters. */
export function countRenewable100(plans: Plan[], filters: PlanFilters): number {
  return filterPlans(plans, { ...filters, renewable100Only: true }).length;
}

/** How many separate filter choices are active (shown on the phone header). */
export function activeFilterCount(filters: PlanFilters): number {
  return (
    filters.contractBuckets.length +
    filters.providers.length +
    (filters.renewable100Only ? 1 : 0) +
    (filters.onlyTimeOfUse ? 1 : 0)
  );
}

export function isFiltering(filters: PlanFilters): boolean {
  return (
    filters.contractBuckets.length > 0 ||
    filters.providers.length > 0 ||
    filters.renewable100Only ||
    filters.onlyTimeOfUse
  );
}
