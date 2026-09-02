import type { Plan } from "../types/plan";

// PROVISIONAL user-preference filters for the sidebar. These are NOT the
// stability filter or the ranking — those stay out until BRIEF.md defines them.
// Each mapping below is the literal reading of an existing `Plan` field; the
// bucket boundaries marked "confirm" are guesses that BRIEF.md should settle.

export type ProductType = "fixed" | "variable" | "prepaid" | "renewable100";
export type ContractBucket = "mtm" | "m1_6" | "m7_12" | "m12plus";

export interface PlanFilters {
  productTypes: ProductType[];
  contractBuckets: ContractBucket[];
  providers: string[];
  /** From the renewable slider (0 = off). */
  minRenewablePct: number;
}

export const EMPTY_FILTERS: PlanFilters = {
  productTypes: [],
  contractBuckets: [],
  providers: [],
  minRenewablePct: 0,
};

/** Leading percentage in `renewableDescription` ("6% renewable" -> 6), or null. */
export function renewablePct(plan: Plan): number | null {
  const match = plan.renewableDescription?.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function matchesProductType(plan: Plan, type: ProductType): boolean {
  const rate = plan.rateType?.toLowerCase() ?? "";
  switch (type) {
    case "fixed":
      return rate.includes("fixed");
    case "variable":
      return rate.includes("variable") || rate.includes("indexed");
    case "prepaid":
      return plan.prepaid;
    case "renewable100":
      return renewablePct(plan) === 100;
  }
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
      filters.productTypes.length > 0 &&
      !filters.productTypes.some((t) => matchesProductType(plan, t))
    ) {
      return false;
    }
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

export function isFiltering(filters: PlanFilters): boolean {
  return (
    filters.productTypes.length > 0 ||
    filters.contractBuckets.length > 0 ||
    filters.providers.length > 0 ||
    filters.minRenewablePct > 0
  );
}
