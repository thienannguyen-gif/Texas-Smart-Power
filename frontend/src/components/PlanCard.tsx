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
import { ProviderLogo } from "./ProviderLogo";
import { ROW_GRID } from "./planRow";

// Display-only. Ranking is computed by the ingestion pipeline; this row
// renders plan details without showing the internal score.

const CHIP =
  "inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] leading-4 font-medium tracking-[0.1em] uppercase";
const CHIP_BRAND = `${CHIP} bg-brand-soft text-brand-deep`;
const CHIP_OUTLINE = `${CHIP} border border-line text-ink-soft`;

// One figure of the row. On a wide screen the column header names it; on a phone
// there is no header, so the label is printed above the figure from the
// data-label attribute (see .row-cell in index.css). The label is also in the
// markup for screen readers, because the visual header is hidden from them.
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div data-label={label} className="row-cell row:text-right">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// A plan as one row of the list. A 3px stripe on the left edge marks the two
// plans worth a second look: brand green for the best match, copper for an
// unstable price curve; every other row gets a quiet hairline.
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
  const stripe = bestMatch
    ? "border-l-brand"
    : flagged
      ? "border-l-warn"
      : "border-l-line-soft";
  const renewable = renewablePct(plan);

  return (
    <article
      className={`border-l-[3px] bg-surface hover:bg-surface-alt ${stripe}`}
    >
      <div className={`grid gap-3.5 px-4 py-4 row:items-center ${ROW_GRID}`}>
        <div className="min-w-0">
          <h3 className="font-display text-base leading-snug font-semibold break-words text-ink">
            {plan.planName}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-2">
              <ProviderLogo name={plan.companyName} src={plan.companyLogo} />
              <span className="font-mono text-[11px] tracking-[0.12em] text-ink-soft uppercase">
                {plan.companyName}
              </span>
            </span>
            {bestMatch && <span className={CHIP_BRAND}>Best match</span>}
            {plan.termMonths === 12 && (
              <span className={CHIP_BRAND}>12-month lock</span>
            )}
            {unranked && (
              <span className={CHIP_OUTLINE}>Unranked · time-of-use</span>
            )}
            {plan.newCustomer === true && (
              <span className={CHIP_OUTLINE}>New customers only</span>
            )}
            {plan.newCustomer === false && (
              <span className={CHIP_OUTLINE}>Open to existing customers</span>
            )}
            <PriceCurveBadge plan={plan} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 row:contents">
          <Cell label={unranked ? "Est. bill (ref.)" : "Est. bill"}>
            <span className="font-mono text-[21px] leading-none font-semibold text-ink">
              {formatAmount(estimatedMonthlyBill(plan, usageKwh))}
            </span>
          </Cell>
          <Cell label={unranked ? "Ref. rate / kWh" : "Rate / kWh"}>
            <span className="font-mono text-sm text-ink-soft">
              {formatRateShort(pricePerKwhAtUsage(plan, usageKwh))}
            </span>
          </Cell>
          <Cell label="Term">
            <span className="font-mono text-sm text-ink-soft">
              {plan.termMonths !== null ? `${plan.termMonths} mo` : "—"}
            </span>
          </Cell>
          <Cell label="Renewable">
            <span
              title={plan.renewableDescription ?? undefined}
              className={`font-mono text-sm ${
                renewable === 100 ? "font-medium text-sage" : "text-ink-faint"
              }`}
            >
              {renewable !== null ? `${renewable}%` : "—"}
            </span>
          </Cell>
        </div>

        {onMoreDetails && (
          <button
            type="button"
            onClick={onMoreDetails}
            aria-label={`More details: ${plan.planName}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line text-sm font-medium text-ink hover:bg-surface-alt row:w-10 row:text-lg"
          >
            <span className="row:hidden">Plan details</span>
            <span aria-hidden="true" className="hidden row:inline">
              ›
            </span>
          </button>
        )}
      </div>
    </article>
  );
}
