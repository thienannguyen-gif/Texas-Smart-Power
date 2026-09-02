import type { Plan } from "../frontend/src/types/plan.js";

// ---------------------------------------------------------------------------
// DOMAIN PIPELINE — NOT IMPLEMENTED YET.
//
// BRIEF.md is the source of truth for everything this function is supposed to
// do, and BRIEF.md does not exist in this repo yet. The rules it must define
// before this can be written:
//
//   1. Stability filter (V-trap / hump) — which plans to exclude by comparing
//      pricePerKwh.at500 / at1000 / at2000, and the reason code kept for audit.
//   2. TOU detection cascade — how a time-of-use plan is identified and why
//      it's handled separately from ranked plans.
//   3. Ranking formula + weights — how surviving plans are ordered.
//   4. Cancellation-fee parsing out of `pricingDetails`, incl. Fee_max.
//
// Do NOT fill these in from memory or "how it's usually done" (CLAUDE.md §1).
// The ranking portion, once defined, moves to frontend/src/lib/ranking.ts and
// is re-exported here (blueprint §6) so it runs in the browser too.
//
// Until then this is an identity pass: every normalized plan is kept, in
// upstream order, with nothing computed or filtered.
// ---------------------------------------------------------------------------
export function applyPipeline(plans: Plan[]): Plan[] {
  return plans;
}
