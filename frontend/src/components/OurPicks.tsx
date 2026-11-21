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
  // the recommended pick (Best overall, alone or with Lowest bill) is the one
  // that stands out: amber; a Lowest bill pick looks like the plans below it
  const gold = pick.awards.includes("best-overall");
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
      className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left shadow-sm ${
        gold ? "border-gold bg-gold-soft" : "border-bar bg-surface"
      } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
    >
      <div className="flex flex-wrap gap-1.5">
        {pick.awards.map((award) => (
          <span
            key={award}
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
              award === "best-overall"
                ? "bg-gold text-gold-ink"
                : "bg-bar text-bar-fg"
            }`}
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
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-ink">
        Our picks for you
      </h2>
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
