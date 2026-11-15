import type { Plan } from "../frontend/src/types/plan.js";
import { parseExitFee } from "../frontend/src/lib/cancellationFee.js";
import { renewablePct } from "../frontend/src/lib/filters.js";

// Measurement only. Nothing here filters, changes or reorders a plan: it counts
// what the normalizer produced so the logs of a real run show how many plans
// have a cancellation fee or a renewable % the app cannot read.

/**
 * Words that say a pricingDetails text is talking about a cancellation fee. A
 * text that has none of them probably does not mention one, which for a plan
 * usually means there is no fee (16 TAC §25.475 has the EFL state an early
 * termination fee when there is one). Matched from the start of a word, any case.
 */
export const FEE_KEYWORDS = ["fee", "cancel", "termination", "etf", "early"];

const FEE_KEYWORD_PATTERN = new RegExp(`\\b(?:${FEE_KEYWORDS.join("|")})`, "i");

/** How many raw strings are kept as examples, for each of the two text groups. */
const EXAMPLES = 5;

export interface IngestStats {
  tdu: string;
  /** Records received from the source, before normalizing. */
  received: number;
  /** Records the normalizer kept (it drops one with no id, name or company). */
  normalized: number;
  timeOfUse: number;
  /** Non-time-of-use plans with all of r500, r1000 and r2000. */
  withAnchorPrices: number;
  /** Non-time-of-use plans with a whole-number term of 1 month or more. */
  withTerm: number;
  /** Non-time-of-use plans with both of the above: the ones the app can price. */
  priceable: number;
  /** Of the priceable plans: parseExitFee returned null (the three groups below). */
  feeUnreadable: number;
  /** (a) pricingDetails is missing or empty: there is no data. */
  feeNoText: number;
  /**
   * (b) pricingDetails has text that uses a fee keyword, but the parser read no
   * number from it: the parser is what failed.
   */
  feeUnparsed: number;
  /**
   * (c) pricingDetails has text and none of the fee keywords: the plan most
   * likely has no cancellation fee.
   */
  feeNotMentioned: number;
  /** Of the priceable plans: no % renewable could be read. */
  renewableUnreadable: number;
  /** Of the priceable plans: no fee and no renewable %. */
  bothUnreadable: number;
  /** The first raw pricingDetails strings of group (b). */
  feeUnparsedExamples: string[];
  /** The first raw pricingDetails strings of group (c). */
  feeNotMentionedExamples: string[];
}

export function summarizeIngest(
  tdu: string,
  received: number,
  plans: Plan[],
): IngestStats {
  const stats: IngestStats = {
    tdu,
    received,
    normalized: plans.length,
    timeOfUse: 0,
    withAnchorPrices: 0,
    withTerm: 0,
    priceable: 0,
    feeUnreadable: 0,
    feeNoText: 0,
    feeUnparsed: 0,
    feeNotMentioned: 0,
    renewableUnreadable: 0,
    bothUnreadable: 0,
    feeUnparsedExamples: [],
    feeNotMentionedExamples: [],
  };

  for (const plan of plans) {
    if (plan.isTimeOfUse) {
      stats.timeOfUse += 1;
      continue;
    }
    const { at500, at1000, at2000 } = plan.pricePerKwh;
    const anchors = at500 !== null && at1000 !== null && at2000 !== null;
    const term =
      plan.termMonths !== null &&
      Number.isInteger(plan.termMonths) &&
      plan.termMonths >= 1;
    if (anchors) stats.withAnchorPrices += 1;
    if (term) stats.withTerm += 1;
    if (!anchors || !term) continue;

    stats.priceable += 1;
    const noFee = parseExitFee(plan.pricingDetails, plan.termMonths) === null;
    const noRenewable = renewablePct(plan) === null;
    if (noFee) {
      stats.feeUnreadable += 1;
      const text = plan.pricingDetails;
      if (text === null || text.trim() === "") {
        stats.feeNoText += 1;
      } else if (FEE_KEYWORD_PATTERN.test(text)) {
        stats.feeUnparsed += 1;
        if (stats.feeUnparsedExamples.length < EXAMPLES) {
          stats.feeUnparsedExamples.push(text);
        }
      } else {
        stats.feeNotMentioned += 1;
        if (stats.feeNotMentionedExamples.length < EXAMPLES) {
          stats.feeNotMentionedExamples.push(text);
        }
      }
    }
    if (noRenewable) stats.renewableUnreadable += 1;
    if (noFee && noRenewable) stats.bothUnreadable += 1;
  }
  return stats;
}
