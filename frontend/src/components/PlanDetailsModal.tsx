import { useEffect, useRef } from "react";
import type { Plan } from "../types/plan";
import { formatAmount, formatKwh, formatRate } from "../lib/money";
import { parseCancellationFee } from "../lib/cancellationFee";
import { PriceCurveBadge } from "./PriceCurveBadge";
import { TOU_SECTION_INTRO } from "../lib/timeOfUse";
import { httpUrl, telHref } from "../lib/links";
import {
  DEFAULT_USAGE_KWH,
  estimatedMonthlyBill,
  pricePerKwhAtUsage,
} from "../lib/usage";

// The "More Details" modal from the mockup. Every box is filled from `Plan`;
// "not available" is shown only when the plan is missing one or more of its
// required anchor prices.

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
      <p className="rounded-full bg-brand-soft px-4 py-1 text-center font-mono text-[11px] font-medium tracking-[0.12em] text-brand">
        {label}
      </p>
      <p className="mt-1 break-words text-center font-mono text-xl font-semibold">
        {value}
      </p>
      {note && <p className="text-center text-xs text-ink-soft">{note}</p>}
    </div>
  );
}

function Unavailable({ label, why }: { label: string; why: string }) {
  return (
    <div>
      <p className="rounded-full bg-brand-soft px-4 py-1 text-center font-mono text-[11px] font-medium tracking-[0.12em] text-brand">
        {label}
      </p>
      <p className="mt-1 text-center text-sm text-ink-soft" title={why}>
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
  const priceWhy =
    "A price cannot be estimated because one or more anchor rates are missing";
  // Where "Sign up" goes: the plan's own sign-up page, else the provider's site.
  const signUpUrl = httpUrl(plan.goToPlanUrl) ?? httpUrl(plan.website);
  const phoneHref = telHref(plan.enrollPhone);
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-details-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[90dvh] sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="plan-details-title"
            className="font-display text-xl font-semibold text-brand"
          >
            {plan.planName}
            <span className="block text-sm font-normal text-ink-soft">
              {plan.companyName}
            </span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 shrink-0 rounded-full px-3 py-1 text-ink-soft hover:bg-surface-alt"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {(signUpUrl || plan.enrollPhone) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {signUpUrl && (
              <a
                href={signUpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-7 py-2 text-base font-bold text-brand-ink shadow hover:bg-brand/90"
              >
                Sign up{" "}
                <span className="sr-only">
                  with {plan.companyName} (opens in a new tab)
                </span>
              </a>
            )}
            {plan.enrollPhone &&
              (phoneHref ? (
                <a
                  href={phoneHref}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline"
                >
                  {signUpUrl ? "or call " : "Call "}
                  {plan.enrollPhone}
                </a>
              ) : (
                <span className="text-sm font-semibold text-ink-soft">
                  {signUpUrl ? "or call " : "Call "}
                  {plan.enrollPhone}
                </span>
              ))}
          </div>
        )}

        <h3 className="mt-6 text-sm font-display font-semibold tracking-wide text-brand">
          PLAN PRICING
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {tiers.map((tier) => (
            <div key={tier.label} className="text-center">
              <p className="text-xs text-ink-soft">{tier.label}</p>
              <p className="rounded-full bg-brand-soft px-2 py-1 font-mono text-sm font-semibold">
                {formatRate(tier.value)}
              </p>
            </div>
          ))}
        </div>

        {plan.isTimeOfUse && (
          <p className="mt-3 rounded-xl bg-surface-alt px-3 py-2 text-xs text-ink-soft">
            <strong>Time-of-use plan, not ranked.</strong> {TOU_SECTION_INTRO}
          </p>
        )}

        {plan.newCustomer === true && (
          <p className="mt-3 rounded-xl bg-surface-alt px-3 py-2 text-sm text-ink">
            <strong>Eligibility:</strong> New customers only — if you&apos;re
            already with {plan.companyName}, you may not qualify for this rate.
          </p>
        )}

        <PriceCurveBadge plan={plan} explain className="mt-3" />

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
            <Stat label="AVG PRICE PER kWh" value={formatRate(rateAtUsage)} />
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

        {(plan.factSheetUrl || plan.termsUrl || plan.yracUrl) && (
          <>
            <h3 className="mt-6 text-sm font-display font-semibold tracking-wide text-brand">
              DOCUMENTS
            </h3>
            <ul className="mt-1 space-y-1 text-sm">
              {plan.factSheetUrl && (
                <li>
                  <a
                    href={plan.factSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block py-2 text-brand underline"
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
                    className="inline-block py-2 text-brand underline"
                  >
                    Terms of Service
                  </a>
                </li>
              )}
              {plan.yracUrl && (
                <li>
                  <a
                    href={plan.yracUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block py-2 text-brand underline"
                  >
                    Your Rights as a Customer
                  </a>
                </li>
              )}
            </ul>
          </>
        )}

        {detailsNote && (
          <p className="mt-4 text-xs text-ink-soft">{detailsNote}</p>
        )}
      </div>
    </div>
  );
}
