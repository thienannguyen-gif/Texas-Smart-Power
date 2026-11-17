import type { KeyboardEvent } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { PlanSummary } from "./PlanSummary";

// One plan in the list: the same card as an "Our picks" card, without the award
// label. Display-only. Clicking it (or Enter / Space on it) opens the details.
export function PlanCard({
  plan,
  onOpen,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plan: Plan;
  onOpen?: () => void;
  usageKwh?: number;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!onOpen || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); // Space would otherwise scroll the page
      onOpen();
    }
  };

  return (
    <article
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      aria-haspopup={onOpen ? "dialog" : undefined}
      className={`flex h-full flex-col rounded-xl border border-line bg-surface px-3 pt-0 pb-3 text-left shadow-sm ${
        onOpen
          ? "cursor-pointer hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          : ""
      }`}
    >
      <PlanSummary plan={plan} usageKwh={usageKwh} />
    </article>
  );
}
