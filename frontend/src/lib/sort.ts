import type { Plan } from "../types/plan.js";
import { costAt, rankByContractCost } from "./contractCost.js";

export type SortMode = "lowestCost" | "best";

/**
 * "lowestCost" — the default. What the contract costs at `usageKwh`, cheapest
 *                first: `rankByContractCost` (L x the bill from `costAt`; the
 *                bill is rounded to the cent, then the lower cancellation fee,
 *                then the lower plan id). A plan that cannot be costed goes last,
 *                in the order it arrived.
 * "best"       — the order the plans arrive in. On the page that is score v3
 *                (`scorePlansV2`, scoreV2.ts) at the visitor's usage; the stored
 *                order (`rankPlans`) only breaks exact ties. Returned untouched.
 *
 * Never mutates its input.
 */
export function sortPlans(
  plans: Plan[],
  mode: SortMode,
  usageKwh: number,
): Plan[] {
  if (mode === "best") return plans;

  const ranked = rankByContractCost(plans, usageKwh).map(({ plan }) => plan);
  const placed = new Set(ranked);
  return [...ranked, ...plans.filter((plan) => !placed.has(plan))];
}

/**
 * The time-of-use section: cheapest bill at `usageKwh` first (`costAt`), a plan
 * that cannot be costed last, ties in arrival order. These plans are never
 * scored or ranked (BRIEF.md), so this is only a display order.
 */
export function sortTimeOfUse(plans: Plan[], usageKwh: number): Plan[] {
  return plans
    .map((plan, index) => ({ plan, index, bill: costAt(plan, usageKwh) }))
    .sort((a, b) => {
      if (a.bill === null || b.bill === null) {
        if (a.bill === b.bill) return a.index - b.index;
        return a.bill === null ? 1 : -1;
      }
      return a.bill - b.bill || a.index - b.index;
    })
    .map(({ plan }) => plan);
}
