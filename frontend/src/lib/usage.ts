import type { Plan } from "../types/plan.js";

// The usage level the app prices plans at until the user enters their own: the
// "Small home" preset below.
export const DEFAULT_USAGE_KWH = 1150;

/** The three home types offered next to the usage box. */
export const USAGE_PRESETS = [
  { id: "apartment", label: "Apartment", kwh: 850 },
  { id: "small_home", label: "Small home", kwh: 1150 },
  { id: "large_home", label: "Large home", kwh: 1450 },
] as const;

export const USAGE_MIN = 100;
export const USAGE_MAX = 5000;
export const MIN_USAGE_KWH = USAGE_MIN;
export const MAX_USAGE_KWH = USAGE_MAX;

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

/** The preset whose kWh is exactly `kwh`, or null when it is the user's own number. */
export function presetForUsage(kwh: number | null) {
  return USAGE_PRESETS.find((preset) => preset.kwh === kwh) ?? null;
}

/**
 * Reads what was typed in the usage box: digits with optional thousands commas
 * ("1,680" or "1680"), whole numbers only. Anything else is null.
 */
export function parseUsageText(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}(,\d{3})+$|^\d+$/.test(trimmed)) return null;
  return Number(trimmed.replace(/,/g, ""));
}

/** 1680 -> "1,680" (always a comma, whatever the machine's locale). */
export function formatUsageText(kwh: number): string {
  return String(Math.round(kwh)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** The `usage` query parameter, clamped; the default when it is absent or not a number. */
export function usageFromSearch(search: string): number {
  const raw = new URLSearchParams(search).get("usage");
  const kwh = raw === null ? null : parseUsageText(raw);
  return kwh === null ? DEFAULT_USAGE_KWH : clampUsage(kwh);
}

/**
 * `search` with the `usage` parameter set (and dropped when it is the default),
 * every other parameter left as it was. Returns "" or a string starting with "?".
 */
export function searchWithUsage(search: string, kwh: number): string {
  const params = new URLSearchParams(search);
  if (kwh === DEFAULT_USAGE_KWH) params.delete("usage");
  else params.set("usage", String(kwh));
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
}
