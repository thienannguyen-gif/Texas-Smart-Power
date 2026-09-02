import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH, pricePerKwhAtUsage } from "../lib/usage";

// Display-only. Every value shown is a field that already exists on `Plan`.
// No ranking, no scoring, no bill estimate — those need BRIEF.md.
//
// Prices are shown in ¢/kWh (dollars × 100) — the universal Texas retail unit,
// used on Power to Choose itself. A display unit, not a product rule.
export function centsPerKwh(dollarsPerKwh: number | null, digits = 1): string {
  return dollarsPerKwh === null
    ? "—"
    : `${(dollarsPerKwh * 100).toFixed(digits)}¢`;
}

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
            at {usageKwh.toLocaleString()} kWh
          </p>
          <dd className="mt-1 text-2xl font-extrabold">
            {centsPerKwh(pricePerKwhAtUsage(plan, usageKwh), 2)}
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
    </article>
  );
}
