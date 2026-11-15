import { describe, expect, it } from "vitest";
import type { Plan } from "../frontend/src/types/plan.js";
import { FEE_KEYWORDS, summarizeIngest } from "./ingest-stats.js";

const plan = (over: Partial<Plan> & { id: number }): Plan =>
  ({
    planName: "P",
    companyName: "C",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
    pricingDetails: "Cancellation fee $100.",
    isTimeOfUse: false,
    renewableDescription: "10% renewable",
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

describe("summarizeIngest", () => {
  const plans = [
    plan({ id: 1 }), // fee read: $100
    plan({ id: 2, pricingDetails: "Early termination fee applies." }), // (b)
    plan({ id: 3, renewableDescription: null }), // fee read, no renewable
    plan({ id: 4, pricingDetails: null, renewableDescription: null }), // (a) + no renewable
    plan({ id: 5, isTimeOfUse: true }),
    plan({ id: 6, pricePerKwh: { at500: 0.1, at1000: null, at2000: 0.1 } }),
    plan({ id: 7, termMonths: null }),
    plan({ id: 8, pricingDetails: "Free nights 9pm-6am." }), // (c)
    plan({ id: 9, pricingDetails: "   " }), // (a)
  ];

  it("counts each group, over the plans the app can price", () => {
    const s = summarizeIngest("oncor", 11, plans);
    expect(s).toMatchObject({
      tdu: "oncor",
      received: 11,
      normalized: 9,
      timeOfUse: 1,
      withAnchorPrices: 7, // all but 5 (time-of-use, skipped) and 6
      withTerm: 7, // all but 5 and 7
      priceable: 6, // 1, 2, 3, 4, 8, 9
      feeUnreadable: 4, // 2, 4, 8, 9
      renewableUnreadable: 2, // 3 and 4
      bothUnreadable: 1, // 4
    });
  });

  it("splits the unreadable fees: (a) no text, (b) a fee keyword but no number, (c) no keyword", () => {
    const s = summarizeIngest("oncor", 9, plans);
    expect(s.feeNoText).toBe(2); // 4 (null) and 9 (blank)
    expect(s.feeUnparsed).toBe(1); // 2
    expect(s.feeNotMentioned).toBe(1); // 8
    expect(s.feeNoText + s.feeUnparsed + s.feeNotMentioned).toBe(
      s.feeUnreadable,
    );
    expect(s.feeUnparsedExamples).toEqual(["Early termination fee applies."]);
    expect(s.feeNotMentionedExamples).toEqual(["Free nights 9pm-6am."]);
  });

  it("recognises each keyword from the start of a word, in any case, and not inside another word", () => {
    const texts = [
      "Cancellation applies",
      "ETF of 20 per month",
      "Early exit",
      "Termination charge",
      "A FEE is due",
    ];
    for (const text of texts) {
      const s = summarizeIngest("x", 1, [
        plan({ id: 1, pricingDetails: text }),
      ]);
      expect([text, s.feeUnparsed]).toEqual([text, 1]);
    }
    // "etf" inside "Netflix" is not a fee keyword
    const s = summarizeIngest("x", 1, [
      plan({ id: 1, pricingDetails: "Free Netflix for a year." }),
    ]);
    expect(s.feeNotMentioned).toBe(1);
    expect(s.feeUnparsed).toBe(0);
    expect(FEE_KEYWORDS).toEqual([
      "fee",
      "cancel",
      "termination",
      "etf",
      "early",
    ]);
  });

  it("keeps at most the first five raw strings of each text group, never mixed", () => {
    const many = [
      ...Array.from({ length: 8 }, (_, i) =>
        plan({ id: i + 1, pricingDetails: `fee text ${i + 1}` }),
      ),
      ...Array.from({ length: 7 }, (_, i) =>
        plan({ id: i + 20, pricingDetails: `plain ${i + 1}` }),
      ),
    ];
    const s = summarizeIngest("x", 15, many);
    expect(s.feeUnparsedExamples).toEqual(
      [1, 2, 3, 4, 5].map((n) => `fee text ${n}`),
    );
    expect(s.feeNotMentionedExamples).toEqual(
      [1, 2, 3, 4, 5].map((n) => `plain ${n}`),
    );
    expect(s.feeUnparsed).toBe(8);
    expect(s.feeNotMentioned).toBe(7);
  });

  it("does not change or reorder the plans it is given", () => {
    const copy = JSON.stringify(plans);
    summarizeIngest("oncor", 9, plans);
    expect(JSON.stringify(plans)).toBe(copy);
  });
});
