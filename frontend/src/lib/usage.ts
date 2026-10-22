import type { Plan } from "../types/plan";

// The usage level the app prices plans at by default, and the ranking/display
// anchor referenced in docs/student-build-guide.md §8.
export const DEFAULT_USAGE_KWH = 1000;

export const MIN_USAGE_KWH = 100;
export const MAX_USAGE_KWH = 4000;

/** Clamp a typed usage value into the allowed range (falls back to default). */
export function clampUsage(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_USAGE_KWH;
  return Math.min(MAX_USAGE_KWH, Math.max(MIN_USAGE_KWH, Math.round(value)));
}

/**
 * Price per kWh (in dollars) for a plan at a given monthly usage.
 *
 * The upstream data gives prices at 500 / 1000 / 2000 kWh. Prices between
 * anchors are linearly interpolated; outside the anchor range, the nearest
 * endpoint rate is held flat. Every anchor is required to estimate a price.
 */
export function pricePerKwhAtUsage(
  plan: Plan,
  usageKwh: number,
): number | null {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  if (!Number.isFinite(usageKwh)) return null;
  if (at500 === null || at1000 === null || at2000 === null) return null;
  if (usageKwh <= 500) return at500;
  if (usageKwh <= 1000) {
    return at500 + ((at1000 - at500) * (usageKwh - 500)) / 500;
  }
  if (usageKwh <= 2000) {
    return at1000 + ((at2000 - at1000) * (usageKwh - 1000)) / 1000;
  }
  return at2000;
}

/**
 * Estimated monthly bill in dollars: rate (dollars/kWh) x usage.
 */
export function estimatedMonthlyBill(
  plan: Plan,
  usageKwh: number,
): number | null {
  const rate = pricePerKwhAtUsage(plan, usageKwh);
  return rate === null ? null : rate * usageKwh;
}

/** The slider and the number box both move in steps of this many kWh. */
export const USAGE_STEP_KWH = 50;

export type UsageBand = "Efficient" | "Average Home" | "High Usage";

/**
 * Names the usage level: under 700 kWh is "Efficient", 700 to 1,400 (both
 * included) is "Average Home", above 1,400 is "High Usage".
 */
export function usageBand(kwh: number): UsageBand {
  if (kwh < 700) return "Efficient";
  if (kwh <= 1400) return "Average Home";
  return "High Usage";
}

/** The nearest slider position (a multiple of the step, from the minimum) to a typed value. */
export function snapToSlider(kwh: number): number {
  const clamped = clampUsage(kwh);
  return (
    MIN_USAGE_KWH +
    Math.round((clamped - MIN_USAGE_KWH) / USAGE_STEP_KWH) * USAGE_STEP_KWH
  );
}
