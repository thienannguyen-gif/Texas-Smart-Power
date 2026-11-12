import type { Plan } from "../types/plan.js";
import { parseExitFee } from "./cancellationFee.js";
import { costAt } from "./contractCost.js";
import { renewablePct } from "./filters.js";

// Score v2: one list, scored 0-10, built from three parts.
//
//   score = (8 * S_cost + 3 * S_flex + 1 * S_green) / 12
//
//   S_cost  = 10 * (cost_max - cost) / (cost_max - cost_min), where cost is the
//             estimated monthly bill at the usage the user entered and the min
//             and max run over the plans currently displayed. If they are within
//             1e-9 of each other every plan gets 10.
//   S_flex  = 0.5 * S_term + 0.5 * S_fee
//   S_term  = 10 * min(L, 12) / 12   (L = term in months: a year or more is 10)
//   S_fee   = 10 * (1 - fee / max_fee), max_fee being the highest cancellation
//             fee among the eligible plans of the area, before any filter
//             (the same rule as ranking.ts); every plan gets 10 if the fees
//             are all equal
//   S_green = renewable % / 10
//
// There is no S_slope and no seasonal factor here. ranking.ts (the scoring that
// is live on main) is untouched, so the two can be compared.

const EPSILON = 1e-9;

export const WEIGHTS_V2 = {
  cost: 8 / 12,
  flexibility: 3 / 12,
  green: 1 / 12,
} as const;

export interface ScoreBreakdownV2 {
  cost: number;
  term: number;
  fee: number;
  flexibility: number;
  green: number;
  total: number;
}

export interface ScoredPlanV2 {
  plan: Plan;
  /** Estimated monthly bill in dollars at the entered usage, to the cent. */
  bill: number;
  breakdown: ScoreBreakdownV2;
}

/** 10 for a year or longer; below a year, in proportion to the months covered. */
export function termScoreV2(termMonths: number): number {
  return (10 * Math.min(termMonths, 12)) / 12;
}

interface Eligible {
  plan: Plan;
  bill: number;
  fee: number;
  term: number;
  green: number;
}

// A plan is scored only when every input is known (BRIEF.md: a missing ranking
// input excludes it). Time-of-use plans are never scored.
function eligible(plan: Plan, usage: number): Eligible | null {
  if (plan.isTimeOfUse) return null;
  const term = plan.termMonths;
  if (term === null || !Number.isInteger(term) || term < 1) return null;
  const raw = costAt(plan, usage);
  if (raw === null || !Number.isFinite(raw)) return null;
  const fee = parseExitFee(plan.pricingDetails, term);
  if (fee === null || !Number.isFinite(fee) || fee < 0) return null;
  const renewable = renewablePct(plan);
  if (
    renewable === null ||
    !Number.isFinite(renewable) ||
    renewable < 0 ||
    renewable > 100
  ) {
    return null;
  }
  // Costs are compared to the cent, the precision they are shown at: equal
  // prices must score equally, not differ by floating point noise.
  return {
    plan,
    bill: Math.round(raw * 100) / 100,
    fee,
    term,
    green: renewable / 10,
  };
}

/**
 * Plans that can be scored at `usage`: the ones the list could ever show.
 * Used for the count before filters.
 */
export function scorablePlans(plans: Plan[], usage: number): Plan[] {
  return plans.filter((plan) => eligible(plan, usage) !== null);
}

/**
 * Scores `displayed` and returns them best first.
 *
 * `areaPlans` is every ranked plan of the area before any user filter: the
 * highest cancellation fee is taken over it. `displayed` is what is on screen
 * after the filters: S_cost is min-max over it, so it is recomputed whenever the
 * filters or the usage change. Plans that tie on score keep the order they
 * arrived in (the stored, previous-score order).
 */
export function scorePlansV2(
  areaPlans: Plan[],
  displayed: Plan[],
  usage: number,
): ScoredPlanV2[] {
  const fees = areaPlans
    .map((plan) => eligible(plan, usage))
    .filter((e): e is Eligible => e !== null)
    .map((e) => e.fee);
  const maxFee = fees.length > 0 ? Math.max(...fees) : 0;
  const minFee = fees.length > 0 ? Math.min(...fees) : 0;

  const shown = displayed
    .map((plan, index) => ({ e: eligible(plan, usage), index }))
    .filter((x): x is { e: Eligible; index: number } => x.e !== null);
  if (shown.length === 0) return [];

  const bills = shown.map(({ e }) => e.bill);
  const lo = Math.min(...bills);
  const hi = Math.max(...bills);

  return shown
    .map(({ e, index }) => {
      const cost = hi - lo < EPSILON ? 10 : (10 * (hi - e.bill)) / (hi - lo);
      const term = termScoreV2(e.term);
      const fee =
        maxFee === minFee
          ? 10
          : Math.max(0, Math.min(10, 10 * (1 - e.fee / maxFee)));
      const flexibility = 0.5 * term + 0.5 * fee;
      const total =
        WEIGHTS_V2.cost * cost +
        WEIGHTS_V2.flexibility * flexibility +
        WEIGHTS_V2.green * e.green;
      return {
        index,
        scored: {
          plan: e.plan,
          bill: e.bill,
          breakdown: { cost, term, fee, flexibility, green: e.green, total },
        } satisfies ScoredPlanV2,
      };
    })
    .sort(
      (a, b) =>
        Math.round(b.scored.breakdown.total * 1e9) -
          Math.round(a.scored.breakdown.total * 1e9) || a.index - b.index,
    )
    .map(({ scored }) => scored);
}
