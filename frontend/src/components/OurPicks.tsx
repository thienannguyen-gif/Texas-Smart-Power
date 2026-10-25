import type { KeyboardEvent } from "react";
import type { Plan } from "../types/plan";
import { AWARD_LABELS, type AwardPick } from "../lib/awards";
import { parseCancellationFee } from "../lib/cancellationFee";
import { renewablePct } from "../lib/filters";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
import { estimatedMonthlyBill, pricePerKwhAtUsage } from "../lib/usage";
import { ProviderMark } from "./ProviderLogo";

const CHIP =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";
const CHIP_PLAIN = `${CHIP} border-line bg-surface-alt text-ink-soft`;
const CHIP_GREEN = `${CHIP} border-brand-soft bg-brand-soft text-brand`;

// Columns on a wide screen follow the number of cards, so a missing award
// lets the others expand. Written out so Tailwind can see the class names.
const COLUMNS: Record<number, string> = {
  1: "min-[760px]:grid-cols-1",
  2: "min-[760px]:grid-cols-2",
  3: "min-[760px]:grid-cols-3",
};

// The plan facts as chips, in this order. A chip is left out when the fact is
// not known: an unreadable cancellation fee is not "no fee".
function attributeChips(plan: Plan): { text: string; green?: boolean }[] {
  const chips: { text: string; green?: boolean }[] = [];
  if (plan.termMonths !== null) {
    chips.push({ text: `${plan.termMonths}-month term` });
  }
  const renewable = renewablePct(plan);
  if (renewable !== null) {
    chips.push({ text: `${renewable}% renewable`, green: renewable === 100 });
  }
  const fee = parseCancellationFee(plan.pricingDetails);
  if (fee) {
    chips.push({
      text:
        fee.amount === 0
          ? "No cancellation fee"
          : `${formatAmount(fee.amount)} cancellation fee`,
    });
  }
  return chips;
}

function PickCard({
  pick,
  usageKwh,
  onOpen,
}: {
  pick: AwardPick;
  usageKwh: number;
  onOpen: (plan: Plan) => void;
}) {
  const { plan } = pick;
  const open = () => onOpen(plan);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Space would otherwise scroll the page
      open();
    }
  };
  const bill = estimatedMonthlyBill(plan, usageKwh);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      aria-label={`${plan.planName} by ${plan.companyName}: ${pick.awards
        .map((award) => AWARD_LABELS[award])
        .join(", ")}. Details`}
      className="flex cursor-pointer flex-col rounded-[10px] border-2 border-brand bg-surface p-4 text-left hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="flex flex-wrap gap-1.5">
        {pick.awards.map((award) => (
          <span
            key={award}
            className="inline-flex items-center rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-brand-ink uppercase"
          >
            {AWARD_LABELS[award]}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ProviderMark name={plan.companyName} src={plan.companyLogo} />
        <h3 className="min-w-0 font-display text-[17px] leading-snug font-semibold break-words text-ink">
          {plan.planName}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {attributeChips(plan).map((chip) => (
          <span
            key={chip.text}
            className={chip.green ? CHIP_GREEN : CHIP_PLAIN}
          >
            {chip.text}
          </span>
        ))}
      </div>

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
  );
}

// "OUR PICKS": up to three plans, one per award, above the plan list. Each card
// opens the same details modal as the list.
export function OurPicks({
  picks,
  usageKwh,
  onOpen,
}: {
  picks: AwardPick[];
  usageKwh: number;
  onOpen: (plan: Plan) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <section aria-label="Our picks" className="mb-6">
      <p className="mb-3 flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs font-bold tracking-wide text-ink uppercase">
          Our picks
        </span>
        <span className="text-xs text-ink-faint">
          Picked from these plans, at {formatKwh(usageKwh)} kWh. Tap one for
          details.
        </span>
      </p>
      <div className={`grid grid-cols-1 gap-3 ${COLUMNS[picks.length]}`}>
        {picks.map((pick) => (
          <PickCard
            key={pick.plan.id}
            pick={pick}
            usageKwh={usageKwh}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
