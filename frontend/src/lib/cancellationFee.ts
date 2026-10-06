// Reads the cancellation fee out of a plan's free-text `pricingDetails`.
//
// ASSUMPTION (no BRIEF.md yet): the fee is written as a flat dollar amount right
// after the words "cancellation fee", e.g. "Cancellation Fee: $300.00" or
// "Cancellation fee $150.". Anything we are not sure about returns null, so the
// UI says "not available" instead of showing a wrong number:
//   - no match, or two DIFFERENT amounts found
//   - the amount is per month / per unit ("$150 per remaining month")
// Fee_max and other fee wording are NOT handled here.

const FEE_PATTERN =
  /cancel(?:l?ation)?\s+fee\s*[:\-]?\s*\$\s*(\d[\d,]*(?:\.\d{1,2})?)\.?(\s*(?:\/|per\b|each\b|monthly\b))?/gi;

export interface ParsedFee {
  /** flat fee in dollars */
  amount: number;
  /** `text` with the fee sentence(s) removed, for display elsewhere */
  remainder: string;
}

export function parseCancellationFee(text: string | null): ParsedFee | null {
  if (!text) return null;

  const matches = [...text.matchAll(FEE_PATTERN)];
  if (matches.length === 0) return null;
  // A "per month" style fee is not a flat total — refuse to guess.
  if (matches.some((m) => m[2] !== undefined)) return null;

  const amounts = new Set(matches.map((m) => Number(m[1].replace(/,/g, ""))));
  if (amounts.size !== 1) return null;
  const [amount] = amounts;
  if (!Number.isFinite(amount)) return null;

  const remainder = text
    .replace(FEE_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s.,;:—-]+|[\s,;:—-]+$/g, "")
    .trim();
  return { amount, remainder };
}
