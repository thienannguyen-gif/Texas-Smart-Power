// Raw Power to Choose record -> app's normalized `Plan`. Pure field
// transcription and type coercion — no domain logic. Anything that involves a
// rule (parsing the cancellation fee out of `pricing_details`, deciding TOU,
// scoring) belongs in the BRIEF.md pipeline, not here.

import type { Plan, RawPlan } from "../frontend/src/types/plan.js";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Returns the normalized plan, or `null` when the record lacks the identity
 * fields the app can't do anything without (id, plan name, company name).
 */
export function normalizePlan(raw: RawPlan): Plan | null {
  const id = num(raw.plan_id);
  const planName = str(raw.plan_name);
  const companyName = str(raw.company_name);
  if (id === null || planName === null || companyName === null) {
    return null;
  }

  return {
    id,
    planName,
    companyName,
    termMonths: num(raw.term_value),
    rateType: str(raw.rate_type),
    pricePerKwh: {
      at500: num(raw.price_kwh500),
      at1000: num(raw.price_kwh1000),
      at2000: num(raw.price_kwh2000),
    },
    pricingDetails: str(raw.pricing_details),
    isTimeOfUse: raw.timeofuse === true,
    renewableDescription: str(raw.renewable_energy_description),
    prepaid: raw.prepaid === true,
    companyLogo: str(raw.company_logo),
    website: str(raw.website),
    goToPlanUrl: str(raw.go_to_plan),
    factSheetUrl: str(raw.fact_sheet),
    termsUrl: str(raw.terms_of_service),
    enrollPhone: str(raw.enroll_phone),
  };
}
