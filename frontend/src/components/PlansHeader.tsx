import { useEffect, useId, useState, type ReactNode } from "react";
import { AreaCard, type AreaChoice } from "./AreaCard";

// The top of the results page: a dark green band with "Plans for <ZIP>", the
// area, the plan count and the update time, then one row with the ZIP box, the
// usage controls (passed in as `usage`) and the Update button. For a ZIP that
// returned several utilities, the area card sits below the band.
export function PlansHeader({
  zip,
  onSubmitZip,
  zipBusy,
  serviceArea,
  areaChoice,
  countText,
  generatedAt,
  usage,
}: {
  zip: string;
  /** Called with a valid 5-digit ZIP; the parent looks up its area. */
  onSubmitZip: (zip: string) => void;
  zipBusy: boolean;
  /** Name of the utility area whose plans are showing. */
  serviceArea?: string;
  /** Set only when this ZIP returned several utilities. */
  areaChoice?: AreaChoice;
  /** How many plans are showing, once they have loaded ("126 plans from Power to Choose"). */
  countText?: string;
  /** When the plan data was fetched, once it has loaded. */
  generatedAt?: string;
  /** The usage controls (home size and monthly kWh), drawn in the same row. */
  usage?: ReactNode;
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

  const facts = [
    serviceArea,
    countText,
    generatedAt && `Updated ${new Date(generatedAt).toLocaleString("en-US")}`,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section aria-label="Your search" className="bg-bar font-sans text-bar-fg">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Plans for <span className="text-gold">{zip}</span>
            </h1>
            {facts.length > 0 && (
              <p data-testid="service-area" className="mt-1 text-sm">
                {facts.map((fact, i) => (
                  <span key={fact}>
                    {i > 0 && " · "}
                    <span>{fact}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          <HeaderTiles />
        </div>

        <form
          className="mt-5 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            // a usage typed in the box applies on its own (the box loses
            // focus when the button is pressed); the ZIP needs the button
            if (valid) onSubmitZip(draft);
          }}
        >
          <div>
            <label
              htmlFor="plans-zip"
              className="mb-1.5 block text-xs font-medium text-bar-fg-soft"
            >
              ZIP code
            </label>
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
              className="h-12 w-full rounded-lg bg-white px-4 text-base font-semibold text-ink focus:ring-2 focus:ring-gold focus:outline-none md:w-32"
            />
          </div>

          {usage}

          <button
            type="submit"
            disabled={zipBusy}
            className="h-12 rounded-lg bg-gold px-6 text-base font-semibold text-gold-ink hover:brightness-105 disabled:opacity-50"
          >
            {zipBusy ? "…" : "Update →"}
          </button>
        </form>
        {touched && !valid && (
          <p id={errorId} className="mt-2 text-sm font-medium text-gold">
            Enter a 5-digit ZIP code.
          </p>
        )}
      </div>

      {areaChoice && (
        <div className="mx-auto max-w-6xl px-4 pb-6 text-ink sm:px-6">
          <AreaCard choice={areaChoice} />
        </div>
      )}
    </section>
  );
}

// Small decorative tiles in the corner, like the landing page's (wide screens only).
function HeaderTiles() {
  const t = "h-12 w-12";
  return (
    <div
      aria-hidden="true"
      className="hidden shrink-0 grid-cols-4 gap-2 lg:grid"
    >
      <div className={`${t} rounded-xl bg-gold`} />
      <div className={`${t} rounded-full bg-brand`} />
      <div className={`${t} rounded-tr-[100%] bg-[#7fd1b0]`} />
      <div className={`${t} rounded-xl bg-white/10`} />
      <div className={`${t} rounded-xl bg-white/10`} />
      <div className={`${t} rounded-xl bg-brand`} />
      <div className={`${t} rounded-tl-[100%] bg-[#d4a43c]`} />
      <div className={`${t} rounded-xl bg-white/90`} />
    </div>
  );
}
