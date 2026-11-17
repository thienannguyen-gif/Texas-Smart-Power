import { useEffect, useId, useRef, useState } from "react";
import {
  clampUsage,
  formatUsageText,
  parseUsageText,
  presetForUsage,
  USAGE_MAX,
  USAGE_MIN,
  USAGE_PRESETS,
} from "../lib/usage";

// How long typing has to pause before the plans are ranked again.
export const USAGE_DEBOUNCE_MS = 250;

// The usage block at the top of the results: three home types and a number box.
// A home type writes its kWh into the box; typing a number of one's own turns
// the buttons off and says "Your number". The box shows 1,680, takes 1680 or
// 1,680, and is only formatted on blur, not while typing.
//
// `value` is the usage the plans are ranked at. The parent owns it; this box
// owns what is currently typed and reports a valid number (debounced when typing,
// at once for a button or a blur).
export function UsageInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (kwh: number) => void;
}) {
  const inputId = useId();
  const noteId = useId();
  const [text, setText] = useState(() => formatUsageText(value));
  const [clamped, setClamped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typed = parseUsageText(text);
  const preset = presetForUsage(typed);
  const ownNumber = typed !== null && preset === null;

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  // The usage changed from outside (the slim bar at the top of the page): show it.
  useEffect(() => {
    if (timer.current === null && parseUsageText(text) !== value) {
      setText(formatUsageText(value));
      setClamped(false);
    }
    // only when the value moves; what is typed is not a reason to overwrite it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pick(kwh: number) {
    cancel();
    setText(formatUsageText(kwh));
    setClamped(false);
    onChange(kwh);
  }

  function type(next: string) {
    setText(next);
    setClamped(false);
    cancel();
    const kwh = parseUsageText(next);
    // a number outside the range, or half a number, waits for the blur
    if (kwh === null || kwh < USAGE_MIN || kwh > USAGE_MAX) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      onChange(kwh);
    }, USAGE_DEBOUNCE_MS);
  }

  function blur() {
    cancel();
    const kwh = parseUsageText(text);
    if (kwh === null) {
      // empty or not a number: go back to the last good value
      setText(formatUsageText(value));
      setClamped(false);
      return;
    }
    const inRange = clampUsage(kwh);
    setText(formatUsageText(inRange));
    setClamped(inRange !== kwh);
    if (inRange !== value) onChange(inRange);
  }

  return (
    <section
      aria-label="Your usage"
      className="flex flex-col gap-4 md:flex-row md:items-end"
    >
      <div>
        <p className="mb-1.5 text-xs font-medium text-bar-fg-soft">Home size</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1 md:flex">
          {USAGE_PRESETS.map((p) => {
            const on = preset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`${p.label}, ${formatUsageText(p.kwh)} kWh`}
                onClick={() => pick(p.kwh)}
                className={`flex min-h-10 flex-col items-center justify-center rounded-lg px-2 py-1 text-[13px] leading-tight font-semibold whitespace-nowrap transition-colors md:flex-row md:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                  on ? "bg-white text-ink" : "text-bar-fg hover:bg-white/10"
                }`}
              >
                <span>{p.label}</span>
                <span className="hidden md:inline">{" · "}</span>
                <span className="text-[12px] font-medium md:text-[13px] md:font-semibold">
                  {formatUsageText(p.kwh)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-bar-fg-soft"
          >
            Monthly usage<span className="sr-only"> in kWh</span>
          </label>
          {ownNumber && (
            <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-gold-ink">
              Your number
            </span>
          )}
        </div>
        <div className="relative md:w-44">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => type(e.target.value)}
            onBlur={blur}
            aria-describedby={clamped ? noteId : undefined}
            className={`h-12 w-full rounded-lg bg-white pr-12 pl-4 text-base font-semibold text-ink focus:outline-none ${
              ownNumber ? "ring-2 ring-gold" : "focus:ring-2 focus:ring-gold"
            }`}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-faint"
          >
            kWh
          </span>
        </div>
        {clamped && (
          <p id={noteId} role="status" className="mt-1 text-xs text-bar-fg">
            We price plans between {formatUsageText(USAGE_MIN)} and{" "}
            {formatUsageText(USAGE_MAX)} kWh.
          </p>
        )}
      </div>
    </section>
  );
}
