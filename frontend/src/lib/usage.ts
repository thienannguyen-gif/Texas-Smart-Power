import type { Plan } from "../types/plan.js";

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

export type UsageBand =
  "Efficient" | "Average Home" | "Power User" | "Heavy User";

/**
 * Names the usage level, the one place these thresholds live. A boundary value
 * belongs to the band below it: 500 and 1,000 are both "Average Home".
 *
 *   kWh < 500           Efficient
 *   500 to 1,000        Average Home
 *   1,000 to 2,000      Power User   (above 1,000, up to and including 2,000)
 *   above 2,000         Heavy User
 */
export function usageBand(kwh: number): UsageBand {
  if (kwh < 500) return "Efficient";
  else if (kwh <= 1000) return "Average Home";
  else if (kwh <= 2000) return "Power User";
  else return "Heavy User";
}

/** The nearest slider position (a multiple of the step, from the minimum) to a typed value. */
export function snapToSlider(kwh: number): number {
  const clamped = clampUsage(kwh);
  return (
    MIN_USAGE_KWH +
    Math.round((clamped - MIN_USAGE_KWH) / USAGE_STEP_KWH) * USAGE_STEP_KWH
  );
}

/**
 * The only three usage levels Power to Choose publishes a price for; every other
 * usage is interpolated (see pricePerKwhAtUsage).
 */
export const USAGE_ANCHORS_KWH = [500, 1000, 2000] as const;

/** Releasing the slider this close to an anchor (or closer) snaps to it. */
export const ANCHOR_SNAP_KWH = 25;

/** The anchor within ANCHOR_SNAP_KWH of `kwh`, else `kwh` unchanged. */
export function snapToAnchor(kwh: number): number {
  const near = USAGE_ANCHORS_KWH.find(
    (anchor) => Math.abs(kwh - anchor) <= ANCHOR_SNAP_KWH,
  );
  return near ?? kwh;
}

/** PageUp / PageDown move the slider by this much. */
export const USAGE_PAGE_KWH = 500;
