import type { ReactNode } from "react";
import { formatKwh } from "../lib/money";
import {
  clampUsage,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
  snapToSlider,
  USAGE_STEP_KWH,
  usageBand,
} from "../lib/usage";

// Tick labels under the slider, as kWh values.
const TICKS = [500, 1000, 2000, 2500];

// Width of the native slider thumb, used to line the ticks up with it.
const THUMB_PX = 16;

function tickLeft(kwh: number): string {
  const fraction = (kwh - MIN_USAGE_KWH) / (MAX_USAGE_KWH - MIN_USAGE_KWH);
  // the thumb's centre travels between half a thumb in from each end
  return `calc(${fraction * 100}% + ${(0.5 - fraction) * THUMB_PX}px)`;
}

const PILL =
  "rounded-full bg-brand-lime-200 px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm";

// The electricity-usage control in the sticky bar: a number box for an exact
// value, a band name to its left, and a slider on its own row below. Typing
// moves the slider and dragging the slider changes the number; both just call
// `onChange`, so the plan list re-prices and re-sorts live either way.
export function UsageControl({
  value,
  onChange,
  trailing,
}: {
  value: number;
  onChange: (kwh: number) => void;
  /** Sits at the end of the first row (the phone Filters button). */
  trailing?: ReactNode;
}) {
  const band = usageBand(value);

  return (
    <div className="flex flex-col gap-1 sm:w-96">
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span
          aria-live="polite"
          className="min-w-0 truncate text-xs font-semibold text-brand-navy/80 sm:text-sm"
        >
          {band}
        </span>
        <label className={`flex shrink-0 items-center gap-2 ${PILL}`}>
          <span className="hidden sm:inline">Electricity usage</span>
          <input
            type="number"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={USAGE_STEP_KWH}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={(e) => onChange(clampUsage(Number(e.target.value)))}
            aria-label="Monthly usage in kWh"
            className="w-20 rounded border border-brand-navy/30 bg-white px-2 py-1 text-right text-base font-normal sm:text-sm"
          />
          kWh
        </label>
        {trailing}
      </div>

      <div className="px-1">
        <input
          type="range"
          min={MIN_USAGE_KWH}
          max={MAX_USAGE_KWH}
          step={USAGE_STEP_KWH}
          value={snapToSlider(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Monthly usage slider"
          aria-valuetext={`${formatKwh(snapToSlider(value))} kWh, ${band}`}
          className="block h-6 w-full accent-brand-green"
        />
        <div aria-hidden="true" className="relative h-3.5">
          {TICKS.map((tick) => (
            <span
              key={tick}
              style={{ left: tickLeft(tick) }}
              className="absolute top-0 -translate-x-1/2 text-[10px] leading-none font-semibold whitespace-nowrap text-brand-navy/70"
            >
              {formatKwh(tick)} kWh
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
