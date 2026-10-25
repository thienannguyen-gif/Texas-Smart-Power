import { useId, useState } from "react";

// 5-digit ZIP entry, styled per the mockup (large rounded field + green GO).
// Format validation only — which utility area a ZIP maps to is decided
// server-side by /api/zip-lookup, not here.
export function ZipForm({
  onSubmit,
  busy = false,
}: {
  onSubmit: (zip: string) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const errorId = useId();

  const valid = /^\d{5}$/.test(value);
  const showError = touched && !valid;

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (valid) onSubmit(value);
      }}
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <label htmlFor="zip" className="sr-only">
          ZIP code
        </label>
        <input
          id="zip"
          name="zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="Enter your ZIPCODE"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
          onBlur={() => setTouched(true)}
          aria-invalid={showError}
          aria-describedby={showError ? errorId : undefined}
          className="min-w-0 flex-1 rounded-2xl bg-bar px-5 py-4 text-base text-bar-fg placeholder:text-bar-fg/60 focus:outline-none focus:ring-2 focus:ring-brand sm:px-6 sm:text-lg"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-brand px-8 py-4 text-base font-bold text-brand-ink shadow hover:bg-brand/90 disabled:opacity-50 sm:text-lg"
        >
          {busy ? "…" : "GO"}
        </button>
      </div>
      {showError && (
        <p id={errorId} className="mt-2 text-sm font-medium text-brand">
          Enter a 5-digit ZIP code.
        </p>
      )}
    </form>
  );
}
