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

// The electricity-usage block: the band name as a pill on the left, the number
// box on the right, and a slider spanning the full width below with its tick
// labels underneath. Typing moves the slider and dragging the slider changes
// the number; both just call `onChange`, so the plan list re-prices and
// re-sorts live either way.
export function UsageControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (kwh: number) => void;
}) {
  const band = usageBand(value);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <span
          aria-live="polite"
          className="rounded-full bg-brand-lime-200 px-4 py-1.5 text-sm font-bold text-brand-navy"
        >
          {band}
        </span>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="number"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={USAGE_STEP_KWH}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={(e) => onChange(clampUsage(Number(e.target.value)))}
            aria-label="Monthly usage in kWh"
            className="w-24 rounded-lg border-2 border-brand-navy/20 bg-white px-2 py-1.5 text-right text-base font-normal focus:border-brand-green focus:outline-none"
          />
          kWh
        </label>
      </div>

      <div className="mt-3 px-1">
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
        <div aria-hidden="true" className="relative h-4">
          {TICKS.map((tick) => (
            <span
              key={tick}
              style={{ left: tickLeft(tick) }}
              className="absolute top-0 -translate-x-1/2 text-[9px] leading-none font-semibold whitespace-nowrap text-brand-navy/70 sm:text-xs"
            >
              {formatKwh(tick)} kWh
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
