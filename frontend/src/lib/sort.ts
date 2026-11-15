import type { Plan } from "../types/plan.js";
import { estimatedMonthlyBill } from "./usage.js";

export type SortMode = "best" | "lowestBill";

/**
 * "best"       — the order the plans arrive in. On the page that is score v3
 *                (`scorePlansV2`, scoreV2.ts) at the visitor's usage; the stored
 *                order (`rankPlans`, score v3 at the default usage) only breaks
 *                exact ties. Returned untouched.
 * "lowestBill" — purely the estimated monthly bill at `usageKwh`, cheapest
 *                first. No score and no stability weighting. A plan whose bill
 *                cannot be estimated (a missing anchor price) goes last. Two
 *                plans with exactly the same bill keep the order they arrived
 *                in; nothing else is used to separate them.
 *
 * Never mutates its input.
 */
export function sortPlans(
  plans: Plan[],
  mode: SortMode,
  usageKwh: number,
): Plan[] {
  if (mode === "best") return plans;

  return plans
    .map((plan, index) => ({
      plan,
      index,
      bill: estimatedMonthlyBill(plan, usageKwh),
    }))
    .sort((a, b) => {
      if (a.bill === null || b.bill === null) {
        if (a.bill === b.bill) return a.index - b.index;
        return a.bill === null ? 1 : -1;
      }
      return a.bill - b.bill || a.index - b.index;
    })
    .map(({ plan }) => plan);
}
