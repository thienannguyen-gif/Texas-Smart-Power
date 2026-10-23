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

  it("ranks plans with complete inputs and excludes incomplete plans", () => {
    expect(applyPipeline(normalized).ranked.map((plan) => plan.id)).toEqual([
      900001,
    ]);
  });

  it("keeps the time-of-use plan out of the ranking and lists it separately", () => {
    const { ranked, timeOfUse } = applyPipeline(normalized);
    expect(ranked.some((plan) => plan.isTimeOfUse)).toBe(false);
    expect(timeOfUse.map((plan) => plan.id)).toEqual([900003]);
  });
});

describe("time-of-use plans are never ranked (docs/BRIEF.md)", () => {
  const plan = (
    id: number,
    isTimeOfUse: boolean,
    at500: number,
    at1000: number | null,
    at2000: number,
  ): Plan => ({
    id,
    planName: `Plan ${id}`,
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500, at1000, at2000 },
    pricingDetails: "Cancellation fee $100",
    isTimeOfUse,
    renewableDescription: "50% renewable",
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
  });

  it("splits time-of-use plans from the ranked list, even when one is the cheapest of all", () => {
    const { ranked, timeOfUse } = applyPipeline([
      plan(1, false, 0.14, 0.14, 0.14),
      plan(2, true, 0.05, 0.05, 0.05), // far cheaper than any fixed-rate plan
      plan(3, false, 0.12, 0.12, 0.12),
    ]);
    expect(ranked.map((p) => p.id)).toEqual([3, 1]);
    expect(timeOfUse.map((p) => p.id)).toEqual([2]);
  });

  it("does not let a time-of-use plan move the other plans' scores", () => {
    const fixed = [
      plan(1, false, 0.14, 0.14, 0.14),
      plan(3, false, 0.12, 0.12, 0.12),
    ];
    const withTou = applyPipeline([...fixed, plan(2, true, 0.05, 0.05, 0.05)]);
    const without = applyPipeline(fixed);
    // same plans, same order, because P_min and P_max come from fixed-rate plans only
    expect(withTou.ranked).toEqual(without.ranked);
  });

  it("orders the time-of-use plans by reference rate, cheapest first, missing prices last", () => {
    const { timeOfUse } = applyPipeline([
      plan(10, true, 0.2, 0.18, 0.2),
      plan(11, true, 0.12, 0.1, 0.12),
      plan(12, true, 0.3, null as unknown as number, 0.3), // no 1,000 kWh price
      plan(13, true, 0.15, 0.14, 0.15),
    ]);
    expect(timeOfUse.map((p) => p.id)).toEqual([11, 13, 10, 12]);
  });

  it("returns two empty lists for no plans", () => {
    expect(applyPipeline([])).toEqual({ ranked: [], timeOfUse: [] });
  });
});

// student-build-guide.md §4, 4th mandatory check: the serialized JSON shape
// written to Blob (and read back by api/plans/[tdu].ts + the frontend).
describe("Blob data-file shape", () => {
  const result = applyPipeline(normalizeAll(samplePlans as RawPlan[]));
  const file = buildTduDataFile(
    "oncor",
    result,
    new Date("2026-08-29T09:00:00Z"),
  );
  const written = JSON.parse(JSON.stringify(file));

  it("has exactly the TduDataFile keys, in order", () => {
    expect(Object.keys(written)).toEqual([
      "tdu",
      "generatedAt",
      "planCount",
      "plans",
      "timeOfUsePlans",
    ]);
  });

  it("stamps the run's TDU and an ISO timestamp", () => {
    expect(written.tdu).toBe("oncor");
    expect(written.generatedAt).toBe("2026-08-29T09:00:00.000Z");
  });

  it("keeps planCount in sync with the ranked array, and lists time-of-use plans separately", () => {
    expect(written.planCount).toBe(written.plans.length);
    expect(written.planCount).toBe(1);
    expect(written.timeOfUsePlans).toHaveLength(1);
    expect(written.timeOfUsePlans[0].isTimeOfUse).toBe(true);
    expect(
      written.plans.some((p: { isTimeOfUse: boolean }) => p.isTimeOfUse),
    ).toBe(false);
  });

  it("round-trips through JSON without loss", () => {
    expect(written).toEqual(file);
  });
});
