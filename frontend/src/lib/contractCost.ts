import type { Plan } from "../types/plan.js";

// What a plan costs in dollars over the length of its own contract.
//
// No score, no weights, no normalisation and no risk term: the bills of the
// months the contract actually covers are added up, so every expensive month is
// already in the total. The old 0-10 scoring (ranking.ts) is untouched and
// still works; this is a second, separate way of ordering the same plans.

// EIA Form EIA-861M, Texas residential, 2020-2025.
// Index 0 = January. Sums to 12, averages exactly 1.00.
export const SEASON = [
  0.9931, 0.8903, 0.7898, 0.7223, 0.8896, 1.176, 1.3954, 1.4299, 1.2153, 0.9297,
  0.7336, 0.8351,
];

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** The current month, zero-indexed (0 = January), from the browser's clock. */
export function currentStartMonth(now: Date = new Date()): number {
  return now.getMonth();
}

export interface ContractCost {
  /** Sum of the monthly bills over the whole contract, in dollars. */
  total: number;
  /** total / termMonths: what the user pays each month while the contract runs. */
  perMonth: number;
  /** The single most expensive monthly bill in the contract. */
  worstMonth: number;
  /** The `termMonths` calendar month names, in order, from the start month. */
  monthsCovered: string[];
}

/**
 * Monthly bill in dollars at `usage` kWh, from the three published anchor
 * prices (500 / 1000 / 2000 kWh), piecewise linear in the total cost: between
 * anchors the bill is interpolated, below 500 and above 2000 the nearest
 * segment's slope continues (a bill never goes below $0).
 *
 * Returns null when an anchor price is missing, so nothing is invented.
 */
export function costAt(plan: Plan, usage: number): number | null {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  if (at500 === null || at1000 === null || at2000 === null) return null;
  if (![at500, at1000, at2000, usage].every(Number.isFinite)) return null;

  // the plan stores dollars per kWh; the formulas below work in cents per kWh
  const c500 = at500 * 100 * 5;
  const c1000 = at1000 * 100 * 10;
  const c2000 = at2000 * 100 * 20;
  const m1 = (c1000 - c500) / 500;
  const m2 = (c2000 - c1000) / 1000;

  if (usage < 500) return Math.max(0, c500 - m1 * (500 - usage));
  if (usage <= 1000) return c500 + m1 * (usage - 500);
  if (usage <= 2000) return c1000 + m2 * (usage - 1000);
  return c2000 + m2 * (usage - 2000);
}

/**
 * The cost of the plan over its own term, starting in `startMonth` (0 =
 * January; defaults to the current month). Month i of the contract is billed at
 * `usage` times that calendar month's seasonal factor.
 *
 * Returns null when the plan has no usable term or an anchor price is missing.
 */
export function contractCost(
  plan: Plan,
  usage: number,
  startMonth: number = currentStartMonth(),
): ContractCost | null {
  const L = plan.termMonths;
  if (L === null || !Number.isInteger(L) || L < 1) return null;

  const bills: number[] = [];
  const monthsCovered: string[] = [];
  for (let i = 0; i < L; i++) {
    const month = (((startMonth + i) % 12) + 12) % 12;
    const bill = costAt(plan, usage * SEASON[month]);
    if (bill === null) return null;
    bills.push(bill);
    monthsCovered.push(MONTH_NAMES[month]);
  }

  const total = bills.reduce((sum, bill) => sum + bill, 0);
  return {
    total,
    perMonth: total / L,
    worstMonth: Math.max(...bills),
    monthsCovered,
  };
}

/**
 * The months a contract covers, for display: "Nov, Dec, Jan" for a contract of
 * a year or less; a longer one names its first and last month and its length
 * instead of listing every month ("Nov to Jan, 15 months").
 */
export function describeMonths(monthsCovered: string[]): string {
  if (monthsCovered.length <= 12) return monthsCovered.join(", ");
  return `${monthsCovered[0]} to ${monthsCovered[monthsCovered.length - 1]}, ${monthsCovered.length} months`;
}

export type TermList = "short" | "long";

/** Under 12 months is the short list; 12 months and up is the long list. */
export function termListOf(plan: Plan): TermList | null {
  const L = plan.termMonths;
  if (L === null || !Number.isInteger(L) || L < 1) return null;
  return L < 12 ? "short" : "long";
}

export interface CostedPlan {
  plan: Plan;
  cost: ContractCost;
}

/**
 * The plans of one list, cheapest first by `perMonth` (not by total, so 12, 24
 * and 36-month plans are comparable and a short plan is judged by what it costs
 * each month). Two plans with the same per-month figure keep the order they
 * arrived in. A plan that cannot be costed is left out. Never mutates `plans`.
 */
export function rankByContractCost(
  plans: Plan[],
  list: TermList,
  usage: number,
  startMonth: number = currentStartMonth(),
): CostedPlan[] {
  const costed: (CostedPlan & { index: number })[] = [];
  plans.forEach((plan, index) => {
    if (termListOf(plan) !== list) return;
    const cost = contractCost(plan, usage, startMonth);
    if (cost !== null) costed.push({ plan, cost, index });
  });
  return costed
    .sort((a, b) => a.cost.perMonth - b.cost.perMonth || a.index - b.index)
    .map(({ plan, cost }) => ({ plan, cost }));
}
