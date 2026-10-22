import type { Plan } from "../types/plan";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
import { PriceCurveBadge } from "./PriceCurveBadge";

// Display-only. Ranking is computed by the ingestion pipeline; this card
// renders plan details without showing the internal score.

// The mockup puts a star rating here. Its source (upstream rating? a derived
// score?) and scale are a BRIEF.md decision, so this is an inert placeholder —
// it never shows a fabricated score.
function RatingPlaceholder() {
  return (
    <span
      className="text-sm text-brand-navy/25"
      title="Rating not defined yet — pending BRIEF.md"
      aria-label="Not rated yet"
    >
      ★★★★★
    </span>
  );
}

export function PlanCard({
  plan,
  onMoreDetails,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plan: Plan;
  onMoreDetails?: () => void;
  usageKwh?: number;
}) {
  return (
    <article className="rounded-2xl border-2 border-brand-navy bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-brand-green-700">
            {plan.planName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {plan.companyLogo ? (
              <img
                src={plan.companyLogo}
                alt={plan.companyName}
                className="h-5 w-auto max-w-[10rem] object-contain"
              />
            ) : (
              <span className="text-sm text-brand-navy/70">
                {plan.companyName}
              </span>
            )}
            <RatingPlaceholder />
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
          <p className="text-xs text-brand-navy/50">per month</p>
          <dd className="mt-1 text-2xl font-extrabold">
            {formatAmount(estimatedMonthlyBill(plan, usageKwh))}
          </dd>
        </div>
        <div className="rounded-xl bg-brand-lime-100 px-2 py-3 sm:bg-transparent sm:px-0 sm:py-0">
          <dt className="text-sm font-semibold text-brand-navy/80">
            Price per kWh
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
