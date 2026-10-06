// The one place money is turned into display text. Components must call these
// instead of formatting inline.
//
//   - Per-kWh rates: cents, one decimal  -> "11.4¢/kWh"
//   - Totals (bill, yearly cost, fees): whole dollars with a comma
//     -> "$114", "$1,668". Never cents.
//
// Both take DOLLARS (the unit `Plan` stores; pipeline/normalize.ts converts the
// upstream's cents once) and return "—" for null/NaN. Locale is always an
// explicit 'en-US' so the thousands separator is a comma.

const EM_DASH = "—";
const LOCALE = "en-US";

const wholeDollars = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Dollars per kWh -> "11.4¢/kWh". */
export function formatRate(dollarsPerKwh: number | null): string {
  if (dollarsPerKwh === null || Number.isNaN(dollarsPerKwh)) return EM_DASH;
  return `${(dollarsPerKwh * 100).toFixed(1)}¢/kWh`;
}

/** Dollar total -> "$1,668" (rounded to whole dollars). */
export function formatAmount(dollars: number | null): string {
  if (dollars === null || Number.isNaN(dollars)) return EM_DASH;
  return wholeDollars.format(dollars);
}

/** A kWh quantity -> "1,000". */
export function formatKwh(kwh: number): string {
  return kwh.toLocaleString(LOCALE);
}
