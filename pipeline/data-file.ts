import type { Plan, TduDataFile, TduId } from "../frontend/src/types/plan.js";

// Assemble the JSON document written to Blob (one per TDU per run). Kept
// separate from the cron handler so the exact serialized shape — the contract
// api/plans/[tdu].ts and the frontend read back — can be tested directly.
export function buildTduDataFile(
  tdu: TduId,
  plans: Plan[],
  now: Date = new Date(),
): TduDataFile {
  return {
    tdu,
    generatedAt: now.toISOString(),
    planCount: plans.length,
    plans,
  };
}
