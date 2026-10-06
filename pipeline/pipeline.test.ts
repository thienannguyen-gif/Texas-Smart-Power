import { describe, expect, it } from "vitest";
import { normalizePlan } from "./normalize.js";
import { applyPipeline } from "./pipeline.js";
import { buildTduDataFile } from "./data-file.js";
import type { Plan, RawPlan } from "../frontend/src/types/plan.js";
import samplePlans from "./__fixtures__/plans.sample.json" with { type: "json" };

function normalizeAll(raw: RawPlan[]): Plan[] {
  return raw.map(normalizePlan).filter((plan): plan is Plan => plan !== null);
}

describe("ingestion path over the sample fixture", () => {
  const normalized = normalizeAll(samplePlans as RawPlan[]);

  it("keeps the records that have identity fields", () => {
    // All four sample records have plan_id + plan_name + company_name.
    expect(normalized).toHaveLength(4);
  });

  it("converts the three upstream cent prices to dollars", () => {
    const teaser = normalized.find((p) => p.id === 900002);
    expect(teaser?.pricePerKwh).toEqual({
      at500: 0.19,
      at1000: 0.09,
      at2000: 0.21,
    });
  });

  it("flags the time-of-use sample plan", () => {
    expect(normalized.find((p) => p.id === 900003)?.isTimeOfUse).toBe(true);
    expect(normalized.find((p) => p.id === 900001)?.isTimeOfUse).toBe(false);
  });

  it("applyPipeline is currently an identity pass (no BRIEF.md rules yet)", () => {
    expect(applyPipeline(normalized)).toEqual(normalized);
  });
});

// student-build-guide.md §4, 4th mandatory check: the serialized JSON shape
// written to Blob (and read back by api/plans/[tdu].ts + the frontend).
describe("Blob data-file shape", () => {
  const plans = applyPipeline(normalizeAll(samplePlans as RawPlan[]));
  const file = buildTduDataFile(
    "oncor",
    plans,
    new Date("2026-08-29T09:00:00Z"),
  );
  const written = JSON.parse(JSON.stringify(file));

  it("has exactly the TduDataFile keys, in order", () => {
    expect(Object.keys(written)).toEqual([
      "tdu",
      "generatedAt",
      "planCount",
      "plans",
    ]);
  });

  it("stamps the run's TDU and an ISO timestamp", () => {
    expect(written.tdu).toBe("oncor");
    expect(written.generatedAt).toBe("2026-08-29T09:00:00.000Z");
  });

  it("keeps planCount in sync with the array", () => {
    expect(written.planCount).toBe(written.plans.length);
    expect(written.planCount).toBe(4);
  });

  it("round-trips through JSON without loss", () => {
    expect(written).toEqual(file);
  });
});
