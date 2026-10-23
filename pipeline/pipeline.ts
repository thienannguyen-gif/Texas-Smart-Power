import type { Plan } from "../frontend/src/types/plan.js";
import { rankPlans } from "../frontend/src/lib/ranking.js";
import { sortPlans } from "../frontend/src/lib/sort.js";

export interface PipelineResult {
  /** Scored and ranked, best first. */
  ranked: Plan[];
  /** Time-of-use plans, unranked, cheapest flat reference rate first. */
  timeOfUse: Plan[];
}

// The "TOU Check" then "Ranking Library" steps (docs/BRIEF.md). Time-of-use
// plans are split off first and never scored; the rest are ranked so the stored
// API response is already ordered for the browser. The time-of-use plans are
// ordered by their reference rate (the bill at 1,000 kWh is that rate times a
// constant, so the order is the same); a plan with a missing anchor price goes
// last.
export function applyPipeline(plans: Plan[]): PipelineResult {
  return {
    ranked: rankPlans(plans.filter((plan) => !plan.isTimeOfUse)),
    timeOfUse: sortPlans(
      plans.filter((plan) => plan.isTimeOfUse),
      "lowestBill",
      1000,
    ),
  };
}
