import { describe, expect, it } from "vitest";
import type { Plan } from "../types/plan";
import {
  calculatePriceScore,
  priceCurveWarning,
  rankPlans,
  scorePlans,
} from "./ranking";

const base: Plan = {
  id: 0,
  planName: "Plan",
  companyName: "Provider",
  termMonths: 12,
  rateType: "Fixed",
  pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
  pricingDetails: "Cancellation fee $100",
  isTimeOfUse: false,
  renewableDescription: "50% renewable",
  prepaid: false,
  companyLogo: null,
  website: null,
  goToPlanUrl: null,
  factSheetUrl: null,
  termsUrl: null,
  enrollPhone: null,
};

const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  ...base,
  ...overrides,
  pricePerKwh: { ...base.pricePerKwh, ...overrides.pricePerKwh },
});

describe("calculatePriceScore", () => {
  it("rewards lower prices and clamps scores to 0–10", () => {
    expect(calculatePriceScore(0.1, 0.1, 0.2)).toBe(10);
    expect(calculatePriceScore(0.2, 0.1, 0.2)).toBe(0);
    expect(calculatePriceScore(0.05, 0.1, 0.2)).toBe(10);
    expect(calculatePriceScore(0.25, 0.1, 0.2)).toBe(0);
  });

  it("treats near-equal floating-point market prices as tied", () => {
    expect(calculatePriceScore(0.1, 0.1, 0.1 + 5e-10)).toBe(10);
  });

  it("returns zero for non-finite input", () => {
    expect(calculatePriceScore(Number.NaN, 0.1, 0.2)).toBe(0);
    expect(calculatePriceScore(0.1, Number.POSITIVE_INFINITY, 0.2)).toBe(0);
  });
});

describe("scorePlans", () => {
  it("normalizes each factor to 0–10 and applies BRIEF weights", () => {
    const plans = [
      makePlan({
        id: 1,
        pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
        pricingDetails: "Cancellation fee $0",
        renewableDescription: "100% renewable",
      }),
      makePlan({
        id: 2,
        pricePerKwh: { at500: 0.2, at1000: 0.2, at2000: 0.2 },
        pricingDetails: "Cancellation fee $200",
        renewableDescription: "0% renewable",
      }),
    ];

    const ranked = scorePlans(plans);
    expect(ranked.map(({ plan }) => plan.id)).toEqual([1, 2]);
    expect(ranked[0].breakdown).toEqual({
      price: 10,
      slope: 10,
      term: 10,
      fee: 10,
      flexibility: 10,
      green: 10,
      total: 10,
    });
    expect(ranked[1].breakdown).toEqual({
      price: 0,
      slope: 10,
      term: 10,
      fee: 0,
      flexibility: 5,
      green: 0,
      total: 3.75,
    });
  });

  it("applies the binary slope penalty for a V-trap or hump", () => {
    const plans = [
      makePlan({
        id: 1,
        pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
      }),
      makePlan({
        id: 2,
        pricePerKwh: { at500: 0.12, at1000: 0.13, at2000: 0.13 },
      }),
      makePlan({
        id: 3,
        pricePerKwh: { at500: 0.14, at1000: 0.13, at2000: 0.13 },
      }),
    ];

    const byId = new Map(
      scorePlans(plans).map(({ plan, breakdown }) => [plan.id, breakdown]),
    );
    expect(byId.get(1)?.slope).toBe(0);
    expect(byId.get(2)?.slope).toBe(0);
    expect(byId.get(3)?.slope).toBe(10);
  });

  it.each([
    [11, 8],
    [12, 10],
    [13, 9],
    [15, 9],
    [16, 8],
    [17, 8],
    [18, 7],
    [24, 7],
    [25, 6],
    [35, 6],
    [36, 5],
    [37, 3],
  ])("scores a %i-month term as %i points", (termMonths, expected) => {
    const result = scorePlans([makePlan({ termMonths })]);
    expect(result[0].breakdown.term).toBe(expected);
  });

  it("gives all plans full fee points when all exit fees are equal", () => {
    const scored = scorePlans([
      makePlan({ id: 1, pricingDetails: "Cancellation fee $100" }),
      makePlan({ id: 2, pricingDetails: "Cancellation fee $100" }),
    ]);

    expect(scored.every(({ breakdown }) => breakdown.fee === 10)).toBe(true);
  });

  it("excludes plans with any missing required factor input", () => {
    const plans = [
      makePlan({ id: 1 }),
      makePlan({ id: 2, renewableDescription: null }),
      makePlan({ id: 3, pricingDetails: null }),
      makePlan({
        id: 4,
        pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 },
      }),
      makePlan({ id: 5, termMonths: null }),
    ];

    expect(rankPlans(plans).map((plan) => plan.id)).toEqual([1]);
  });

  it("does not rank a plan above another that dominates every factor", () => {
    const better = makePlan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
      termMonths: 12,
      pricingDetails: "Cancellation fee $50",
      renewableDescription: "100% renewable",
    });
    const worse = makePlan({
      id: 2,
      pricePerKwh: { at500: 0.2, at1000: 0.2, at2000: 0.2 },
      termMonths: 36,
      pricingDetails: "Cancellation fee $200",
      renewableDescription: "0% renewable",
    });

    expect(rankPlans([worse, better]).map((plan) => plan.id)).toEqual([1, 2]);
  });
});

describe("priceCurveWarning", () => {
  const curve = (at500: number, at1000: number, at2000: number) =>
    makePlan({ pricePerKwh: { at500, at1000, at2000 } });

  it("flags a V-Trap (P1000 < P2000) and a Hump (P1000 > P500), per BRIEF.md", () => {
    expect(priceCurveWarning(curve(0.1, 0.09, 0.11))).toBe("v-trap");
    expect(priceCurveWarning(curve(0.1, 0.12, 0.11))).toBe("hump");
  });

  it("does not flag a curve that only falls or stays flat", () => {
    expect(priceCurveWarning(curve(0.13, 0.12, 0.11))).toBeNull();
    expect(priceCurveWarning(curve(0.12, 0.12, 0.12))).toBeNull();
  });

  it("says nothing when an anchor price is missing", () => {
    expect(
      priceCurveWarning(
        makePlan({ pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 } }),
      ),
    ).toBeNull();
  });

  it("agrees with the score: flagged exactly when S_slope is zero", () => {
    const curves: Array<[number, number, number]> = [
      [0.1, 0.09, 0.11],
      [0.1, 0.12, 0.11],
      [0.13, 0.12, 0.11],
      [0.12, 0.12, 0.12],
    ];
    for (const [a, b, c] of curves) {
      const plan = curve(a, b, c);
      const [scored] = scorePlans([plan]);
      expect(priceCurveWarning(plan) !== null).toBe(
        scored.breakdown.slope === 0,
      );
    }
  });
});

describe("time-of-use plans", () => {
  it("are not scored or ranked, and do not set the normalization range for the others", () => {
    const cheapTou = makePlan({
      id: 99,
      isTimeOfUse: true,
      pricePerKwh: { at500: 0.05, at1000: 0.05, at2000: 0.05 },
    });
    const a = makePlan({
      id: 1,
      pricePerKwh: { at500: 0.14, at1000: 0.14, at2000: 0.14 },
    });
    const b = makePlan({
      id: 2,
      pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
    });

    const withTou = scorePlans([a, b, cheapTou]);
    const without = scorePlans([a, b]);

    expect(withTou.map((s) => s.plan.id)).toEqual([2, 1]);
    // identical scores: P_min is 0.12, not the time-of-use plan's 0.05
    expect(withTou.map((s) => s.breakdown)).toEqual(
      without.map((s) => s.breakdown),
    );
    expect(rankPlans([cheapTou]).length).toBe(0);
  });
});
