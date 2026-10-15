import type { Plan } from "../frontend/src/types/plan.js";
import { rankPlans } from "../frontend/src/lib/ranking.js";

// Rank eligible plans during ingestion so the stored API response is already
// ordered for the browser.
export function applyPipeline(plans: Plan[]): Plan[] {
  return rankPlans(plans);
}
