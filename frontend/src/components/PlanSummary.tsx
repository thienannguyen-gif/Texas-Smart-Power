import type { Plan } from "../types/plan";
import { parseCancellationFee } from "../lib/cancellationFee";
import { renewablePct } from "../lib/filters";
import { formatAmount, formatRate } from "../lib/money";
import { costAt } from "../lib/contractCost";
import { pricePerKwhAtUsage } from "../lib/usage";
import { ProviderMark } from "./ProviderLogo";

// The body shared by an "Our picks" card and every card in the plan list: the
// provider mark and plan name, the plan facts as chips, then the rate on the left
// and the monthly bill, big, on the right. Both bill and rate come from costAt.

const CHIP =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";
const CHIP_PLAIN = `${CHIP} border-line bg-surface-alt text-ink-soft`;
const CHIP_GREEN = `${CHIP} border-brand-soft bg-brand-soft text-brand`;
const CHIP_FEE = `${CHIP} border-warn-soft bg-warn-soft text-warn`;

// The plan facts as chips, in this order. A fact that is not known says
// "Not listed": never a blank, never $0 or 0% (an unreadable cancellation fee is
// not "no fee").
export function attributeChips(
  plan: Plan,
): { text: string; green?: boolean; fee?: boolean }[] {
  const chips: { text: string; green?: boolean; fee?: boolean }[] = [];
  if (plan.termMonths !== null) {
    chips.push({ text: `${plan.termMonths}-month term` });
  }
  const renewable = renewablePct(plan);
  if (renewable !== null) {
    chips.push({ text: `${renewable}% renewable`, green: renewable === 100 });
  } else {
    chips.push({ text: "Renewable: Not listed" });
  }
  const fee = parseCancellationFee(plan.pricingDetails);
  if (fee) {
    chips.push({
      text:
        fee.amount === 0
          ? "No cancellation fee"
          : `${formatAmount(fee.amount)} cancellation fee`,
      fee: fee.amount > 0,
    });
  } else {
    chips.push({ text: "Cancellation fee: Not listed" });
  }
  return chips;
}

export function PlanSummary({
  plan,
  usageKwh,
}: {
  plan: Plan;
  usageKwh: number;
}) {
  const bill = costAt(plan, usageKwh);
  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        <ProviderMark name={plan.companyName} src={plan.companyLogo} />
        <span className="sr-only">{plan.companyName}</span>
        <h3 className="min-w-0 text-[17px] leading-snug font-semibold break-words text-ink">
          {plan.planName}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {attributeChips(plan).map((chip) => (
          <span
            key={chip.text}
            className={
              chip.green ? CHIP_GREEN : chip.fee ? CHIP_FEE : CHIP_PLAIN
            }
          >
            {chip.text}
          </span>
        ))}
      </div>

      {/* pushed to the bottom, so cards side by side line up */}
      <div className="mt-auto">
        <hr className="mt-4 border-t border-line-soft" />

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold text-ink">
            {formatRate(pricePerKwhAtUsage(plan, usageKwh))}
          </span>
          <span>
            <span className="text-[22px] leading-none font-semibold text-ink">
              {formatAmount(bill)}
            </span>
            <span className="ml-0.5 text-[11px] text-ink-faint">/mo</span>
          </span>
        </div>
      </div>
    </>
  );
}
