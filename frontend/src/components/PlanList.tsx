import { useState } from "react";
import type { Plan } from "../types/plan";
import { DEFAULT_USAGE_KWH } from "../lib/usage";
import { PlanCard } from "./PlanCard";
import { PlanDetailsModal } from "./PlanDetailsModal";

// Plans render in the order delivered — no scoring. Ranking and the stability
// filter come later, once BRIEF.md defines them. The sidebar's preference
// filters have already been applied to `plans` by the time they reach here.
export function PlanList({
  plans,
  totalCount,
  generatedAt,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plans: Plan[];
  totalCount: number;
  generatedAt: string;
  usageKwh?: number;
}) {
  const [selected, setSelected] = useState<Plan | null>(null);
  const filtered = plans.length !== totalCount;

  return (
    <section aria-label="Plans">
      <p className="mb-1 text-sm text-brand-navy/70">
        {filtered
          ? `Showing ${plans.length} of ${totalCount} plans`
          : `${totalCount} ${totalCount === 1 ? "plan" : "plans"}`}{" "}
        · updated {new Date(generatedAt).toLocaleString()}
      </p>
      <p className="mb-4 text-xs text-brand-green-800">
        Unranked scaffold view — listed in the order the data provides.
      </p>

      {plans.length === 0 ? (
        <p className="text-brand-navy/70">No plans match these filters.</p>
      ) : (
        <ul className="space-y-4">
          {plans.map((plan) => (
            <li key={plan.id}>
              <PlanCard
                plan={plan}
                usageKwh={usageKwh}
                onMoreDetails={() => setSelected(plan)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <PlanDetailsModal
          plan={selected}
          usageKwh={usageKwh}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
