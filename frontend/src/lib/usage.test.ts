import { describe, expect, it } from "vitest";
import {
  clampUsage,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
  snapToSlider,
  usageBand,
} from "./usage";
import { formatAmount } from "./money";
import type { Plan } from "../types/plan";

const plan = {
  pricePerKwh: { at500: 0.127, at1000: 0.123, at2000: 0.121 },
} as Plan;

describe("pricePerKwhAtUsage", () => {
  it.each([
    [850, 0.1242],
    [1500, 0.122],
  ])("linearly interpolates %i kWh to %s dollars/kWh", (usage, rate) => {
    expect(pricePerKwhAtUsage(plan, usage)).toBeCloseTo(rate, 10);
  });

  it.each([
    [500, 0.127],
    [1000, 0.123],
    [2000, 0.121],
    [300, 0.127],
    [100, 0.127],
    [3000, 0.121],
    [4000, 0.121],
  ])("returns the expected rate at %i kWh", (usage, rate) => {
    expect(pricePerKwhAtUsage(plan, usage)).toBe(rate);
  });

  it("returns null when any anchor is missing", () => {
    const missingAt500 = {
      pricePerKwh: { at500: null, at1000: 0.123, at2000: 0.121 },
    } as Plan;
    const missingAt1000 = {
      pricePerKwh: { at500: 0.127, at1000: null, at2000: 0.121 },
    } as Plan;
    const missingAt2000 = {
      pricePerKwh: { at500: 0.127, at1000: 0.123, at2000: null },
    } as Plan;
    expect(pricePerKwhAtUsage(missingAt500, 500)).toBeNull();
    expect(pricePerKwhAtUsage(missingAt1000, 850)).toBeNull();
    expect(pricePerKwhAtUsage(missingAt2000, 3000)).toBeNull();
    expect(pricePerKwhAtUsage(plan, Number.NaN)).toBeNull();
  });
});

describe("estimatedMonthlyBill", () => {
  const p = {
    pricePerKwh: { at500: 0.119, at1000: 0.114, at2000: 0.112 },
  } as Plan;

  it("is rate in dollars x usage: 0.114 at 1000 kWh -> $114", () => {
    expect(formatAmount(estimatedMonthlyBill(p, 1000))).toBe("$114");
    expect(formatAmount(estimatedMonthlyBill(p, 500))).toBe("$60");
    expect(formatAmount(estimatedMonthlyBill(p, 2000))).toBe("$224");
  });

  it("prices 850 kWh at 12.22 cents and about $104 for 12.5/12.1/11.9", () => {
    const p850 = {
      pricePerKwh: { at500: 0.125, at1000: 0.121, at2000: 0.119 },
    } as Plan;
    expect(pricePerKwhAtUsage(p850, 850)).toBeCloseTo(0.1222, 10);
    expect(formatAmount(estimatedMonthlyBill(p850, 850))).toBe("$104");
  });

  it("calculates a bill using the interpolated rate", () => {
    expect(estimatedMonthlyBill(plan, 850)).toBeCloseTo(105.57, 10);
  });

  it("displays 0.130 dollars/kWh at 1000 kWh as $130", () => {
    const planAt130 = {
      pricePerKwh: { at500: 0.13, at1000: 0.13, at2000: 0.13 },
    } as Plan;
    expect(formatAmount(estimatedMonthlyBill(planAt130, 1000))).toBe("$130");
  });

  it("shows a thousands separator for large bills", () => {
    const big = {
      pricePerKwh: { at500: 1.14, at1000: 1.14, at2000: 1.14 },
    } as Plan;
    expect(formatAmount(estimatedMonthlyBill(big, 1000))).toBe("$1,140");
  });

  it("is null when any anchor price is missing", () => {
    const missing = {
      pricePerKwh: { at500: 0.119, at1000: null, at2000: 0.112 },
    } as Plan;
    expect(estimatedMonthlyBill(missing, 850)).toBeNull();
  });
});

describe("clampUsage", () => {
  it("keeps values inside 100–4000 and rounds", () => {
    expect(clampUsage(1350.7)).toBe(1351);
    expect(clampUsage(0)).toBe(100);
    expect(clampUsage(99999)).toBe(4000);
  });

  it("falls back to the default on NaN", () => {
    expect(clampUsage(Number.NaN)).toBe(1000);
  });
});

describe("usageBand", () => {
  it.each([
    [100, "Efficient"],
    [699, "Efficient"],
    [700, "Average Home"],
    [1000, "Average Home"],
    [1400, "Average Home"],
    [1401, "High Usage"],
    [4000, "High Usage"],
  ])("%i kWh is %s", (kwh, band) => {
    expect(usageBand(kwh)).toBe(band);
  });
});

describe("snapToSlider", () => {
  it("lands on a slider step (a multiple of 50 from 100) and stays in range", () => {
    expect(snapToSlider(1000)).toBe(1000);
    expect(snapToSlider(1234)).toBe(1250);
    expect(snapToSlider(1224)).toBe(1200);
    expect(snapToSlider(9999)).toBe(4000);
    expect(snapToSlider(0)).toBe(100);
    expect(snapToSlider(Number.NaN)).toBe(1000);
  });
});
