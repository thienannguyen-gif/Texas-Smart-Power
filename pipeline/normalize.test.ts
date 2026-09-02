import { describe, expect, it } from "vitest";
import { normalizePlan } from "./normalize.js";
import type { RawPlan } from "../frontend/src/types/plan.js";

const validRaw: RawPlan = {
  plan_id: 12345,
  plan_name: "Steady 12",
  company_name: "Example Energy",
  term_value: 12,
  rate_type: "Fixed",
  price_kwh500: 0.151,
  price_kwh1000: 0.139,
  price_kwh2000: 0.145,
  pricing_details: "Cancellation fee $150",
  timeofuse: false,
  renewable_energy_description: "6% renewable",
  prepaid: false,
  company_logo: "https://example.com/logo.png",
  fact_sheet: "https://example.com/efl.pdf",
};

describe("normalizePlan", () => {
  it("maps a complete record field-for-field", () => {
    const plan = normalizePlan(validRaw);
    expect(plan).toEqual({
      id: 12345,
      planName: "Steady 12",
      companyName: "Example Energy",
      termMonths: 12,
      rateType: "Fixed",
      pricePerKwh: { at500: 0.151, at1000: 0.139, at2000: 0.145 },
      pricingDetails: "Cancellation fee $150",
      isTimeOfUse: false,
      renewableDescription: "6% renewable",
      prepaid: false,
      companyLogo: "https://example.com/logo.png",
      website: null,
      goToPlanUrl: null,
      factSheetUrl: "https://example.com/efl.pdf",
      termsUrl: null,
      enrollPhone: null,
    });
  });

  it("represents absent optional fields as null / false", () => {
    const plan = normalizePlan({
      plan_id: 1,
      plan_name: "Bare",
      company_name: "Co",
    });
    expect(plan?.termMonths).toBeNull();
    expect(plan?.pricePerKwh).toEqual({
      at500: null,
      at1000: null,
      at2000: null,
    });
    expect(plan?.isTimeOfUse).toBe(false);
    expect(plan?.prepaid).toBe(false);
  });

  it("drops records missing an identity field", () => {
    expect(
      normalizePlan({ plan_name: "No id", company_name: "Co" }),
    ).toBeNull();
    expect(normalizePlan({ plan_id: 2, company_name: "Co" })).toBeNull();
    expect(
      normalizePlan({ plan_id: 3, plan_name: "  ", company_name: "Co" }),
    ).toBeNull();
  });

  it("rejects non-finite numeric prices", () => {
    const plan = normalizePlan({
      plan_id: 4,
      plan_name: "NaN price",
      company_name: "Co",
      price_kwh1000: Number.NaN,
    });
    expect(plan?.pricePerKwh.at1000).toBeNull();
  });

  it("produces a JSON-round-trippable object", () => {
    const plan = normalizePlan(validRaw);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });
});
