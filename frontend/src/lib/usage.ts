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
 * The upstream data only gives a price at exactly 500 / 1000 / 2000 kWh. How to
 * price a usage *between* those points (interpolation) is a BRIEF.md rule that
 * does not exist yet, so this returns the exact anchor price when usage matches
 * one, and `null` otherwise.
 */
export function pricePerKwhAtUsage(
  plan: Plan,
  usageKwh: number,
): number | null {
  switch (usageKwh) {
    case 500:
      return plan.pricePerKwh.at500;
    case 1000:
      return plan.pricePerKwh.at1000;
    case 2000:
      return plan.pricePerKwh.at2000;
    default:
      return null; // TODO(BRIEF.md): interpolation rule
  }
}

/**
 * Estimated monthly bill in dollars: rate (dollars/kWh) x usage. Only defined
 * where `pricePerKwhAtUsage` is — i.e. at 500 / 1000 / 2000 kWh — until
 * BRIEF.md defines interpolation.
 */
export function estimatedMonthlyBill(
  plan: Plan,
  usageKwh: number,
): number | null {
  const rate = pricePerKwhAtUsage(plan, usageKwh);
  return rate === null ? null : rate * usageKwh;
}
