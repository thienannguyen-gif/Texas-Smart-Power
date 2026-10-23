import type { Plan } from "../types/plan";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
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
  return (
    <article className="rounded-2xl border-2 border-brand-navy bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-brand-green-700">
            {plan.planName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProviderLogo name={plan.companyName} src={plan.companyLogo} />
            {unranked && (
              <span className="inline-flex items-center rounded-full border border-brand-navy/30 bg-brand-lime-100 px-2 py-0.5 text-xs font-bold text-brand-navy">
                Unranked · time-of-use
              </span>
            )}
            {plan.newCustomer === false && (
              // Only the rarer case gets a badge: most plans are new-customer
              // only, so marking those would mark nearly every card.
              <span className="inline-flex items-center rounded-full border border-brand-green bg-brand-green/15 px-2 py-0.5 text-xs font-bold text-brand-green-800">
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
            className="min-h-11 shrink-0 rounded-full bg-brand-lime-200 px-3 py-2 text-xs font-bold text-brand-navy hover:bg-brand-lime-100 sm:px-4 sm:text-sm"
          >
            MORE DETAILS
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-center sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl bg-brand-lime-100 px-2 py-3 sm:bg-transparent sm:px-0 sm:py-0">
          <dt className="text-sm font-semibold text-brand-navy/80">
            Est. monthly bill
          </dt>
          <p className="text-xs text-brand-navy/50">
            {unranked ? "at reference rate" : "per month"}
          </p>
          <dd className="mt-1 text-2xl font-extrabold">
            {formatAmount(estimatedMonthlyBill(plan, usageKwh))}
          </dd>
        </div>
        <div className="rounded-xl bg-brand-lime-100 px-2 py-3 sm:bg-transparent sm:px-0 sm:py-0">
          <dt className="text-sm font-semibold text-brand-navy/80">
            {unranked ? "Reference rate" : "Price per kWh"}
          </dt>
          <p className="text-xs text-brand-navy/50">
            at {formatKwh(usageKwh)} kWh
          </p>
          <dd className="mt-1 text-2xl font-extrabold">
            {formatRate(pricePerKwhAtUsage(plan, usageKwh))}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-brand-navy/80">
            Term length
          </dt>
          <dd className="mt-1 text-2xl font-extrabold">
            {plan.termMonths !== null ? `${plan.termMonths} mos` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-brand-navy/80">
            % Renewable
          </dt>
          <dd className="mt-1 break-words text-base font-extrabold sm:text-lg">
            {plan.renewableDescription ?? "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
