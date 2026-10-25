import type { CSSProperties } from "react";
import { formatKwh } from "../lib/money";
import {
  clampUsage,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
  snapToSlider,
  USAGE_STEP_KWH,
  usageBand,
} from "../lib/usage";

// "YOUR MONTHLY USAGE" with the band name on the right, a number box for an
// exact value, and a slider spanning the full width with its two ends labelled.
// Typing moves the slider and dragging the slider changes the number; both just
// call `onChange`, so the plan list re-prices and re-sorts live either way.
export function UsageControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (kwh: number) => void;
}) {
  const band = usageBand(value);
  const position = snapToSlider(value);
  // how far along the track the thumb is, so the track can be filled up to it
  const filled =
    ((position - MIN_USAGE_KWH) / (MAX_USAGE_KWH - MIN_USAGE_KWH)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">Your monthly usage</span>
        <span
          aria-live="polite"
          className="label-mono rounded bg-brand-soft px-2.5 py-1.5 whitespace-nowrap text-brand"
        >
          {band}
        </span>
      </div>

      <label className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={MIN_USAGE_KWH}
          max={MAX_USAGE_KWH}
          step={USAGE_STEP_KWH}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={(e) => onChange(clampUsage(Number(e.target.value)))}
          aria-label="Monthly usage in kWh"
          className="w-28 rounded-md border border-line bg-field px-3 py-2.5 font-mono text-lg focus:border-brand focus:outline-none"
        />
        <span className="font-mono text-sm text-ink-faint">kWh</span>
      </label>

      <div className="mt-4">
        <input
          type="range"
          min={MIN_USAGE_KWH}
          max={MAX_USAGE_KWH}
          step={USAGE_STEP_KWH}
          value={position}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Monthly usage slider"
          aria-valuetext={`${formatKwh(position)} kWh, ${band}`}
          style={{ "--pct": `${filled}%` } as CSSProperties}
          className="usage-range"
        />
        <div
          aria-hidden="true"
          className="mt-1 flex justify-between font-mono text-xs text-ink-faint"
        >
          <span>{formatKwh(MIN_USAGE_KWH)} kWh</span>
          <span>{formatKwh(MAX_USAGE_KWH)} kWh</span>
        </div>
      </div>
    </div>
  );
}
