import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  countRenewable100,
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
    const only = (bucket: PlanFilters["contractBuckets"][number]) =>
      filterPlans(plans, withFilters({ contractBuckets: [bucket] })).map(
        (p) => p.id,
      );
    expect(only("m1_6")).toEqual([2]); // 1 month
    expect(only("m7_11")).toEqual([4]); // 9 months
    expect(only("m12")).toEqual([1]); // exactly 12
    expect(only("m13plus")).toEqual([3]); // 24 months
  });

  it("the four buckets never overlap and, between them, cover every plan that has a term", () => {
    const terms = [1, 2, 6, 7, 11, 12, 13, 24, 36, 60];
    const all = terms.map((term, i) => make({ id: i, termMonths: term }));
    const buckets = ["m1_6", "m7_11", "m12", "m13plus"] as const;
    const found = new Map<number, number>();
    for (const bucket of buckets) {
      for (const p of filterPlans(
        all,
        withFilters({ contractBuckets: [bucket] }),
      )) {
        found.set(p.id, (found.get(p.id) ?? 0) + 1);
      }
    }
    // every plan is in exactly one bucket
    expect([...found.values()].every((n) => n === 1)).toBe(true);
    expect(found.size).toBe(terms.length);

    // the edges land where they are labelled
    const bucketOf = (term: number) =>
      buckets.find(
        (b) =>
          filterPlans(
            [make({ termMonths: term })],
            withFilters({ contractBuckets: [b] }),
          ).length === 1,
      );
    expect(bucketOf(6)).toBe("m1_6");
    expect(bucketOf(7)).toBe("m7_11");
    expect(bucketOf(11)).toBe("m7_11");
    expect(bucketOf(12)).toBe("m12"); // the one the old "12+" label lost
    expect(bucketOf(13)).toBe("m13plus");
  });

  it("a plan with no term is in no bucket", () => {
    const none = [make({ termMonths: null })];
    for (const bucket of ["m1_6", "m7_11", "m12", "m13plus"] as const) {
      expect(
        filterPlans(none, withFilters({ contractBuckets: [bucket] })),
      ).toEqual([]);
    }
    expect(filterPlans(none, EMPTY_FILTERS)).toHaveLength(1);
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
        withFilters({ providers: ["Gexa"], contractBuckets: ["m13plus"] }),
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

  it("'100% renewable only' keeps exactly the plans at 100%, dropping lower ones and those with no % info", () => {
    expect(
      filterPlans(plans, withFilters({ renewable100Only: true })).map(
        (p) => p.id,
      ),
    ).toEqual([4]);

    const mixed = [
      make({ id: 1, renewableDescription: "100% Renewable" }),
      make({ id: 2, renewableDescription: "99% Renewable" }),
      make({ id: 3, renewableDescription: "37% Renewable" }),
      make({ id: 4, renewableDescription: null }),
    ];
    expect(
      filterPlans(mixed, withFilters({ renewable100Only: true })).map(
        (p) => p.id,
      ),
    ).toEqual([1]);
    // off: nothing is dropped
    expect(filterPlans(mixed, EMPTY_FILTERS)).toHaveLength(4);
  });

  it("countRenewable100 counts 100% plans that pass the other filters", () => {
    const set = [
      make({ id: 1, companyName: "A", renewableDescription: "100% Renewable" }),
      make({ id: 2, companyName: "B", renewableDescription: "100% Renewable" }),
      make({ id: 3, companyName: "B", renewableDescription: "22% Renewable" }),
    ];
    expect(countRenewable100(set, EMPTY_FILTERS)).toBe(2);
    expect(countRenewable100(set, withFilters({ providers: ["B"] }))).toBe(1);
    // the switch itself does not change the count
    expect(
      countRenewable100(set, withFilters({ renewable100Only: true })),
    ).toBe(2);
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
    expect(isFiltering(withFilters({ renewable100Only: true }))).toBe(true);
    expect(activeFilterCount(withFilters({ renewable100Only: true }))).toBe(1);
  });
});

describe("summarizePlans", () => {
  const mk = (term: number | null, renewable: string | null) =>
    make({ termMonths: term, renewableDescription: renewable });

  it("counts 100% renewable and exactly-12-month plans among those given", () => {
    const plans = [
      mk(12, "100% Renewable"), // both
      mk(12, "22% Renewable"), // 12 months only
      mk(24, "100% Renewable"), // renewable only
      mk(3, null), // neither
      mk(13, "100% Renewable"), // 13 is not 12
      mk(11, "100% Renewable"), // nor is 11
    ];
    expect(summarizePlans(plans)).toEqual({ renewable100: 4, months12: 2 });
  });

  it("is all zeros for no plans", () => {
    expect(summarizePlans([])).toEqual({ renewable100: 0, months12: 0 });
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
