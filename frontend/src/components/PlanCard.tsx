import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH, pricePerKwhAtUsage } from "../lib/usage";
import { formatKwh, formatRate } from "../lib/money";

// Display-only. Every value shown is a field that already exists on `Plan`.
// No ranking, no scoring, no bill estimate — those need BRIEF.md.

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
  onHideProvider,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plan: Plan;
  onMoreDetails?: () => void;
  /** Called with the provider's name; the parent adds it to the excluded list. */
  onHideProvider?: (companyName: string) => void;
  usageKwh?: number;
}) {
  return (
    <article className="rounded-2xl border-2 border-brand-navy bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-brand-green-700">
            {plan.planName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {plan.companyLogo ? (
              <img
                src={plan.companyLogo}
                alt={plan.companyName}
                className="h-5 w-auto object-contain"
              />
            ) : (
              <span className="text-sm text-brand-navy/70">
                {plan.companyName}
              </span>
            )}
            <RatingPlaceholder />
          </div>
        </div>
        {onMoreDetails && (
          <button
            type="button"
            onClick={onMoreDetails}
            className="shrink-0 rounded-full bg-brand-lime-200 px-4 py-2 text-sm font-bold text-brand-navy hover:bg-brand-lime-100"
          >
            MORE DETAILS
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
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
          <dd className="mt-1 text-lg font-extrabold">
            {plan.renewableDescription ?? "—"}
          </dd>
        </div>
      </dl>

      {onHideProvider && (
        <div className="mt-3 text-right">
          <button
            type="button"
            onClick={() => onHideProvider(plan.companyName)}
            aria-label={`Hide this provider: ${plan.companyName}`}
            className="text-xs text-brand-navy/60 underline hover:text-brand-navy"
          >
            Hide this provider
          </button>
        </div>
      )}
    </article>
  );
}
