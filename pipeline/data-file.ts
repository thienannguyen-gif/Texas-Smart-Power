import type { TduDataFile, TduId } from "../frontend/src/types/plan.js";
import type { PipelineResult } from "./pipeline.js";

// Assemble the JSON document written to Blob (one per TDU per run). Kept
// separate from the cron handler so the exact serialized shape — the contract
// api/plans/[tdu].ts and the frontend read back — can be tested directly.
export function buildTduDataFile(
  tdu: TduId,
  { ranked, timeOfUse }: PipelineResult,
  now: Date = new Date(),
): TduDataFile {
  return {
    tdu,
    generatedAt: now.toISOString(),
    planCount: ranked.length,
    plans: ranked,
    timeOfUsePlans: timeOfUse,
  };
}
