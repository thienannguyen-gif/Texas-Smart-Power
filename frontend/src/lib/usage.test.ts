import { describe, expect, it } from "vitest";
import { clampUsage, pricePerKwhAtUsage } from "./usage";
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
