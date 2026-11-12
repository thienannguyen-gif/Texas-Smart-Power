import type { Plan } from "../types/plan";
import { parseExitFee } from "../lib/cancellationFee";
import { describeMonths, type ContractCost } from "../lib/contractCost";
import { renewablePct } from "../lib/filters";
import { formatAmount, formatAmountCents } from "../lib/money";
import { PriceCurveBadge } from "./PriceCurveBadge";
import { ProviderLogo } from "./ProviderLogo";

// One plan in the dollar ranking: what it costs each month and over its whole
// contract, and which calendar months those are. There is no score here.

function feeText(plan: Plan): string {
  const fee = parseExitFee(plan.pricingDetails, plan.termMonths);
  if (fee === null) return "—";
  return fee === 0 ? "None" : formatAmount(fee);
}

export function ContractCostCard({
  plan,
  cost,
  onMoreDetails,
}: {
  plan: Plan;
  cost: ContractCost;
  onMoreDetails?: () => void;
}) {
  const renewable = renewablePct(plan);
  const term = plan.termMonths ?? cost.monthsCovered.length;

  return (
    <article className="rounded-2xl border-2 border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-brand">
            {plan.planName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProviderLogo name={plan.companyName} src={plan.companyLogo} />
            {plan.newCustomer === false && (
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

      <div className="mt-4">
        <p className="text-3xl font-extrabold">
          {formatAmountCents(cost.perMonth)}
          <span className="ml-1 text-base font-semibold text-ink-soft">
            / mo
          </span>
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">
          {formatAmountCents(cost.total)} over {term}{" "}
          {term === 1 ? "month" : "months"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Months covered: {describeMonths(cost.monthsCovered)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Most expensive month about {formatAmountCents(cost.worstMonth)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-sm font-semibold text-ink-soft">Term length</dt>
          <dd className="mt-1 text-lg font-extrabold">{term} mos</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-ink-soft">
            Cancellation fee
          </dt>
          <dd className="mt-1 text-lg font-extrabold">{feeText(plan)}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-ink-soft">% Renewable</dt>
          <dd
            title={plan.renewableDescription ?? undefined}
            className={`mt-1 text-lg font-extrabold ${
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
