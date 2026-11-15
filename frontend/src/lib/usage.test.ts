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
import { costAt } from "./contractCost";
import type { Plan } from "../types/plan";

const plan = {
  pricePerKwh: { at500: 0.127, at1000: 0.123, at2000: 0.121 },
} as Plan;

// The rate shown is the bill from costAt divided by the usage, so it always
// agrees with the bill. Every expected number below is worked by hand from the
// fixture's r500 = 12.7c, r1000 = 12.3c, r2000 = 12.1c:
//   C500  = 5 x 12.7  = $63.50     C1000 = 10 x 12.3 = $123.00   C2000 = 20 x 12.1 = $242.00
//   m1 = (123.00 - 63.50) / 500  = 0.119 $/kWh
//   m2 = (242.00 - 123.00) / 1000 = 0.119 $/kWh
describe("pricePerKwhAtUsage", () => {
  it.each([
    // 850 kWh (between 500 and 1000): C = 63.50 + 0.119 x (850 - 500) = 63.50 + 41.65 = $105.15; 105.15 / 850
    [850, 105.15 / 850],
    // 1500 kWh (between 1000 and 2000): C = 123.00 + 0.119 x (1500 - 1000) = $182.50; 182.50 / 1500
    [1500, 182.5 / 1500],
  ])("interpolates the bill, not the rate: %i kWh -> %s dollars/kWh", (usage, rate) => {
    expect(pricePerKwhAtUsage(plan, usage)).toBeCloseTo(rate, 9);
  });

  it.each([
    [500, 0.127], // C500 / 500 = 63.50 / 500
    [1000, 0.123], // 123.00 / 1000
    [2000, 0.121], // 242.00 / 2000
  ])("returns the published rate at the anchor %i kWh", (usage, rate) => {
    expect(pricePerKwhAtUsage(plan, usage)).toBeCloseTo(rate, 12);
  });

  it.each([
    // below 500 the first segment carries on, floored at 0:
    // 300 kWh: C = max(0, 63.50 - 0.119 x (500 - 300)) = 63.50 - 23.80 = $39.70
    [300, 39.7 / 300],
    // 100 kWh: C = max(0, 63.50 - 0.119 x 400) = 63.50 - 47.60 = $15.90
    [100, 15.9 / 100],
    // above 2000 the last segment carries on:
    // 3000 kWh: C = 242.00 + 0.119 x (3000 - 2000) = $361.00
    [3000, 361 / 3000],
    // 4000 kWh: C = 242.00 + 0.119 x 2000 = $480.00
    [4000, 480 / 4000],
  ])("extends the nearest segment outside 500-2000: %i kWh", (usage, rate) => {
    expect(pricePerKwhAtUsage(plan, usage)).toBeCloseTo(rate, 9);
  });

  it("the bill never goes below $0: a steeply rising first segment floors at 0", () => {
    // r500 = 2c, r1000 = 20c: C500 = $10, C1000 = $200, m1 = (200 - 10) / 500 = 0.38.
    // At 100 kWh: 10 - 0.38 x (500 - 100) = 10 - 152 = -$142, floored to $0.
    const rising = {
      pricePerKwh: { at500: 0.02, at1000: 0.2, at2000: 0.2 },
    } as Plan;
    expect(pricePerKwhAtUsage(rising, 100)).toBe(0);
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

  it("at 850 kWh the old unit-price estimate and the exact bill differ; costAt is the right one", () => {
    // r500 = 12.5c, r1000 = 12.1c: C500 = $62.50, C1000 = $121.00,
    // m1 = (121.00 - 62.50) / 500 = 0.117; C(850) = 62.50 + 0.117 x 350 = $103.45.
    // The old way: rate = 12.5 + (12.1 - 12.5) x 350 / 500 = 12.22c, x 850 = $103.87.
    const p850 = {
      pricePerKwh: { at500: 0.125, at1000: 0.121, at2000: 0.119 },
    } as Plan;
    expect(costAt(p850, 850)).toBeCloseTo(103.45, 9);
    expect(pricePerKwhAtUsage(p850, 850)).toBeCloseTo(103.45 / 850, 9);
    expect(estimatedMonthlyBill(p850, 850)).toBeCloseTo(103.87, 9);
    expect(formatAmount(costAt(p850, 850))).toBe("$103");
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
