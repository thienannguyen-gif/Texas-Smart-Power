import type { Plan } from "../types/plan";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
import { renewablePct } from "../lib/filters";
import { PriceCurveBadge } from "./PriceCurveBadge";
import { ProviderLogo } from "./ProviderLogo";

// Display-only. Ranking is computed by the ingestion pipeline; this card
// renders plan details without showing the internal score.

export function PlanCard({
  plan,
  onMoreDetails,
  usageKwh = DEFAULT_USAGE_KWH,
  unranked = false,
}: {
  plan: Plan;
  onMoreDetails?: () => void;
  usageKwh?: number;
  /** A time-of-use plan in its own section: marked as unranked, and its price is a reference rate. */
  unranked?: boolean;
}) {
  const renewable = renewablePct(plan);

  return (
    <article className="rounded-2xl border-2 border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-brand">
            {plan.planName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProviderLogo name={plan.companyName} src={plan.companyLogo} />
            {unranked && (
              <span className="inline-flex items-center rounded-full border border-line bg-surface-alt px-2 py-0.5 text-xs font-bold text-ink">
                Unranked · time-of-use
              </span>
            )}
            {plan.newCustomer === false && (
              // Only the rarer case gets a badge: most plans are new-customer
              // only, so marking those would mark nearly every card.
              <span className="inline-flex items-center rounded-full border border-brand bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
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
            className="min-h-11 shrink-0 rounded-full bg-brand-soft px-3 py-2 text-xs font-bold text-ink hover:bg-surface-alt sm:px-4 sm:text-sm"
          >
            MORE DETAILS
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-center sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl bg-surface-alt px-2 py-3 sm:bg-transparent sm:px-0 sm:py-0">
          <dt className="text-sm font-semibold text-ink-soft">
            Est. monthly bill
          </dt>
          <p className="text-xs text-ink-faint">
            {unranked ? "at reference rate" : "per month"}
          </p>
          <dd className="mt-1 text-2xl font-extrabold">
            {formatAmount(estimatedMonthlyBill(plan, usageKwh))}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-alt px-2 py-3 sm:bg-transparent sm:px-0 sm:py-0">
          <dt className="text-sm font-semibold text-ink-soft">
            {unranked ? "Reference rate" : "Price per kWh"}
          </dt>
          <p className="text-xs text-ink-faint">at {formatKwh(usageKwh)} kWh</p>
          <dd className="mt-1 text-2xl font-extrabold">
            {formatRate(pricePerKwhAtUsage(plan, usageKwh))}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-ink-soft">Term length</dt>
          <dd className="mt-1 text-2xl font-extrabold">
            {plan.termMonths !== null ? `${plan.termMonths} mos` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-ink-soft">% Renewable</dt>
          <dd
            title={plan.renewableDescription ?? undefined}
            className={`mt-1 text-base font-extrabold sm:text-lg ${
              renewable === 100 ? "text-sage" : "text-ink-faint"
            }`}
          >
            {renewable !== null ? `${renewable}%` : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
