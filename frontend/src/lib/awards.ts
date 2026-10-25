import type { Plan } from "../types/plan.js";
import { priceCurveWarning } from "./ranking.js";
import { renewablePct } from "./filters.js";
import { estimatedMonthlyBill } from "./usage.js";

export type AwardId = "best-overall" | "lowest-bill" | "best-green";

export const AWARD_LABELS: Record<AwardId, string> = {
  "best-overall": "Best overall",
  "lowest-bill": "Lowest bill",
  "best-green": "Best 100% green",
};

/** One plan and every award it won: a plan is never two cards. */
export interface AwardPick {
  plan: Plan;
  awards: AwardId[];
}

/**
 * The "Our picks" winners.
 *
 *   Best overall     highest score among plans with a 12-month term
 *   Lowest bill      lowest estimated bill at `usageKwh`, any term
 *   Best 100% green  highest score among plans at 100% renewable
 *
 * `plans` must be the ranked plans that are currently shown, best score first
 * (the order the ingestion pipeline stores them in). Plans with an unstable
 * price curve (V-trap or hump) never win: their headline number is not
 * trustworthy. An award nobody qualifies for is simply absent, so there are at
 * most three picks and never an empty one; in particular, with no 12-month
 * plan there is no "Best overall" rather than a best plan of some other term.
 * Ties go to the better-scored plan.
 */
export function computeAwards(plans: Plan[], usageKwh: number): AwardPick[] {
  const eligible = plans.filter(
    (plan) => !plan.isTimeOfUse && priceCurveWarning(plan) === null,
  );

  const winners: [AwardId, Plan | undefined][] = [
    // exactly 12 months, read from the plan's own term (not a filter bucket)
    ["best-overall", eligible.find((plan) => plan.termMonths === 12)],
    ["lowest-bill", lowestBill(eligible, usageKwh)],
    ["best-green", eligible.find((plan) => renewablePct(plan) === 100)],
  ];

  const picks: AwardPick[] = [];
  for (const [award, plan] of winners) {
    if (!plan) continue;
    const existing = picks.find((pick) => pick.plan.id === plan.id);
    if (existing) existing.awards.push(award);
    else picks.push({ plan, awards: [award] });
  }
  return picks;
}

function lowestBill(plans: Plan[], usageKwh: number): Plan | undefined {
  let best: Plan | undefined;
  let bestBill = Infinity;
  for (const plan of plans) {
    const bill = estimatedMonthlyBill(plan, usageKwh);
    if (bill === null || !Number.isFinite(bill)) continue;
    if (bill < bestBill) {
      best = plan;
      bestBill = bill;
    }
  }
  return best;
}
