import { useEffect, useRef } from "react";
import type { Plan } from "../types/plan";
import { centsPerKwh } from "./PlanCard";
import { DEFAULT_USAGE_KWH } from "../lib/usage";

// The "More Details" modal from the mockup. Real fields are filled from `Plan`;
// the three that need BRIEF.md rules are shown as explicit placeholders:
//   - "Monthly for N kWh" / "Avg price per kWh"  -> bill simulator
//   - "Cancellation fee"                         -> parse from pricingDetails

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="rounded-full bg-brand-lime-200 px-4 py-1 text-center text-sm font-bold tracking-wide text-brand-green-800">
        {label}
      </p>
      <p className="mt-1 text-center text-xl font-extrabold">{value}</p>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <div>
      <p className="rounded-full bg-brand-lime-200 px-4 py-1 text-center text-sm font-bold tracking-wide text-brand-green-800">
        {label}
      </p>
      <p
        className="mt-1 text-center text-sm text-brand-navy/50"
        title="Needs a BRIEF.md rule"
      >
        not available yet
      </p>
    </div>
  );
}

export function PlanDetailsModal({
  plan,
  onClose,
  usageKwh = DEFAULT_USAGE_KWH,
}: {
  plan: Plan;
  onClose: () => void;
  usageKwh?: number;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tiers = [
    { label: "500 kWh", value: plan.pricePerKwh.at500 },
    { label: "1,000 kWh", value: plan.pricePerKwh.at1000 },
    { label: "2,000 kWh", value: plan.pricePerKwh.at2000 },
  ];

  const planType =
    [
      plan.rateType,
      plan.isTimeOfUse ? "Time-of-use" : null,
      plan.prepaid ? "Prepaid" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "not stated";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="plan-details-title"
            className="text-xl font-bold text-brand-green-700"
          >
            {plan.planName}
            <span className="block text-sm font-normal text-brand-navy/70">
              {plan.companyName}
            </span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-brand-navy/70 hover:bg-brand-lime-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <h3 className="mt-6 text-sm font-bold tracking-wide text-brand-green-700">
          PLAN PRICING
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {tiers.map((tier) => (
            <div key={tier.label} className="text-center">
              <p className="text-xs text-brand-navy/60">{tier.label}</p>
              <p className="rounded-full bg-brand-lime-200 px-2 py-1 text-sm font-extrabold">
                {centsPerKwh(tier.value)}
                <span className="font-normal">/kWh</span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Pending label={`MONTHLY FOR ${usageKwh.toLocaleString()} kWh`} />
          <Pending label="AVG PRICE PER kWh" />
          <Stat
            label="PLAN LENGTH"
            value={
              plan.termMonths !== null
                ? `${plan.termMonths} months`
                : "not stated"
            }
          />
          <Stat label="PLAN TYPE" value={planType} />
          <Pending label="CANCELLATION FEE" />
          <Stat
            label="PERCENTAGE OF RENEWABLE"
            value={plan.renewableDescription ?? "not stated"}
          />
        </div>

        {(plan.factSheetUrl || plan.termsUrl) && (
          <>
            <h3 className="mt-6 text-sm font-bold tracking-wide text-brand-green-700">
              DOCUMENTS
            </h3>
            <ul className="mt-1 space-y-1 text-sm">
              {plan.factSheetUrl && (
                <li>
                  <a
                    href={plan.factSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-green-800 underline"
                  >
                    Electricity Facts Label (EFL)
                  </a>
                </li>
              )}
              {plan.termsUrl && (
                <li>
                  <a
                    href={plan.termsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-green-800 underline"
                  >
                    Terms of Service
                  </a>
                </li>
              )}
            </ul>
          </>
        )}

        {plan.pricingDetails && (
          <p className="mt-4 text-xs text-brand-navy/50">
            {plan.pricingDetails}
          </p>
        )}
      </div>
    </div>
  );
}
