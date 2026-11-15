import type { Plan } from "../frontend/src/types/plan.js";
import { rankPlans } from "../frontend/src/lib/ranking.js";
import { sortTimeOfUse } from "../frontend/src/lib/sort.js";

export interface PipelineResult {
  /** Ranked by total cost at the default usage, cheapest first. */
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
    timeOfUse: sortTimeOfUse(
      plans.filter((plan) => plan.isTimeOfUse),
      1000,
    ),
  };
}
