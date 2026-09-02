import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filterPlans,
  isFiltering,
  renewablePct,
  type PlanFilters,
} from "./filters";
import type { Plan } from "../types/plan";

const make = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "P",
    companyName: "Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: null, at1000: null, at2000: null },
    pricingDetails: null,
    isTimeOfUse: false,
    renewableDescription: null,
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

const withFilters = (over: Partial<PlanFilters>): PlanFilters => ({
  ...EMPTY_FILTERS,
  ...over,
});

describe("renewablePct", () => {
  it("reads a leading percentage, or null", () => {
    expect(renewablePct(make({ renewableDescription: "6% renewable" }))).toBe(
      6,
    );
    expect(renewablePct(make({ renewableDescription: "100%" }))).toBe(100);
    expect(
      renewablePct(make({ renewableDescription: "green power" })),
    ).toBeNull();
    expect(renewablePct(make({ renewableDescription: null }))).toBeNull();
  });
});

describe("filterPlans", () => {
  const plans = [
    make({ id: 1, companyName: "Gexa", rateType: "Fixed", termMonths: 12 }),
    make({ id: 2, companyName: "APGE", rateType: "Variable", termMonths: 1 }),
    make({ id: 3, companyName: "Gexa", prepaid: true, termMonths: 24 }),
    make({
      id: 4,
      companyName: "Rhythm",
      renewableDescription: "100%",
      termMonths: 9,
    }),
  ];

  it("returns everything when no filter is set", () => {
    expect(filterPlans(plans, EMPTY_FILTERS)).toHaveLength(4);
  });

  it("filters by product type (OR within the group)", () => {
    const ids = filterPlans(
      plans,
      withFilters({ productTypes: ["prepaid", "variable"] }),
    ).map((p) => p.id);
    expect(ids).toEqual([2, 3]);
  });

  it("filters by contract bucket", () => {
    expect(
      filterPlans(plans, withFilters({ contractBuckets: ["m12plus"] })).map(
        (p) => p.id,
      ),
    ).toEqual([3]);
    expect(
      filterPlans(plans, withFilters({ contractBuckets: ["mtm"] })).map(
        (p) => p.id,
      ),
    ).toEqual([2]);
  });

  it("filters by provider (exact company name)", () => {
    expect(
      filterPlans(plans, withFilters({ providers: ["Gexa"] })).map((p) => p.id),
    ).toEqual([1, 3]);
  });

  it("AND's across groups", () => {
    expect(
      filterPlans(
        plans,
        withFilters({ providers: ["Gexa"], productTypes: ["prepaid"] }),
      ).map((p) => p.id),
    ).toEqual([3]);
  });

  it("drops plans below the renewable slider, and those with no % info", () => {
    expect(
      filterPlans(plans, withFilters({ minRenewablePct: 50 })).map((p) => p.id),
    ).toEqual([4]);
  });
});

describe("isFiltering", () => {
  it("is false only for the empty filter set", () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(isFiltering(withFilters({ providers: ["Gexa"] }))).toBe(true);
    expect(isFiltering(withFilters({ minRenewablePct: 10 }))).toBe(true);
  });
});
