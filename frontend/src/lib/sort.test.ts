import { describe, expect, it } from "vitest";
import type { Plan } from "../types/plan";
import { sortPlans, sortTimeOfUse } from "./sort";
import { costAt } from "./contractCost";

const mk = (
  id: number,
  at500: number | null,
  at1000: number | null,
  at2000: number | null,
): Plan => ({
  id,
  planName: `Plan ${id}`,
  companyName: "Co",
  termMonths: 12,
  rateType: "Fixed",
  pricePerKwh: { at500, at1000, at2000 },
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
});

// The plans arrive in "best match" (score) order: 1, 2, 3, 4.
const flat = mk(1, 0.12, 0.12, 0.12); // 60 / 120 / 240 at 500 / 1000 / 2000 kWh
const credit = mk(2, 0.2, 0.1, 0.1); // 100 / 100 / 200
const unstable = mk(3, 0.1, 0.09, 0.11); // 50 / 90 / 220  (V-trap: P1000 < P2000)
const noAnchor = mk(4, 0.01, 0.01, null); // no bill can be estimated
const plans = [flat, credit, unstable, noAnchor];

const ids = (list: Plan[]) => list.map((p) => p.id);

describe("sortPlans", () => {
  it("best match leaves the ranked order untouched", () => {
    expect(ids(sortPlans(plans, "best", 1000))).toEqual([1, 2, 3, 4]);
    expect(ids(sortPlans(plans, "best", 2000))).toEqual([1, 2, 3, 4]);
  });

  it("lowest total cost puts the plan with the lowest bill first, whatever its score", () => {
    const sorted = sortPlans(plans, "lowestCost", 1000);
    // 90, 100, 120, then the plan with no estimable bill
    expect(ids(sorted)).toEqual([3, 2, 1, 4]);
    // C(1000) = 10 x r1000, worked by hand: 10 x 9c = 90, 10 x 10c = 100, 10 x 12c = 120
    const bills = sorted.map((p) => costAt(p, 1000));
    expect(bills).toEqual([expect.closeTo(90), 100, expect.closeTo(120), null]);
  });

  it("an unstable price curve is not pushed down: it can be first", () => {
    expect(sortPlans(plans, "lowestCost", 500)[0].id).toBe(3); // 50 beats 60 and 100
  });

  it("the order follows the usage level", () => {
    expect(ids(sortPlans(plans, "lowestCost", 500))).toEqual([3, 1, 2, 4]); // 50, 60, 100
    expect(ids(sortPlans(plans, "lowestCost", 1000))).toEqual([3, 2, 1, 4]); // 90, 100, 120
    expect(ids(sortPlans(plans, "lowestCost", 2000))).toEqual([2, 3, 1, 4]); // 200, 220, 240
  });

  it("puts plans with no estimable bill last, in their arriving order", () => {
    const another = mk(5, 0.5, null, 0.5);
    expect(
      ids(sortPlans([noAnchor, another, flat], "lowestCost", 1000)),
    ).toEqual([1, 4, 5]);
  });

  // Old test: "ties keep the order the plans arrived in, and nothing else breaks
  // them". Now a tie goes to the lower cancellation fee, then the lower plan id,
  // so the order does not depend on how the plans arrived.
  it("ties go to the lower cancellation fee, then the lower plan id, not to arrival order", () => {
    const a = mk(10, 0.1, 0.1, 0.1);
    const b = mk(11, 0.1, 0.1, 0.1);
    expect(ids(sortPlans([b, a], "lowestCost", 1000))).toEqual([10, 11]);
    expect(ids(sortPlans([a, b], "lowestCost", 1000))).toEqual([10, 11]);
    const cheapExit = { ...b, pricingDetails: "Cancellation fee $20" };
    const dearExit = { ...a, pricingDetails: "Cancellation fee $200" };
    expect(ids(sortPlans([dearExit, cheapExit], "lowestCost", 1000))).toEqual([
      11, 10,
    ]);
  });

  it("sorts the time-of-use section by the same bill, a plan with no estimate last", () => {
    const cheap = mk(20, 0.08, 0.08, 0.08);
    const dear = mk(21, 0.15, 0.15, 0.15);
    expect(ids(sortTimeOfUse([noAnchor, dear, cheap], 1000))).toEqual([
      20, 21, 4,
    ]);
  });

  it("does not change the list it was given", () => {
    const input = [...plans];
    sortPlans(input, "lowestCost", 2000);
    expect(ids(input)).toEqual([1, 2, 3, 4]);
  });

  it("copes with no plans", () => {
    expect(sortPlans([], "lowestCost", 1000)).toEqual([]);
  });
});
