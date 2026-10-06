import { describe, expect, it } from "vitest";
import {
  clampUsage,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "./usage";
import { formatAmount } from "./money";
import type { Plan } from "../types/plan";

const plan = {
  pricePerKwh: { at500: 0.16, at1000: 0.15, at2000: 0.155 },
} as Plan;

describe("pricePerKwhAtUsage", () => {
  it("returns the exact anchor price at 500 / 1000 / 2000 kWh", () => {
    expect(pricePerKwhAtUsage(plan, 500)).toBe(0.16);
    expect(pricePerKwhAtUsage(plan, 1000)).toBe(0.15);
    expect(pricePerKwhAtUsage(plan, 2000)).toBe(0.155);
  });

  it("returns null for any non-anchor usage (interpolation rule not defined)", () => {
    expect(pricePerKwhAtUsage(plan, 1350)).toBeNull();
    expect(pricePerKwhAtUsage(plan, 100)).toBeNull();
    expect(pricePerKwhAtUsage(plan, 3000)).toBeNull();
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

  it("shows a thousands separator for large bills", () => {
    const big = {
      pricePerKwh: { at500: null, at1000: 1.14, at2000: null },
    } as Plan;
    expect(formatAmount(estimatedMonthlyBill(big, 1000))).toBe("$1,140");
  });

  it("is null when the price is missing or usage is not an anchor", () => {
    expect(estimatedMonthlyBill(p, 850)).toBeNull(); // no interpolation rule
    const missing = {
      pricePerKwh: { at500: null, at1000: null, at2000: null },
    } as Plan;
    expect(estimatedMonthlyBill(missing, 1000)).toBeNull();
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
