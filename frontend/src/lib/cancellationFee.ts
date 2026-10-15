// Reads the cancellation fee out of a plan's free-text `pricingDetails`.
//
// Supports flat cancellation fees and per-remaining-month fees. Unrecognized,
// conflicting, or incomplete fee text returns null rather than guessing.

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

/** Parse a flat exit fee or convert a fee per remaining month to worst case. */
export function parseExitFee(
  text: string | null,
  termMonths: number | null,
): number | null {
  if (!text) return null;

  const matches = [...text.matchAll(FEE_PATTERN)];
  if (matches.length === 0) return null;

  const monthly = matches.map((match) => {
    if (match[2] === undefined) return false;
    const end = (match.index ?? 0) + match[0].length;
    return /^(?:\s*remaining\s+month\b)/i.test(text.slice(end));
  });

  if (monthly.some(Boolean)) {
    if (
      monthly.some((isMonthly) => !isMonthly) ||
      termMonths === null ||
      !Number.isFinite(termMonths) ||
      termMonths < 1
    ) {
      return null;
    }
    const amounts = new Set(matches.map((m) => Number(m[1].replace(/,/g, ""))));
    if (amounts.size !== 1) return null;
    const [amount] = amounts;
    if (!Number.isFinite(amount)) return null;
    return amount * (termMonths - 1);
  }

  return parseCancellationFee(text)?.amount ?? null;
}
