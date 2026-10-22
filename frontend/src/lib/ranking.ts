import type { Plan } from "../types/plan.js";
import { parseExitFee } from "./cancellationFee.js";
import { renewablePct } from "./filters.js";

const EPSILON = 1e-9;

const WEIGHTS = {
  price: 5 / 12,
  slope: 3 / 12,
  flexibility: 3 / 12,
  green: 1 / 12,
} as const;

export interface PlanScoreBreakdown {
  price: number;
  slope: number;
  term: number;
  fee: number;
  flexibility: number;
  green: number;
  total: number;
}

interface EligiblePlan {
  plan: Plan;
  price: number;
  slope: number;
  exitFee: number;
  termScore: number;
  greenScore: number;
}

export function calculatePriceScore(
  price: number,
  pMin: number,
  pMax: number,
): number {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(pMin) ||
    !Number.isFinite(pMax)
  ) {
    return 0;
  }

  if (Math.abs(pMax - pMin) < EPSILON) return 10.0;

  const score = 10 * ((pMax - price) / (pMax - pMin));
  return Math.max(0, Math.min(10, score));
}

function termScore(termMonths: number | null): number | null {
  if (termMonths === null || !Number.isFinite(termMonths)) return null;
  if (termMonths === 12) return 10;
  if (termMonths > 12 && termMonths <= 15) return 9;
  if (termMonths < 12) return 8;
  if (termMonths >= 16 && termMonths <= 17) return 8;
  if (termMonths >= 18 && termMonths <= 24) return 7;
  if (termMonths >= 25 && termMonths <= 35) return 6;
  if (termMonths === 36) return 5;
  if (termMonths > 36) return 3;
  return null;
}

export type PriceCurveWarning = "v-trap" | "hump";

/**
 * The price-curve check from BRIEF.md (Component 2): a "V-Trap" is
 * P1000 < P2000, a "Hump" is P1000 > P500. Either one makes S_slope zero.
 * Returns null for a stable curve, and also when an anchor price is missing
 * (nothing can be said about it). The score and the warning badge both use
 * this, so there is one definition of "unstable".
 */
export function priceCurveWarning(plan: Plan): PriceCurveWarning | null {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  if (at500 === null || at1000 === null || at2000 === null) return null;
  if (
    !Number.isFinite(at500) ||
    !Number.isFinite(at1000) ||
    !Number.isFinite(at2000)
  ) {
    return null;
  }
  if (at1000 < at2000) return "v-trap";
  if (at1000 > at500) return "hump";
  return null;
}

function slopeScore(plan: Plan): number | null {
  const { at500, at1000, at2000 } = plan.pricePerKwh;
  if (at500 === null || at1000 === null || at2000 === null) return null;
  if (
    !Number.isFinite(at500) ||
    !Number.isFinite(at1000) ||
    !Number.isFinite(at2000)
  ) {
    return null;
  }
  return priceCurveWarning(plan) === null ? 10 : 0;
}

function eligiblePlans(plans: Plan[]): EligiblePlan[] {
  const eligible: EligiblePlan[] = [];

  for (const plan of plans) {
    const price = plan.pricePerKwh.at500;
    const slope = slopeScore(plan);
    if (price === null || !Number.isFinite(price) || slope === null) {
      continue;
    }

    const fee = parseExitFee(plan.pricingDetails, plan.termMonths);
    const term = termScore(plan.termMonths);
    const renewable = renewablePct(plan);
    if (
      fee === null ||
      !Number.isFinite(fee) ||
      fee < 0 ||
      term === null ||
      renewable === null ||
      !Number.isFinite(renewable) ||
      renewable < 0 ||
      renewable > 100
    ) {
      continue;
    }

    eligible.push({
      plan,
      price,
      slope,
      exitFee: fee,
      termScore: term,
      greenScore: renewable / 10,
    });
  }

  return eligible;
}

export function scorePlans(
  plans: Plan[],
): Array<{ plan: Plan; breakdown: PlanScoreBreakdown }> {
  const eligible = eligiblePlans(plans);
  if (eligible.length === 0) return [];

  const prices = eligible.map(({ price }) => price);
  const pMin = Math.min(...prices);
  const pMax = Math.max(...prices);
  const fees = eligible.map(({ exitFee }) => exitFee);
  const maxFee = Math.max(...fees);
  const minFee = Math.min(...fees);

  return eligible
    .map(
      ({
        plan,
        price: currentPrice,
        slope,
        exitFee,
        termScore: term,
        greenScore,
      }) => {
        const fee =
          maxFee === minFee
            ? 10.0
            : Math.max(0, Math.min(10, 10 * (1 - exitFee / maxFee)));
        const price = calculatePriceScore(currentPrice, pMin, pMax);
        const flexibility = 0.5 * term + 0.5 * fee;
        const weightedTotal =
          WEIGHTS.price * price +
          WEIGHTS.slope * slope +
          WEIGHTS.flexibility * flexibility +
          WEIGHTS.green * greenScore;
        const total = Math.max(0, Math.min(10, weightedTotal));

        return {
          plan,
          breakdown: {
            price,
            slope,
            term,
            fee,
            flexibility,
            green: greenScore,
            total,
          },
        };
      },
    )
    .sort((a, b) => b.breakdown.total - a.breakdown.total);
}

export function rankPlans(plans: Plan[]): Plan[] {
  return scorePlans(plans).map(({ plan }) => plan);
}
