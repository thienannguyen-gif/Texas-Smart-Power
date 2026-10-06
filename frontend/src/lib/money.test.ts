import { describe, expect, it } from "vitest";
import { formatAmount, formatKwh, formatRate } from "./money";

describe("formatKwh", () => {
  it("uses a comma thousands separator", () => {
    expect(formatKwh(1000)).toBe("1,000");
    expect(formatKwh(850)).toBe("850");
    expect(formatKwh(4000)).toBe("4,000");
  });
});

describe("formatRate", () => {
  it("shows cents with one decimal and the /kWh unit", () => {
    expect(formatRate(0.139)).toBe("13.9¢/kWh");
    expect(formatRate(0.151)).toBe("15.1¢/kWh");
  });

  it("pads to one decimal and rounds to it", () => {
    expect(formatRate(0.16)).toBe("16.0¢/kWh");
    expect(formatRate(0.1394)).toBe("13.9¢/kWh");
    expect(formatRate(0.1396)).toBe("14.0¢/kWh");
  });

  it("converts dollars to cents exactly once", () => {
    expect(formatRate(0.114)).toBe("11.4¢/kWh");
    expect(formatRate(0.124)).toBe("12.4¢/kWh");
    expect(formatRate(0.119)).toBe("11.9¢/kWh");
    expect(formatRate(0.112)).toBe("11.2¢/kWh");
  });

  it("never uses a $ sign for a per-kWh rate", () => {
    expect(formatRate(0.114)).not.toContain("$");
  });

  it("handles zero", () => {
    expect(formatRate(0)).toBe("0.0¢/kWh");
  });

  it("returns a dash for a missing value", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(Number.NaN)).toBe("—");
  });
});

describe("formatAmount", () => {
  it("shows whole dollars with no decimals", () => {
    expect(formatAmount(139)).toBe("$139");
    expect(formatAmount(150)).toBe("$150");
    expect(formatAmount(0)).toBe("$0");
  });

  it("uses a thousands separator", () => {
    expect(formatAmount(1668)).toBe("$1,668");
    expect(formatAmount(12345)).toBe("$12,345");
    expect(formatAmount(1234567)).toBe("$1,234,567");
  });

  it("rounds cents to the nearest dollar", () => {
    expect(formatAmount(138.4)).toBe("$138");
    expect(formatAmount(138.6)).toBe("$139");
    expect(formatAmount(1667.5)).toBe("$1,668");
  });

  it("returns a dash for a missing value", () => {
    expect(formatAmount(null)).toBe("—");
    expect(formatAmount(Number.NaN)).toBe("—");
  });
});
