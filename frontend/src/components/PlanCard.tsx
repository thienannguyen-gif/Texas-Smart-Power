import type { ReactNode } from "react";
import type { Plan } from "../types/plan";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";
import { formatAmount, formatRateShort } from "../lib/money";
import { priceCurveWarning } from "../lib/ranking";
import { renewablePct } from "../lib/filters";
import { PriceCurveBadge } from "./PriceCurveBadge";
import { ROW_GRID } from "./planRow";

// Display-only. Ranking is computed by the ingestion pipeline; this row
// renders plan details without showing the internal score.

const BADGE =
  "inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider uppercase";
const BADGE_MINT = `${BADGE} bg-brand-soft text-brand`;
const BADGE_OUTLINE = `${BADGE} border border-line text-ink-soft`;

// One value of the row. On wide screens the column header names it (the label
// stays for screen readers); on a phone, where there is no header, it is shown.
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="md:text-right">
      <dt className="label-mono md:sr-only">{label}</dt>
      <dd className="mt-1 md:mt-0">{children}</dd>
    </div>
  );
}

// A plan as one row of the table (a stacked card on a phone). The left edge
// carries a bar for the two plans worth a second look: green for the best match,
// amber for an unstable price curve.
export function PlanCard({
  plan,
  onMoreDetails,
  usageKwh = DEFAULT_USAGE_KWH,
  unranked = false,
  bestMatch = false,
}: {
  plan: Plan;
  onMoreDetails?: () => void;
  usageKwh?: number;
  /** A time-of-use plan in its own section: marked as unranked, and its price is a reference rate. */
  unranked?: boolean;
  /** The top plan under "Best match" sorting. */
  bestMatch?: boolean;
}) {
  const flagged = priceCurveWarning(plan) !== null;
  const accent = bestMatch
    ? "border-l-4 border-l-brand"
    : flagged
      ? "border-l-4 border-l-warn"
      : "";
  const renewable = renewablePct(plan);

  return (
    <article
      className={`rounded-lg border border-line-soft bg-surface ${accent}`}
    >
      <div
        className={`grid gap-4 p-4 md:items-center md:gap-3 md:px-5 md:py-4 ${ROW_GRID}`}
      >
        <div className="flex items-start justify-between gap-3 md:contents">
          <div className="min-w-0">
            <h3 className="text-lg leading-snug font-semibold break-words">
              {plan.planName}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm tracking-wide text-ink-soft uppercase">
                {plan.companyName}
              </span>
              {bestMatch && <span className={BADGE_MINT}>Best match</span>}
              {plan.termMonths === 12 && (
                <span className={BADGE_MINT}>12-month lock</span>
              )}
              {unranked && (
                <span className={BADGE_OUTLINE}>Unranked · time-of-use</span>
              )}
              {plan.newCustomer === false && (
                // Only the rarer case gets a badge: most plans are new-customer
                // only, so marking those would mark nearly every row.
                <span className={BADGE_OUTLINE}>
                  Open to existing customers
                </span>
              )}
              <PriceCurveBadge plan={plan} />
            </div>
          </div>
          {onMoreDetails && (
            <button
              type="button"
              onClick={onMoreDetails}
              aria-label={`More details: ${plan.planName}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line text-lg text-ink hover:bg-surface-alt md:order-last"
            >
              <span aria-hidden="true">›</span>
            </button>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 md:contents">
          <Cell label={unranked ? "Est. bill (ref.)" : "Est. bill"}>
            <span className="text-xl leading-none font-semibold">
              {formatAmount(estimatedMonthlyBill(plan, usageKwh))}
            </span>
          </Cell>
          <Cell label={unranked ? "Ref. rate / kWh" : "Rate / kWh"}>
            <span className="font-mono text-[15px]">
              {formatRateShort(pricePerKwhAtUsage(plan, usageKwh))}
            </span>
          </Cell>
          <Cell label="Term">
            <span className="font-mono text-[15px]">
              {plan.termMonths !== null ? `${plan.termMonths} mo` : "—"}
            </span>
          </Cell>
          <Cell label="Renewable">
            <span
              title={plan.renewableDescription ?? undefined}
              className={`font-mono text-[15px] ${
                renewable === 100 ? "font-medium text-sage" : "text-ink-soft"
              }`}
            >
              {renewable !== null ? `${renewable}%` : "—"}
            </span>
          </Cell>
        </dl>
      </div>
    </article>
  );
}
