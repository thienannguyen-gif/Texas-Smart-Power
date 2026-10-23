import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  countTimeOfUse,
  EMPTY_FILTERS,
  filterPlans,
  isFiltering,
  plansInScope,
  renewablePct,
  selectProvider,
  splitForView,
  summarizePlans,
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
        withFilters({ providers: ["Gexa"], contractBuckets: ["m12plus"] }),
      ).map((p) => p.id),
    ).toEqual([3]);
  });

  it("shows plans from ANY selected provider (OR)", () => {
    expect(
      filterPlans(plans, withFilters({ providers: ["APGE", "Rhythm"] })).map(
        (p) => p.id,
      ),
    ).toEqual([2, 4]);
  });

  it("drops plans below the renewable slider, and those with no % info", () => {
    expect(
      filterPlans(plans, withFilters({ minRenewablePct: 50 })).map((p) => p.id),
    ).toEqual([4]);
  });
});

describe("selectProvider", () => {
  it("adds a provider once, however many times it is selected", () => {
    let f = selectProvider(EMPTY_FILTERS, "Gexa");
    f = selectProvider(f, "Gexa");
    expect(f.providers).toEqual(["Gexa"]);
  });
});

describe("isFiltering", () => {
  it("is false only for the empty filter set", () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(isFiltering(withFilters({ providers: ["Gexa"] }))).toBe(true);
    expect(isFiltering(withFilters({ minRenewablePct: 10 }))).toBe(true);
  });
});

describe("summarizePlans", () => {
  const mk = (term: number | null, renewable: string | null) =>
    make({ termMonths: term, renewableDescription: renewable });

  it("counts 100% renewable and 7–12 month plans among those given", () => {
    const plans = [
      mk(12, "100% Renewable"), // both
      mk(7, "22% Renewable"), // 7–12 only
      mk(24, "100% Renewable"), // renewable only
      mk(3, null), // neither
      mk(13, "100% Renewable"), // 13 is "12+", not 7–12
    ];
    expect(summarizePlans(plans)).toEqual({ renewable100: 3, months7to12: 2 });
  });

  it("is all zeros for no plans", () => {
    expect(summarizePlans([])).toEqual({ renewable100: 0, months7to12: 0 });
  });
});

describe("time-of-use lists", () => {
  const ranked = [
    make({ id: 1, companyName: "Alpha", termMonths: 12 }),
    make({ id: 2, companyName: "Beta", termMonths: 24 }),
  ];
  const tou = [
    make({ id: 10, companyName: "Alpha", termMonths: 12, isTimeOfUse: true }),
    make({ id: 11, companyName: "Beta", termMonths: 3, isTimeOfUse: true }),
  ];
  const ids = (list: Plan[]) => list.map((p) => p.id);

  it("splitForView applies the ordinary filters to both lists", () => {
    const view = splitForView(ranked, tou, {
      ...EMPTY_FILTERS,
      providers: ["Alpha"],
    });
    expect(ids(view.ranked)).toEqual([1]);
    expect(ids(view.timeOfUse)).toEqual([10]);
  });

  it("splitForView empties the ranked list, and only it, for 'only time-of-use'", () => {
    const view = splitForView(ranked, tou, {
      ...EMPTY_FILTERS,
      onlyTimeOfUse: true,
    });
    expect(view.ranked).toEqual([]);
    expect(ids(view.timeOfUse)).toEqual([10, 11]);
  });

  it("filterPlans itself ignores the time-of-use switch", () => {
    expect(
      filterPlans(ranked, { ...EMPTY_FILTERS, onlyTimeOfUse: true }),
    ).toHaveLength(2);
  });

  it("the option counts are taken over what the lists could show", () => {
    expect(ids(plansInScope(ranked, tou, EMPTY_FILTERS))).toEqual([
      1, 2, 10, 11,
    ]);
    expect(
      ids(plansInScope(ranked, tou, { ...EMPTY_FILTERS, onlyTimeOfUse: true })),
    ).toEqual([10, 11]);
  });

  it("countTimeOfUse counts time-of-use plans passing the other filters", () => {
    expect(countTimeOfUse(tou, EMPTY_FILTERS)).toBe(2);
    expect(
      countTimeOfUse(tou, { ...EMPTY_FILTERS, contractBuckets: ["m1_6"] }),
    ).toBe(1);
    // the switch itself does not change the count
    expect(countTimeOfUse(tou, { ...EMPTY_FILTERS, onlyTimeOfUse: true })).toBe(
      2,
    );
  });

  it("'only time-of-use' counts as an active filter", () => {
    const on = { ...EMPTY_FILTERS, onlyTimeOfUse: true };
    expect(activeFilterCount(on)).toBe(1);
    expect(isFiltering(on)).toBe(true);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });
});
