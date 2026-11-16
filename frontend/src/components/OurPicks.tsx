import type { KeyboardEvent } from "react";
import type { Plan } from "../types/plan";
import { AWARD_LABELS, type AwardPick } from "../lib/awards";
import { PlanSummary } from "./PlanSummary";

// Columns on a wide screen follow the number of cards (one or two), so a single
// card takes the full width. Written out so Tailwind can see the class names.
const COLUMNS: Record<number, string> = {
  1: "min-[760px]:grid-cols-1",
  2: "min-[760px]:grid-cols-2",
};

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

      <PlanSummary plan={plan} usageKwh={usageKwh} />
    </div>
  );
}

// "OUR PICKS": up to two plans, one per award, above the plan list. Each card
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
