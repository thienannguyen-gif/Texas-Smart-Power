import { describe, expect, it } from "vitest";
import { computeAwards } from "./awards";
import type { Plan } from "../types/plan";

const plan = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    // stable curve: falls as usage rises
    pricePerKwh: { at500: 0.14, at1000: 0.12, at2000: 0.11 },
    pricingDetails: null,
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

const summary = (picks: ReturnType<typeof computeAwards>) =>
  picks.map((p) => [p.plan.id, p.awards]);

describe("computeAwards", () => {
  it("gives best overall to the first plan in score order", () => {
    const picks = computeAwards(
      [plan({ id: 1, termMonths: 24 }), plan({ id: 2, termMonths: 24 })],
      1000,
    );
    expect(summary(picks)).toEqual([[1, ["best-overall"]]]);
  });

  it("gives best 100% green to the best-scored plan at 100% renewable", () => {
    const picks = computeAwards(
      [
        plan({ id: 1, termMonths: 24 }),
        plan({ id: 2, termMonths: 24, renewableDescription: "99% renewable" }),
        plan({ id: 3, termMonths: 24, renewableDescription: "100% Renewable" }),
        plan({ id: 4, termMonths: 24, renewableDescription: "100% Renewable" }),
      ],
      1000,
    );
    expect(summary(picks)).toEqual([
      [1, ["best-overall"]],
      [3, ["best-green"]],
    ]);
  });

  it("gives cheapest 12-month to the lowest bill at the current usage, not the lowest rate at 1,000", () => {
    const a = plan({
      id: 1,
      termMonths: 24,
      pricePerKwh: { at500: 0.2, at1000: 0.1, at2000: 0.1 },
    });
    const b = plan({
      id: 2,
      pricePerKwh: { at500: 0.2, at1000: 0.12, at2000: 0.08 },
    });
    const c = plan({
      id: 3,
      pricePerKwh: { at500: 0.2, at1000: 0.11, at2000: 0.09 },
    });
    // at 1,000 kWh: b $120, c $110 -> c.   at 2,000 kWh: b $160, c $180 -> b.
    expect(summary(computeAwards([a, b, c], 1000))[1]).toEqual([
      3,
      ["cheapest-12"],
    ]);
    expect(summary(computeAwards([a, b, c], 2000))[1]).toEqual([
      2,
      ["cheapest-12"],
    ]);
  });

  it("puts a plan that wins several awards on one card, never two", () => {
    const winner = plan({ id: 1, renewableDescription: "100% Renewable" });
    const picks = computeAwards([winner, plan({ id: 2 })], 1000);
    expect(picks).toHaveLength(1);
    expect(picks[0].plan.id).toBe(1);
    expect(picks[0].awards).toEqual([
      "best-overall",
      "best-green",
      "cheapest-12",
    ]);
  });

  it("never lets an unstable price curve win: a V-trap or a hump is skipped", () => {
    const vTrap = plan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
      renewableDescription: "100% Renewable",
    });
    const hump = plan({
      id: 2,
      pricePerKwh: { at500: 0.1, at1000: 0.12, at2000: 0.11 },
      renewableDescription: "100% Renewable",
    });
    const stable = plan({ id: 3, termMonths: 24 });
    expect(summary(computeAwards([vTrap, hump, stable], 1000))).toEqual([
      [3, ["best-overall"]],
    ]);
  });

  it("drops an award nobody qualifies for, and returns nothing for nothing", () => {
    // no 100% plan and no 12-month plan: best overall only
    expect(computeAwards([plan({ id: 1, termMonths: 24 })], 1000)).toHaveLength(
      1,
    );
    expect(computeAwards([], 1000)).toEqual([]);
    // only unstable plans: no picks at all
    const unstable = plan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
    });
    expect(computeAwards([unstable], 1000)).toEqual([]);
  });

  it("skips a 12-month plan whose bill cannot be estimated, and time-of-use plans", () => {
    const noBill = plan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: null },
    });
    const ok = plan({ id: 2 });
    const tou = plan({ id: 3, isTimeOfUse: true });
    const picks = computeAwards([noBill, ok, tou], 1000);
    const cheapest = picks.find((pick) => pick.awards.includes("cheapest-12"));
    expect(cheapest?.plan.id).toBe(2);
    expect(picks.some((pick) => pick.plan.id === 3)).toBe(false);
  });
});
