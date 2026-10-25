import type { Plan } from "../types/plan";
import { priceCurveWarning } from "../lib/ranking";

export const PRICE_CURVE_EXPLANATION =
  "The rate per kWh dips or rises around 1,000 kWh compared with 500 and 2,000. This is often a usage-based bill credit that can backfire if your usage changes.";

// A warning on plans whose price curve is unstable (BRIEF.md: V-Trap or Hump).
// It shows in every sort mode: it is how the user sees the risk, while the sort
// order stays exactly what the chosen mode says. Renders nothing for a stable
// curve. `explain` adds the explanation as visible text (the details modal);
// elsewhere it is a tooltip and screen-reader text, kept off the card to stay
// compact.
export function PriceCurveBadge({
  plan,
  explain = false,
  className = "",
}: {
  plan: Plan;
  explain?: boolean;
  className?: string;
}) {
  if (priceCurveWarning(plan) === null) return null;

  return (
    <div className={className}>
      <span
        title={PRICE_CURVE_EXPLANATION}
        className="inline-flex items-center rounded-sm bg-brand-amber-100 px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider text-brand-amber-800 uppercase"
      >
        Unstable price
        {!explain && (
          <span className="sr-only">. {PRICE_CURVE_EXPLANATION}</span>
        )}
      </span>
      {explain && (
        <p className="mt-1 text-xs text-brand-navy/70">
          {PRICE_CURVE_EXPLANATION}
        </p>
      )}
    </div>
  );
}
