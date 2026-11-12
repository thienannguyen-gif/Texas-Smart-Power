import { describe, expect, it } from "vitest";
import {
  scorablePlans,
  scorePlansV2,
  termScoreV2,
  WEIGHTS_V2,
} from "./scoreV2";
import type { Plan } from "../types/plan";

// prices are dollars per kWh; a flat rate makes the bill = rate x usage
const mk = (rate: number, over: Partial<Plan> = {}): Plan =>
  ({
    id: 1,
    planName: "Plan",
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: rate, at1000: rate, at2000: rate },
    pricingDetails: "Cancellation fee: $0.",
    isTimeOfUse: false,
    renewableDescription: "0% renewable",
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

const ids = (r: ReturnType<typeof scorePlansV2>) => r.map((s) => s.plan.id);

describe("termScoreV2", () => {
  it("is 10 for a year or longer and proportional below it", () => {
    expect(termScoreV2(12)).toBe(10);
    expect(termScoreV2(3)).toBe(2.5);
    expect(termScoreV2(6)).toBe(5);
    expect(termScoreV2(1)).toBeCloseTo(10 / 12, 12);
  });

  it("has no holes: 13, 16, 17, 25, 30, 36 and 60 months all score 10", () => {
    for (const L of [13, 16, 17, 18, 24, 25, 30, 35, 36, 37, 60]) {
      expect(termScoreV2(L)).toBe(10);
    }
  });
});

describe("scorePlansV2", () => {
  it("weights are 8, 3 and 1 over 12", () => {
    expect(WEIGHTS_V2.cost + WEIGHTS_V2.flexibility + WEIGHTS_V2.green).toBe(1);
    expect(WEIGHTS_V2.cost).toBeCloseTo(8 / 12, 12);
  });

  it("scores (8 S_cost + 3 S_flex + 1 S_green) / 12 from the plain monthly bill", () => {
    const cheap = mk(0.1, {
      id: 1,
      termMonths: 3,
      pricingDetails: "Cancellation fee: $100.",
      renewableDescription: "100% renewable",
    });
    const dear = mk(0.2, {
      id: 2,
      termMonths: 12,
      pricingDetails: "Cancellation fee: $200.",
      renewableDescription: "50% renewable",
    });
    const all = [cheap, dear];
    const [a, b] = scorePlansV2(all, all, 1000);
    // bills $100 and $200: cheap S_cost 10, dear 0
    // max fee 200: S_fee cheap 5, dear 0.  S_term cheap 2.5, dear 10
    expect(a.plan.id).toBe(1);
    expect(a.bill).toBe(100);
    expect(a.breakdown.cost).toBe(10);
    expect(a.breakdown.term).toBe(2.5);
    expect(a.breakdown.fee).toBe(5);
    expect(a.breakdown.flexibility).toBe(3.75);
    expect(a.breakdown.green).toBe(10);
    expect(a.breakdown.total).toBeCloseTo(
      (8 * 10 + 3 * 3.75 + 1 * 10) / 12,
      12,
    );
    expect(b.breakdown.cost).toBe(0);
    expect(b.breakdown.fee).toBe(0);
    expect(b.breakdown.flexibility).toBe(5);
    expect(b.breakdown.total).toBeCloseTo((0 + 3 * 5 + 5) / 12, 12);
  });

  it("recomputes the cost min and max over the displayed plans, but takes the highest fee over the whole area", () => {
    const area = [
      mk(0.1, { id: 1, pricingDetails: "Cancellation fee: $50." }),
      mk(0.2, { id: 2, pricingDetails: "Cancellation fee: $100." }),
      mk(0.3, { id: 3, pricingDetails: "Cancellation fee: $700." }),
    ];
    const shown = [area[0], area[1]]; // plan 3 filtered out
    const r = scorePlansV2(area, shown, 1000);
    expect(r[0].breakdown.cost).toBe(10);
    expect(r[1].breakdown.cost).toBe(0); // min-max over the two on screen
    // the fee is scaled by the $700 of the hidden plan, not by $100
    expect(r[0].breakdown.fee).toBeCloseTo(10 * (1 - 50 / 700), 12);
    expect(r[1].breakdown.fee).toBeCloseTo(10 * (1 - 100 / 700), 12);
  });

  it("gives every plan 10 for cost when the bills are all the same", () => {
    const all = [mk(0.1, { id: 1 }), mk(0.1, { id: 2 })];
    expect(scorePlansV2(all, all, 1000).map((s) => s.breakdown.cost)).toEqual([
      10, 10,
    ]);
    const one = [mk(0.1)];
    expect(scorePlansV2(one, one, 1000)[0].breakdown.cost).toBe(10);
  });

  it("gives every plan 10 for the fee when all fees are equal", () => {
    const all = [mk(0.1, { id: 1 }), mk(0.2, { id: 2 })];
    expect(scorePlansV2(all, all, 1000).map((s) => s.breakdown.fee)).toEqual([
      10, 10,
    ]);
  });

  it("ranks equal-priced plans by arrival order, comparing bills to the cent", () => {
    // 12, 24 and 36 months at one rate: the same bill, the same score
    const all = [36, 12, 24].map((termMonths, i) =>
      mk(0.13, { id: i + 1, termMonths }),
    );
    const r = scorePlansV2(all, all, 1000);
    expect(ids(r)).toEqual([1, 2, 3]);
    expect(new Set(r.map((s) => s.breakdown.total)).size).toBe(1);
    // a sub-cent difference in the bill does not reorder them either
    const noisy = [
      mk(0.13, { id: 1 }),
      mk(0.130000000001, { id: 2 }),
      mk(0.129999999999, { id: 3 }),
    ];
    expect(ids(scorePlansV2(noisy, noisy, 1000))).toEqual([1, 2, 3]);
  });

  it("uses the bill at the entered usage and changes with it, with no seasonal factor", () => {
    const steep = mk(0.1, {
      id: 1,
      pricePerKwh: { at500: 0.2, at1000: 0.1, at2000: 0.1 },
    });
    const flat = mk(0.12, { id: 2 });
    const all = [steep, flat];
    // at 500 kWh: steep $100 vs flat $60 -> flat is cheaper
    expect(ids(scorePlansV2(all, all, 500))).toEqual([2, 1]);
    // at 2,000 kWh: steep $200 vs flat $240 -> steep is cheaper
    expect(ids(scorePlansV2(all, all, 2000))).toEqual([1, 2]);
    expect(scorePlansV2(all, all, 1000)[0].bill).toBe(100);
  });

  it("does not score a price curve: a V-trap or hump costs only what it costs", () => {
    const vTrap = mk(0.1, {
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
    });
    const stable = mk(0.12, { id: 2 });
    const all = [stable, vTrap];
    // no slope term: the plan with the lower bill at 1,000 kWh ($90) wins
    expect(ids(scorePlansV2(all, all, 1000))).toEqual([1, 2]);
  });

  it("leaves out time-of-use plans and plans with a missing ranking input", () => {
    const ok = mk(0.1, { id: 1 });
    const tou = mk(0.05, { id: 2, isTimeOfUse: true });
    const noTerm = mk(0.05, { id: 3, termMonths: null });
    const noFee = mk(0.05, { id: 4, pricingDetails: null });
    const noGreen = mk(0.05, { id: 5, renewableDescription: null });
    const noPrice = mk(0.05, {
      id: 6,
      pricePerKwh: { at500: 0.05, at1000: null, at2000: 0.05 },
    });
    const all = [ok, tou, noTerm, noFee, noGreen, noPrice];
    expect(ids(scorePlansV2(all, all, 1000))).toEqual([1]);
    expect(scorablePlans(all, 1000).map((p) => p.id)).toEqual([1]);
  });

  it("returns an empty list for no plans", () => {
    expect(scorePlansV2([], [], 1000)).toEqual([]);
  });
});
