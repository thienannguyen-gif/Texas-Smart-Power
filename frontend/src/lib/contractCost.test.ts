import { describe, expect, it } from "vitest";
import {
  contractCost,
  costAt,
  currentStartMonth,
  describeMonths,
  rankByContractCost,
  SEASON,
  termListOf,
} from "./contractCost";
import type { Plan } from "../types/plan";

// prices are dollars per kWh, as a Plan stores them
const plan = (over: Partial<Plan> = {}): Plan =>
  ({
    id: 1,
    planName: "Plan",
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.14, at1000: 0.12, at2000: 0.11 },
    pricingDetails: null,
    isTimeOfUse: false,
    renewableDescription: null,
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

const flat = (rate: number, over: Partial<Plan> = {}) =>
  plan({ pricePerKwh: { at500: rate, at1000: rate, at2000: rate }, ...over });

describe("SEASON", () => {
  it("has twelve factors of 4 decimals that sum to exactly 12", () => {
    expect(SEASON).toHaveLength(12);
    expect(SEASON.reduce((a, b) => a + Math.round(b * 1e4), 0)).toBe(120000);
    SEASON.forEach((f) => expect(Math.round(f * 1e4) / 1e4).toBe(f));
  });
});

describe("rankedPerMonth: the long list is priced on its first twelve months", () => {
  it("is the same for 12, 14, 18, 24 and 36 months of the same plan, from any start month", () => {
    for (const start of [0, 4, 10]) {
      const base = contractCost(plan({ termMonths: 12 }), 1000, start)!;
      for (const termMonths of [13, 14, 15, 18, 24, 36]) {
        const c = contractCost(plan({ termMonths }), 1000, start)!;
        expect(c.rankedPerMonth).toBeCloseTo(base.rankedPerMonth, 9);
      }
    }
  });

  it("gives an 18-month plan no discount for starting in November", () => {
    // its own-term average does drop (the extra months are cheap); the ranked figure must not
    const eighteen = contractCost(plan({ termMonths: 18 }), 1000, 10)!;
    const twelve = contractCost(plan({ termMonths: 12 }), 1000, 10)!;
    expect(eighteen.perMonth).toBeLessThan(twelve.perMonth * 0.97);
    expect(eighteen.rankedPerMonth).toBeCloseTo(twelve.rankedPerMonth, 9);
    // the real term and the real total are still reported
    expect(eighteen.monthsCovered).toHaveLength(18);
    expect(eighteen.total).toBeGreaterThan(twelve.total);
  });

  it("is the own-term average for a contract under 12 months", () => {
    const c = contractCost(flat(0.1, { termMonths: 3 }), 1000, 6)!;
    expect(c.rankedPerMonth).toBeCloseTo(c.perMonth, 9);
  });
});

describe("usage fragility, in dollars", () => {
  it("is small for a flat plan and large for a curved one", () => {
    // flat 10c: 20% more usage is +20% of the bill, 20% less is -20%
    const f = contractCost(flat(0.1, { termMonths: 12 }), 1000, 0)!;
    expect(f.moreUsageDelta).toBeCloseTo(f.rankedPerMonth * 0.2, 6);
    expect(f.lessUsageDelta).toBeCloseTo(-f.rankedPerMonth * 0.2, 6);
    // a hump: the rate jumps after 1,000 kWh, so more usage costs about 2.5x the flat plan's 20%
    const hump = plan({
      pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.3 },
    });
    const h = contractCost(hump, 1000, 0)!;
    expect(h.moreUsageDelta / h.rankedPerMonth).toBeGreaterThan(0.4);
  });

  it("adds no penalty: the ranking figure itself is untouched", () => {
    const hump = plan({
      pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.3 },
    });
    const c = contractCost(hump, 1000, 0)!;
    const direct =
      SEASON.reduce((sum, s) => sum + costAt(hump, 1000 * s)!, 0) / 12;
    expect(c.rankedPerMonth).toBeCloseTo(direct, 9);
  });
});

describe("costAt", () => {
  // c500 = 70, c1000 = 120, c2000 = 220 dollars; m1 = 0.1, m2 = 0.1
  it("hits the three anchors exactly", () => {
    expect(costAt(plan(), 500)).toBeCloseTo(70, 9);
    expect(costAt(plan(), 1000)).toBeCloseTo(120, 9);
    expect(costAt(plan(), 2000)).toBeCloseTo(220, 9);
  });

  it("interpolates between anchors", () => {
    const p = plan({ pricePerKwh: { at500: 0.14, at1000: 0.12, at2000: 0.1 } });
    // c500 70, c1000 120, c2000 200
    expect(costAt(p, 750)).toBeCloseTo(95, 9);
    expect(costAt(p, 1500)).toBeCloseTo(160, 9);
  });

  it("continues the first slope below 500 and the last slope above 2000", () => {
    const p = plan({ pricePerKwh: { at500: 0.14, at1000: 0.12, at2000: 0.1 } });
    expect(costAt(p, 300)).toBeCloseTo(70 - 0.1 * 200, 9);
    expect(costAt(p, 3000)).toBeCloseTo(200 + 0.08 * 1000, 9);
  });

  it("never goes below zero", () => {
    const p = plan({ pricePerKwh: { at500: 0.01, at1000: 0.5, at2000: 0.5 } });
    expect(costAt(p, 100)).toBe(0);
  });

  it("returns null when an anchor is missing, not a guess", () => {
    expect(
      costAt(
        plan({ pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 } }),
        1000,
      ),
    ).toBeNull();
  });
});

describe("contractCost", () => {
  it("is the sum of the real monthly bills of the months it covers", () => {
    const p = flat(0.1, { termMonths: 3 }); // a flat 10c rate: bill = usage * 0.1
    const c = contractCost(p, 1000, 10)!; // Nov, Dec, Jan
    const expected = [SEASON[10], SEASON[11], SEASON[0]].map((s) => 100 * s);
    expect(c.total).toBeCloseTo(
      expected.reduce((a, b) => a + b, 0),
      9,
    );
    expect(c.perMonth).toBeCloseTo(c.total / 3, 9);
    expect(c.worstMonth).toBeCloseTo(Math.max(...expected), 9);
    expect(c.monthsCovered).toEqual(["Nov", "Dec", "Jan"]);
  });

  it("wraps past December and lists one month name per month of the term", () => {
    const c = contractCost(flat(0.1, { termMonths: 14 }), 1000, 11)!;
    expect(c.monthsCovered).toHaveLength(14);
    expect(c.monthsCovered.slice(0, 3)).toEqual(["Dec", "Jan", "Feb"]);
    expect(c.monthsCovered[13]).toBe("Jan");
  });

  it("gives the same per-month figure for 12, 24 and 36 months of the same plan", () => {
    const [a, b, c] = [12, 24, 36].map(
      (termMonths) => contractCost(plan({ termMonths }), 1000, 4)!.perMonth,
    );
    expect(b).toBeCloseTo(a, 9);
    expect(c).toBeCloseTo(a, 9);
  });

  it("depends on the start month for a short contract: July carries more than March", () => {
    const p = flat(0.1, { termMonths: 3 });
    const july = contractCost(p, 1000, 6)!.perMonth;
    const march = contractCost(p, 1000, 2)!.perMonth;
    expect(july).toBeGreaterThan(march);
  });

  it("defaults the start month to the current month from the clock", () => {
    const p = flat(0.1, { termMonths: 3 });
    const now = currentStartMonth();
    expect(contractCost(p, 1000)!.monthsCovered[0]).toBe(
      contractCost(p, 1000, now)!.monthsCovered[0],
    );
    expect(currentStartMonth(new Date(2026, 6, 15))).toBe(6);
  });

  it("returns null for a plan with no usable term or a missing price", () => {
    expect(contractCost(plan({ termMonths: null }), 1000, 0)).toBeNull();
    expect(contractCost(plan({ termMonths: 0 }), 1000, 0)).toBeNull();
    expect(
      contractCost(
        plan({ pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: null } }),
        1000,
        0,
      ),
    ).toBeNull();
  });
});

describe("describeMonths", () => {
  it("lists the months of a contract of a year or less", () => {
    expect(describeMonths(["Nov", "Dec", "Jan"])).toBe("Nov, Dec, Jan");
    expect(describeMonths(contractCost(plan(), 1000, 0)!.monthsCovered)).toBe(
      "Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec",
    );
  });

  it("names the first and last month and the length of a longer contract", () => {
    const months = contractCost(
      flat(0.1, { termMonths: 15 }),
      1000,
      10,
    )!.monthsCovered;
    expect(describeMonths(months)).toBe("Nov to Jan, 15 months");
  });
});

describe("termListOf", () => {
  it("puts under 12 months in short and 12 and up in long", () => {
    expect(termListOf(plan({ termMonths: 1 }))).toBe("short");
    expect(termListOf(plan({ termMonths: 11 }))).toBe("short");
    expect(termListOf(plan({ termMonths: 12 }))).toBe("long");
    expect(termListOf(plan({ termMonths: 36 }))).toBe("long");
    expect(termListOf(plan({ termMonths: null }))).toBeNull();
  });
});

describe("rankByContractCost", () => {
  const plans = [
    flat(0.12, { id: 1, termMonths: 12 }),
    flat(0.1, { id: 2, termMonths: 36 }),
    flat(0.11, { id: 3, termMonths: 24 }),
    flat(0.09, { id: 4, termMonths: 3 }),
    flat(0.13, { id: 5, termMonths: 6 }),
    flat(0.105, { id: 6, termMonths: 12 }),
  ];

  it("keeps the two lists apart and sorts each by per-month cost, cheapest first", () => {
    const long = rankByContractCost(plans, "long", 1000, 0).map(
      (c) => c.plan.id,
    );
    const short = rankByContractCost(plans, "short", 1000, 0).map(
      (c) => c.plan.id,
    );
    // 12, 24 and 36 months are compared on one footing: only the rate differs
    expect(long).toEqual([2, 6, 3, 1]);
    expect(short).toEqual([4, 5]);
  });

  it("keeps the arrival order of plans that cost the same, whatever the term", () => {
    // 12, 24 and 36 months of one rate differ only by floating point noise
    const same = [36, 12, 24].map((termMonths, i) =>
      flat(0.13, { id: i + 1, termMonths }),
    );
    const ids = rankByContractCost(same, "long", 1000, 0).map((c) => c.plan.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it("sorts by perMonth, not total", () => {
    const [first] = rankByContractCost(plans, "long", 1000, 0);
    expect(first.plan.id).toBe(2); // 36 months: the biggest total, the lowest per month
    const totals = rankByContractCost(plans, "long", 1000, 0).map(
      (c) => c.cost.total,
    );
    expect(totals[0]).toBeGreaterThan(totals[3]);
  });

  it("leaves out a plan that cannot be costed and does not mutate its input", () => {
    const broken = plan({ id: 9, termMonths: null });
    const input = [broken, ...plans];
    const copy = [...input];
    const ids = [
      ...rankByContractCost(input, "long", 1000, 0),
      ...rankByContractCost(input, "short", 1000, 0),
    ].map((c) => c.plan.id);
    expect(ids).not.toContain(9);
    expect(input).toEqual(copy);
  });
});
