import { describe, expect, it, vi, afterEach } from "vitest";
import type { Plan } from "../types/plan";
import { costAt, rankByContractCost } from "./contractCost";
import { DEFAULT_FILTERS, filterPlans } from "./filters";
import { rankPlans, scorePlans } from "./ranking";
import { sortPlans } from "./sort";
import { estimatedMonthlyBill, pricePerKwhAtUsage } from "./usage";

const mk = (over: Partial<Plan> & { id: number }): Plan =>
  ({
    planName: `Plan ${over.id}`,
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
    pricingDetails: "Cancellation fee: $100.",
    isTimeOfUse: false,
    renewableDescription: "10% renewable",
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

const ids = (r: { plan: Plan }[]) => r.map((x) => x.plan.id);

afterEach(() => vi.useRealTimers());

describe("costAt is the bill, linear in the total between the anchors", () => {
  // r500 = 15c, r1000 = 13c: the bill is $75 at 500 and $130 at 1,000
  const p = mk({
    id: 1,
    pricePerKwh: { at500: 0.15, at1000: 0.13, at2000: 0.13 },
  });

  it("is continuous at 500, 1000 and 2000 (both sides give one value)", () => {
    const q = mk({
      id: 2,
      pricePerKwh: { at500: 0.15, at1000: 0.13, at2000: 0.12 },
    });
    for (const u of [500, 1000, 2000]) {
      expect(costAt(q, u - 1e-9)!).toBeCloseTo(costAt(q, u)!, 6);
      expect(costAt(q, u + 1e-9)!).toBeCloseTo(costAt(q, u)!, 6);
    }
    expect(costAt(q, 500)).toBeCloseTo(75, 9);
    expect(costAt(q, 1000)).toBeCloseTo(130, 9);
    expect(costAt(q, 2000)).toBeCloseTo(240, 9);
  });

  it("is never negative, even at 0 kWh", () => {
    expect(costAt(p, 0)!).toBeGreaterThanOrEqual(0);
    const steep = mk({
      id: 3,
      pricePerKwh: { at500: 0.3, at1000: 0.1, at2000: 0.1 },
    });
    expect(costAt(steep, 0)!).toBeGreaterThanOrEqual(0);
  });

  it("agrees with the old estimate exactly at 500, 1000 and 2000 and differs between: costAt is the right one", () => {
    for (const u of [500, 1000, 2000]) {
      expect(costAt(p, u)!).toBeCloseTo(estimatedMonthlyBill(p, u)!, 9);
    }
    // 750 kWh: $75 + (130 - 75) / 500 * 250 = $102.50 is exact; interpolating the
    // unit price (14c) and multiplying gives $105.00
    expect(costAt(p, 750)).toBeCloseTo(102.5, 9);
    expect(estimatedMonthlyBill(p, 750)).toBeCloseTo(105, 9);
  });
});

// A plan whose two slopes differ, so a mix-up of m1 and m2 (or of the two
// branches) cannot pass. r500 = 15c, r1000 = 13c, r2000 = 12.5c, by hand:
//   C500 = 5 x 15 = $75.00     C1000 = 10 x 13 = $130.00    C2000 = 20 x 12.5 = $250.00
//   m1 = (130 - 75) / 500 = 0.11 $/kWh     m2 = (250 - 130) / 1000 = 0.12 $/kWh
describe("costAt with m1 != m2", () => {
  const p = mk({
    id: 50,
    pricePerKwh: { at500: 0.15, at1000: 0.13, at2000: 0.125 },
  });

  it.each([
    // below 500: max(0, C500 - m1 x (500 - u))
    [100, 75 - 0.11 * 400], // 75 - 44 = $31.00
    [300, 75 - 0.11 * 200], // 75 - 22 = $53.00
    // 500 to 1000: C500 + m1 x (u - 500)
    [500, 75],
    [850, 75 + 0.11 * 350], // 75 + 38.5 = $113.50
    [1000, 130],
    // 1000 to 2000: C1000 + m2 x (u - 1000)
    [1500, 130 + 0.12 * 500], // 130 + 60 = $190.00
    [2000, 250],
    // above 2000: C2000 + m2 x (u - 2000)
    [3000, 250 + 0.12 * 1000], // $370.00
    [4000, 250 + 0.12 * 2000], // $490.00
  ])("is the hand-worked bill at %i kWh", (usage, bill) => {
    expect(costAt(p, usage)).toBeCloseTo(bill, 9);
  });

  it("uses m1 below 1000 and m2 above it: the two slopes are not interchangeable", () => {
    // if m2 (0.12) were used below 1000, 850 kWh would be 75 + 0.12 x 350 = $117
    expect(costAt(p, 850)).not.toBeCloseTo(117, 2);
    // if m1 (0.11) were used above 1000, 1500 kWh would be 130 + 0.11 x 500 = $185
    expect(costAt(p, 1500)).not.toBeCloseTo(185, 2);
  });

  it("the rate shown is that bill over the usage", () => {
    expect(pricePerKwhAtUsage(p, 850)).toBeCloseTo(113.5 / 850, 9);
    expect(pricePerKwhAtUsage(p, 3000)).toBeCloseTo(370 / 3000, 9);
  });
});

describe("rankByContractCost", () => {
  const plans = [
    mk({ id: 1, pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 } }),
    mk({ id: 2, pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 } }),
    mk({ id: 3, pricePerKwh: { at500: 0.11, at1000: 0.11, at2000: 0.11 } }),
  ];

  it("with one L, the order by C(u0) is the order by L x C(u0)", () => {
    const r = rankByContractCost(plans, 1000);
    expect(ids(r)).toEqual([2, 3, 1]);
    const byTotal = [...r].sort((a, b) => a.total - b.total);
    expect(ids(byTotal)).toEqual(ids(r));
    expect(r[0].total).toBeCloseTo(12 * r[0].perMonth, 9);
  });

  it("two bills less than half a cent apart tie on the cent, then the lower cancellation fee wins", () => {
    const a = mk({
      id: 20,
      pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
      pricingDetails: "Cancellation fee: $300.",
    });
    const b = mk({
      id: 10,
      pricePerKwh: { at500: 0.12, at1000: 0.120000004, at2000: 0.12 },
      pricingDetails: "Cancellation fee: $50.",
    });
    expect(costAt(a, 1000)).not.toBe(costAt(b, 1000));
    expect(ids(rankByContractCost([a, b], 1000))).toEqual([10, 20]);
    expect(ids(rankByContractCost([b, a], 1000))).toEqual([10, 20]);
  });

  it("then the lower plan id when the fee is the same too", () => {
    const a = mk({ id: 9 });
    const b = mk({ id: 4 });
    expect(ids(rankByContractCost([a, b], 1000))).toEqual([4, 9]);
  });

  it("does not depend on the time of the year", () => {
    const run = (iso: string) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      const out = rankByContractCost(plans, 1150).map((x) => [
        x.plan.id,
        x.perMonth,
        x.total,
      ]);
      vi.useRealTimers();
      return out;
    };
    expect(run("2026-01-15T12:00:00Z")).toEqual(run("2026-08-15T12:00:00Z"));
  });

  it("leaves time-of-use plans and plans with a missing anchor out", () => {
    const tou = mk({ id: 30, isTimeOfUse: true });
    const hole = mk({
      id: 31,
      pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 },
    });
    expect(ids(rankByContractCost([tou, hole, ...plans], 1000))).toEqual([
      2, 3, 1,
    ]);
  });

  it("rankPlans (the nightly order) is score v3 at the default usage, not the cost order", () => {
    // flat rates, so CE is proportional to the rate (S_cost = 10 (0.13 - r) / 0.03):
    //   Cheap 10c, fee $700 (S_fee 0), 0% renewable:  80 + 3 x 5  + 0  = 95
    //   Mid 10.5c, fee $0, 100% renewable:  66.7 + 3 x 10 + 10 = 106.7
    //   Dear 13c, fee $0, 0% renewable:      0 + 3 x 10 + 0   = 30
    const cheap = mk({
      id: 61,
      pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
      pricingDetails: "Cancellation fee: $700.",
      renewableDescription: "0% renewable",
    });
    const mid = mk({
      id: 62,
      pricePerKwh: { at500: 0.105, at1000: 0.105, at2000: 0.105 },
      pricingDetails: "Cancellation fee: $0.",
      renewableDescription: "100% renewable",
    });
    const dear = mk({
      id: 63,
      pricePerKwh: { at500: 0.13, at1000: 0.13, at2000: 0.13 },
      pricingDetails: "Cancellation fee: $0.",
      renewableDescription: "0% renewable",
    });
    expect(rankPlans([cheap, mid, dear]).map((p) => p.id)).toEqual([
      62, 61, 63,
    ]);
    expect(
      rankByContractCost([cheap, mid, dear], 1150).map((c) => c.plan.id),
    ).toEqual([61, 62, 63]);
    expect(scorePlans([dear, cheap, mid]).map((s) => s.plan.id)).toEqual([
      62, 61, 63,
    ]);
  });

  it("sortPlans('lowestCost') is the same order, with an uncostable plan last", () => {
    const hole = mk({
      id: 31,
      pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 },
    });
    expect(
      sortPlans([hole, ...plans], "lowestCost", 1000).map((p) => p.id),
    ).toEqual([2, 3, 1, 31]);
  });
});

describe("the contract-length filter", () => {
  it("opens on 12 months only", () => {
    expect(DEFAULT_FILTERS.contractBuckets).toEqual(["m12"]);
    const three = mk({ id: 1, termMonths: 3 });
    const twelve = mk({ id: 2, termMonths: 12 });
    expect(
      filterPlans([three, twelve], DEFAULT_FILTERS).map((p) => p.id),
    ).toEqual([2]);
  });
});
