import { useEffect, useId, useState } from "react";
import { AreaCard, type AreaChoice } from "./AreaCard";
import { UsageControl } from "./UsageControl";

// The top of the results page, three centered blocks:
//   1. search  — the ZIP box and "Find plans"
//   2. usage   — band pill + number box, the slider and its ticks
//   3. area    — only for ZIPs that returned several utilities
// Blocks 1 and 2 share one column width; the area card spans the page.
export function PlansHeader({
  zip,
  onSubmitZip,
  zipBusy,
  usageKwh,
  onUsageChange,
  areaChoice,
}: {
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy: boolean;
  usageKwh: number;
  onUsageChange: (kwh: number) => void;
  areaChoice?: AreaChoice;
}) {
  const [draft, setDraft] = useState(zip);
  const [touched, setTouched] = useState(false);
  const errorId = useId();
  const valid = /^\d{5}$/.test(draft);

  // a new area / ZIP coming back from the lookup replaces whatever was typed
  useEffect(() => {
    setDraft(zip);
    setTouched(false);
  }, [zip]);

  return (
    <section
      aria-label="Your search"
      className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8"
    >
      <form
        className="w-full max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (valid) onSubmitZip(draft);
        }}
      >
        <div className="flex gap-2 sm:gap-3">
          <label htmlFor="plans-zip" className="sr-only">
            ZIP code
          </label>
          <input
            id="plans-zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter your ZIP code"
            aria-invalid={touched && !valid}
            aria-describedby={touched && !valid ? errorId : undefined}
            className="min-w-0 flex-1 rounded-2xl border-2 border-brand-navy/20 bg-white px-4 py-3 text-base focus:border-brand-green focus:outline-none sm:px-5"
          />
          <button
            type="submit"
            disabled={zipBusy}
            className="shrink-0 rounded-2xl bg-brand-green px-5 py-3 text-base font-bold text-white shadow hover:bg-brand-green-800 disabled:opacity-50 sm:px-7"
          >
            {zipBusy ? "…" : "Find plans"}
          </button>
        </div>
        {touched && !valid && (
          <p
            id={errorId}
            className="mt-2 text-center text-sm font-medium text-brand-green-800"
          >
            Enter a 5-digit ZIP code.
          </p>
        )}
      </form>

      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <UsageControl value={usageKwh} onChange={onUsageChange} />
      </div>

      {areaChoice && (
        <div className="w-full">
          <AreaCard choice={areaChoice} />
        </div>
      )}
    </section>
  );
}
