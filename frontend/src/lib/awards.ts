import type { Plan } from "../types/plan.js";
import { priceCurveWarning } from "./ranking.js";
import { renewablePct } from "./filters.js";
import { estimatedMonthlyBill } from "./usage.js";

export type AwardId = "best-overall" | "best-green" | "cheapest-12";

export const AWARD_LABELS: Record<AwardId, string> = {
  "best-overall": "Best overall",
  "best-green": "Best 100% green",
  "cheapest-12": "Cheapest 12-month",
};

/** One plan and every award it won: a plan is never two cards. */
export interface AwardPick {
  plan: Plan;
  awards: AwardId[];
}

/**
 * The "Our picks" winners.
 *
 *   Best overall       highest score
 *   Best 100% green    highest score among plans at 100% renewable
 *   Cheapest 12-month  lowest estimated bill (at `usageKwh`) among 12-month terms
 *
 * `plans` must be the ranked plans that are currently shown, best score first
 * (the order the ingestion pipeline stores them in). Plans with an unstable
 * price curve (V-trap or hump) never win: their headline number is not
 * trustworthy. An award nobody qualifies for is simply absent, so there are at
 * most three picks and never an empty one. Ties go to the better-scored plan.
 */
export function computeAwards(plans: Plan[], usageKwh: number): AwardPick[] {
  const eligible = plans.filter(
    (plan) => !plan.isTimeOfUse && priceCurveWarning(plan) === null,
  );

  const winners: [AwardId, Plan | undefined][] = [
    ["best-overall", eligible[0]],
    ["best-green", eligible.find((plan) => renewablePct(plan) === 100)],
    ["cheapest-12", cheapestTwelveMonth(eligible, usageKwh)],
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

function cheapestTwelveMonth(
  plans: Plan[],
  usageKwh: number,
): Plan | undefined {
  let best: Plan | undefined;
  let bestBill = Infinity;
  for (const plan of plans) {
    if (plan.termMonths !== 12) continue;
    const bill = estimatedMonthlyBill(plan, usageKwh);
    if (bill === null || !Number.isFinite(bill)) continue;
    if (bill < bestBill) {
      best = plan;
      bestBill = bill;
    }
  }
  return best;
}
