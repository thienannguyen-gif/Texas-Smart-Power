import { useEffect, useRef } from "react";
import type { Plan } from "../types/plan";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
import { parseCancellationFee } from "../lib/cancellationFee";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";

// The "More Details" modal from the mockup. Every box is filled from `Plan`;
// "not available" is shown only when the value genuinely can't be produced
// (missing from the record, or — until BRIEF.md defines interpolation — a usage
// that isn't 500 / 1,000 / 2,000 kWh).

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <p className="rounded-full bg-brand-lime-200 px-4 py-1 text-center text-sm font-bold tracking-wide text-brand-green-800">
        {label}
      </p>
      <p className="mt-1 text-center text-xl font-extrabold">{value}</p>
      {note && <p className="text-center text-xs text-brand-navy/60">{note}</p>}
    </div>
  );
}

function Unavailable({ label, why }: { label: string; why: string }) {
  return (
    <div>
      <p className="rounded-full bg-brand-lime-200 px-4 py-1 text-center text-sm font-bold tracking-wide text-brand-green-800">
        {label}
      </p>
      <p className="mt-1 text-center text-sm text-brand-navy/50" title={why}>
        not available
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

  const rateAtUsage = pricePerKwhAtUsage(plan, usageKwh);
  const bill = estimatedMonthlyBill(plan, usageKwh);
  const priceWhy = [500, 1000, 2000].includes(usageKwh)
    ? "The plan data has no price at this usage"
    : "Prices are only known at 500, 1,000 and 2,000 kWh (no interpolation rule yet)";
  const fee = parseCancellationFee(plan.pricingDetails);
  // Text under the grid: the full details, minus the fee sentence the box shows.
  const detailsNote = fee ? fee.remainder : plan.pricingDetails;

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
                {formatRate(tier.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {bill === null ? (
            <Unavailable label="ESTIMATED MONTHLY BILL" why={priceWhy} />
          ) : (
            <Stat
              label="ESTIMATED MONTHLY BILL"
              value={formatAmount(bill)}
              note={`at ${formatKwh(usageKwh)} kWh`}
            />
          )}
          {rateAtUsage === null ? (
            <Unavailable label="AVG PRICE PER kWh" why={priceWhy} />
          ) : (
            <Stat
              label="AVG PRICE PER kWh"
              value={formatRate(rateAtUsage)}
            />
          )}
          <Stat
            label="PLAN LENGTH"
            value={
              plan.termMonths !== null
                ? `${plan.termMonths} months`
                : "not stated"
            }
          />
          <Stat label="PLAN TYPE" value={planType} />
          {fee ? (
            <Stat label="CANCELLATION FEE" value={formatAmount(fee.amount)} />
          ) : (
            <Unavailable
              label="CANCELLATION FEE"
              why="No single flat fee found in the plan's pricing details"
            />
          )}
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

        {detailsNote && (
          <p className="mt-4 text-xs text-brand-navy/50">{detailsNote}</p>
        )}
      </div>
    </div>
  );
}
