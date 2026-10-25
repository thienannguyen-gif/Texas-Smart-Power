import type { CSSProperties, KeyboardEvent } from "react";
import { formatKwh } from "../lib/money";
import {
  clampUsage,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
  snapToAnchor,
  snapToSlider,
  USAGE_ANCHORS_KWH,
  USAGE_PAGE_KWH,
  USAGE_STEP_KWH,
  usageBand,
} from "../lib/usage";

// Where an anchor sits along the track: the thumb's centre travels from half a
// thumb (9px) in from each end, so the notches use the same offset.
const notchLeft = (kwh: number) =>
  `calc(9px + (100% - 18px) * ${(kwh - MIN_USAGE_KWH) / (MAX_USAGE_KWH - MIN_USAGE_KWH)})`;

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

  // Arrow keys use the slider's own 50 kWh step. PageUp / PageDown move 500,
  // Home / End jump to the ends.
  const onSliderKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const target =
      e.key === "PageUp"
        ? position + USAGE_PAGE_KWH
        : e.key === "PageDown"
          ? position - USAGE_PAGE_KWH
          : e.key === "Home"
            ? MIN_USAGE_KWH
            : e.key === "End"
              ? MAX_USAGE_KWH
              : null;
    if (target === null) return;
    e.preventDefault();
    onChange(clampUsage(target));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <span className="band-caption">Your monthly usage</span>
        <span
          aria-live="polite"
          className="band-caption rounded bg-brand-soft px-2.5 py-1.5 whitespace-nowrap text-brand"
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
        <div className="relative">
          <input
            type="range"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={USAGE_STEP_KWH}
            value={position}
            onChange={(e) => onChange(Number(e.target.value))}
            onKeyDown={onSliderKey}
            // letting go within 25 kWh of an anchor lands exactly on it
            onPointerUp={(e) =>
              onChange(snapToAnchor(Number(e.currentTarget.value)))
            }
            aria-label="Monthly usage slider"
            aria-valuetext={`${formatKwh(position)} kWh, ${band}`}
            style={{ "--pct": `${filled}%` } as CSSProperties}
            className="usage-range"
          />
          {/* Notches at the three levels Power to Choose publishes a price for. */}
          {USAGE_ANCHORS_KWH.map((anchor) => (
            <span
              key={anchor}
              data-testid="usage-notch"
              aria-hidden="true"
              style={{ left: notchLeft(anchor) }}
              className={`pointer-events-none absolute top-2.5 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-line ${
                position === anchor ? "invisible" : ""
              }`}
            />
          ))}
        </div>
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
