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

const BUTTON_BASE =
  "flex h-[52px] min-w-0 flex-col items-center justify-center rounded-lg px-1 text-center whitespace-nowrap sm:px-[14px] transition-colors sm:h-[54px] sm:w-[152px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b57]";
const BUTTON_ON = "border border-[#11443a] bg-[#11443a]";
const BUTTON_OFF = "border border-[#d9dedb] bg-white hover:border-[#176b57]";

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
  const helperId = useId();
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
      className="border-b border-[#e7ebe8] bg-[#fbfcfb] font-sans"
    >
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-10 sm:py-[22px]">
        <p className="text-[10px] font-semibold tracking-[0.13em] text-[#7d9a90] uppercase">
          Your usage
        </p>
        <p className="mt-2 text-[13px] text-[#466b61]">
          Not sure? Start from your home type.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:gap-[10px]">
          {USAGE_PRESETS.map((p) => {
            const on = preset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => pick(p.kwh)}
                className={`${BUTTON_BASE} ${on ? BUTTON_ON : BUTTON_OFF}`}
              >
                <span
                  className={`text-[13px] font-semibold ${on ? "text-[#eef6f2]" : "text-[#0d2b25]"}`}
                >
                  {p.label}
                </span>
                <span
                  className={`text-[11px] font-medium ${on ? "text-[#9fd4c2]" : "text-[#7d9a90]"}`}
                >
                  {formatUsageText(p.kwh)}
                  <span className="hidden sm:inline"> kWh</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor={inputId} className="sr-only">
            Monthly usage in kWh
          </label>
          <div className="relative w-full sm:w-[196px]">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={text}
              onChange={(e) => type(e.target.value)}
              onBlur={blur}
              aria-describedby={`${helperId}${clamped ? ` ${noteId}` : ""}`}
              className={`h-12 w-full rounded-lg bg-white pr-[88px] pl-3 text-[21px] font-semibold text-[#0d2b25] focus:outline-none sm:pr-14 ${
                ownNumber
                  ? "border-2 border-[#176b57] shadow-[0_0_0_3px_rgba(23,107,87,0.13)]"
                  : "border border-[#d9dedb] focus:border-[#176b57]"
              }`}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[#7d9a90]"
            >
              <span className="sm:hidden">kWh / month</span>
              <span className="hidden sm:inline">kWh</span>
            </span>
          </div>
          <span className="hidden text-[13px] text-[#466b61] sm:inline">
            per month
          </span>
          {ownNumber && (
            <span className="inline-flex w-fit rounded bg-[#d8ece4] px-[9px] py-1 text-xs font-semibold text-[#11443a]">
              Your number
            </span>
          )}
        </div>

        <p id={helperId} className="mt-3 text-xs text-[#466b61]">
          Use your 12-month average if you have it; a summer bill runs high.
        </p>
        {clamped && (
          <p id={noteId} role="status" className="mt-1 text-xs text-[#466b61]">
            We price plans between {formatUsageText(USAGE_MIN)} and{" "}
            {formatUsageText(USAGE_MAX)} kWh.
          </p>
        )}
      </div>
    </section>
  );
}
