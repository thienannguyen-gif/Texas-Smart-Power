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
  it("gives best overall to the best-scored plan with a 12-month term", () => {
    const picks = computeAwards(
      [
        plan({ id: 1, termMonths: 3 }), // best score, but 3 months
        plan({ id: 2, termMonths: 12 }),
        plan({ id: 3, termMonths: 12 }),
      ],
      1000,
    );
    const overall = picks.find((p) => p.awards.includes("best-overall"));
    expect(overall?.plan.id).toBe(2);
  });

  it("means exactly 12 months: 11, 13 and 24 are not 12", () => {
    for (const termMonths of [11, 13, 24, null]) {
      const picks = computeAwards([plan({ id: 1, termMonths })], 1000);
      expect(picks.some((p) => p.awards.includes("best-overall"))).toBe(false);
    }
    const twelve = computeAwards([plan({ id: 1, termMonths: 12 })], 1000);
    expect(twelve.some((p) => p.awards.includes("best-overall"))).toBe(true);
  });

  it("drops best overall, rather than falling back to another term, when no 12-month plan is shown", () => {
    const picks = computeAwards(
      [plan({ id: 1, termMonths: 3 }), plan({ id: 2, termMonths: 24 })],
      1000,
    );
    expect(picks.flatMap((p) => p.awards)).not.toContain("best-overall");
    // the other awards still stand
    expect(picks.flatMap((p) => p.awards)).toContain("lowest-bill");
  });

  it("gives lowest bill to the lowest estimated bill at the current usage, any term", () => {
    // at 1,000 kWh: b $120, c $110 -> c.   at 2,000 kWh: b $160, c $180 -> b.
    const a = plan({
      id: 1,
      termMonths: 24,
      pricePerKwh: { at500: 0.2, at1000: 0.13, at2000: 0.13 },
    });
    const b = plan({
      id: 2,
      termMonths: 3,
      pricePerKwh: { at500: 0.2, at1000: 0.12, at2000: 0.08 },
    });
    const c = plan({
      id: 3,
      termMonths: 36,
      pricePerKwh: { at500: 0.2, at1000: 0.11, at2000: 0.09 },
    });
    const lowest = (usage: number) =>
      computeAwards([a, b, c], usage).find((p) =>
        p.awards.includes("lowest-bill"),
      )?.plan.id;
    expect(lowest(1000)).toBe(3);
    expect(lowest(2000)).toBe(2);
  });

  it("has no green award: renewable content plays no part in the picks", () => {
    const plans = [
      plan({ id: 1, termMonths: 24 }),
      plan({ id: 2, termMonths: 24, renewableDescription: "100% Renewable" }),
    ];
    const awards = computeAwards(plans, 1000).flatMap((p) => p.awards);
    expect(awards).toEqual(["lowest-bill"]);
    // a 100% plan does not win anything for being 100%
    const withGreen = computeAwards(
      [plan({ id: 3, renewableDescription: "100% Renewable" })],
      1000,
    );
    expect(withGreen[0].awards).toEqual(["best-overall", "lowest-bill"]);
  });

  it("puts a plan that wins both awards on one card, never two", () => {
    const winner = plan({ id: 1 });
    const picks = computeAwards([winner, plan({ id: 2 })], 1000);
    expect(picks).toHaveLength(1);
    expect(picks[0].plan.id).toBe(1);
    expect(picks[0].awards).toEqual(["best-overall", "lowest-bill"]);
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
    const stable = plan({ id: 3 });
    expect(summary(computeAwards([vTrap, hump, stable], 1000))).toEqual([
      [3, ["best-overall", "lowest-bill"]],
    ]);
  });

  it("returns nothing, not an empty card, when nobody qualifies", () => {
    expect(computeAwards([], 1000)).toEqual([]);
    const unstable = plan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
    });
    expect(computeAwards([unstable], 1000)).toEqual([]);
  });

  it("skips a plan whose bill cannot be estimated for lowest bill, and time-of-use plans", () => {
    const noBill = plan({
      id: 1,
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: null },
    });
    const ok = plan({ id: 2 });
    const tou = plan({ id: 3, isTimeOfUse: true });
    const picks = computeAwards([noBill, ok, tou], 1000);
    const lowest = picks.find((p) => p.awards.includes("lowest-bill"));
    expect(lowest?.plan.id).toBe(2);
    expect(picks.some((p) => p.plan.id === 3)).toBe(false);
  });
});
