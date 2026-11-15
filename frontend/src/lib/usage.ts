import type { Plan } from "../types/plan.js";
import { costAt } from "./contractCost.js";

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
 * Price per kWh (in dollars) at a given monthly usage: the bill from `costAt`
 * (contractCost.ts) divided by the usage, so the rate shown always agrees with
 * the bill shown. Null when an anchor price is missing.
 */
export function pricePerKwhAtUsage(
  plan: Plan,
  usageKwh: number,
): number | null {
  if (!Number.isFinite(usageKwh) || usageKwh <= 0) return null;
  const bill = costAt(plan, usageKwh);
  return bill === null ? null : bill / usageKwh;
}

/**
 * @deprecated WRONG between the anchors, kept only so a test can show it. It
 * interpolates the unit price linearly and multiplies by usage, but the bill is
 * linear in usage (F + c*u), not the unit price. Use `costAt` (contractCost.ts):
 * it is exact, and it is what the cards, the picks and the ranking use. Nothing
 * in the app calls this.
 */
export function estimatedMonthlyBill(
  plan: Plan,
  usageKwh: number,
): number | null {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  if (!Number.isFinite(usageKwh)) return null;
  if (at500 === null || at1000 === null || at2000 === null) return null;
  let rate: number;
  if (usageKwh <= 500) rate = at500;
  else if (usageKwh <= 1000)
    rate = at500 + ((at1000 - at500) * (usageKwh - 500)) / 500;
  else if (usageKwh <= 2000)
    rate = at1000 + ((at2000 - at1000) * (usageKwh - 1000)) / 1000;
  else rate = at2000;
  return rate * usageKwh;
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
