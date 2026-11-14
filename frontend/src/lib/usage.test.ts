import { describe, expect, it } from "vitest";
import {
  clampUsage,
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  formatUsageText,
  parseUsageText,
  presetForUsage,
  pricePerKwhAtUsage,
  searchWithUsage,
  USAGE_MAX,
  USAGE_MIN,
  USAGE_PRESETS,
  usageFromSearch,
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

describe("usage constants", () => {
  it("the default is the Small home preset, and the three presets are 850, 1150 and 1450", () => {
    expect(DEFAULT_USAGE_KWH).toBe(1150);
    expect(USAGE_PRESETS.map((p) => [p.id, p.label, p.kwh])).toEqual([
      ["apartment", "Apartment", 850],
      ["small_home", "Small home", 1150],
      ["large_home", "Large home", 1450],
    ]);
    expect(presetForUsage(DEFAULT_USAGE_KWH)?.id).toBe("small_home");
    expect(USAGE_MIN).toBe(100);
    expect(USAGE_MAX).toBe(5000);
  });
});

describe("clampUsage", () => {
  it("keeps values inside 100–5000 and rounds", () => {
    expect(clampUsage(1350.7)).toBe(1351);
    expect(clampUsage(0)).toBe(100);
    expect(clampUsage(50)).toBe(100);
    expect(clampUsage(99999)).toBe(5000);
  });

  it("falls back to the default on NaN", () => {
    expect(clampUsage(Number.NaN)).toBe(1150);
  });
});

describe("presetForUsage", () => {
  it("matches only an exact preset number", () => {
    expect(presetForUsage(850)?.id).toBe("apartment");
    expect(presetForUsage(1450)?.id).toBe("large_home");
    expect(presetForUsage(1451)).toBeNull();
    expect(presetForUsage(null)).toBeNull();
  });
});

describe("parseUsageText / formatUsageText", () => {
  it("reads 1680 and 1,680, and nothing else", () => {
    expect(parseUsageText("1680")).toBe(1680);
    expect(parseUsageText("1,680")).toBe(1680);
    expect(parseUsageText(" 1,150 ")).toBe(1150);
    expect(parseUsageText("")).toBeNull();
    expect(parseUsageText("abc")).toBeNull();
    expect(parseUsageText("12.5")).toBeNull();
    expect(parseUsageText("1,68")).toBeNull();
    expect(parseUsageText("-5")).toBeNull();
  });

  it("writes a comma every three digits", () => {
    expect(formatUsageText(850)).toBe("850");
    expect(formatUsageText(1150)).toBe("1,150");
    expect(formatUsageText(5000)).toBe("5,000");
  });
});

describe("the usage in the address", () => {
  it("reads usage, clamped, and falls back to the default", () => {
    expect(usageFromSearch("")).toBe(1150);
    expect(usageFromSearch("?zip=79424")).toBe(1150);
    expect(usageFromSearch("?zip=79424&usage=1680")).toBe(1680);
    expect(usageFromSearch("?usage=99999")).toBe(5000);
    expect(usageFromSearch("?usage=abc")).toBe(1150);
  });

  it("writes usage and leaves other parameters alone; the default is left out", () => {
    expect(searchWithUsage("", 1680)).toBe("?usage=1680");
    expect(searchWithUsage("?zip=79424", 1680)).toBe("?zip=79424&usage=1680");
    expect(searchWithUsage("?zip=79424&usage=1680", 900)).toBe(
      "?zip=79424&usage=900",
    );
    expect(searchWithUsage("?zip=79424&usage=1680", 1150)).toBe("?zip=79424");
    expect(searchWithUsage("?usage=1680", 1150)).toBe("");
  });
});
