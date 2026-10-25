import { useEffect, useId, useState } from "react";
import { AreaCard, type AreaChoice } from "./AreaCard";
import { UsageControl } from "./UsageControl";

// The top of the results page, a white band with two columns:
//   left  — the ZIP search and "Service area <name>"
//   right — the monthly usage (number box, slider)
// For a ZIP that returned several utilities, the "Service area" line has a
// Change link, and the area chooser opens below the band.
export function PlansHeader({
  zip,
  onSubmitZip,
  zipBusy,
  usageKwh,
  onUsageChange,
  serviceArea,
  areaChoice,
}: {
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy: boolean;
  usageKwh: number;
  onUsageChange: (kwh: number) => void;
  /** Name of the utility area whose plans are showing. */
  serviceArea?: string;
  /** Set only when this ZIP returned several utilities. */
  areaChoice?: AreaChoice;
}) {
  const [draft, setDraft] = useState(zip);
  const [touched, setTouched] = useState(false);
  const [switching, setSwitching] = useState(false);
  const errorId = useId();
  const valid = /^\d{5}$/.test(draft);

  // a new area / ZIP coming back from the lookup replaces whatever was typed
  useEffect(() => {
    setDraft(zip);
    setTouched(false);
  }, [zip]);

  const chooserOpen =
    areaChoice !== undefined && (areaChoice.awaiting || switching);

  return (
    <section
      aria-label="Your search"
      className="border-b border-brand-navy/10 bg-white"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-end md:gap-14 md:py-8">
        <div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (valid) onSubmitZip(draft);
            }}
          >
            <label htmlFor="plans-zip" className="label-mono block">
              ZIP code
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="plans-zip"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                placeholder="ZIP code"
                aria-invalid={touched && !valid}
                aria-describedby={touched && !valid ? errorId : undefined}
                className="w-32 min-w-0 rounded-md border border-brand-navy/15 bg-brand-lime px-3 py-2.5 font-mono text-lg focus:border-brand-green focus:outline-none"
              />
              <button
                type="submit"
                disabled={zipBusy}
                className="rounded-md bg-brand-green px-5 py-2.5 text-base font-semibold text-white hover:bg-brand-green-800 disabled:opacity-50 sm:px-6"
              >
                {zipBusy ? "…" : "Find plans"}
              </button>
            </div>
            {touched && !valid && (
              <p
                id={errorId}
                className="mt-2 text-sm font-medium text-brand-green-800"
              >
                Enter a 5-digit ZIP code.
              </p>
            )}
          </form>

          {serviceArea && !areaChoice?.awaiting && (
            <p data-testid="service-area" className="mt-3 text-[15px]">
              Service area{" "}
              <strong className="font-semibold">{serviceArea}</strong>
              {areaChoice && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => setSwitching(true)}
                    aria-label="Change utility area"
                    className="px-1 py-2 text-sm text-brand-green-800 underline"
                  >
                    Change
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <UsageControl value={usageKwh} onChange={onUsageChange} />
      </div>

      {chooserOpen && areaChoice && (
        <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <AreaCard choice={areaChoice} onDone={() => setSwitching(false)} />
        </div>
      )}
    </section>
  );
}
