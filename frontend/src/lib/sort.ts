import type { Plan } from "../types/plan";
import { estimatedMonthlyBill } from "./usage";

export type SortMode = "best" | "lowestBill";

/**
 * "best"       — the order the plans arrive in: ranked by the four-factor score
 *                during ingestion (BRIEF.md). Returned untouched.
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
