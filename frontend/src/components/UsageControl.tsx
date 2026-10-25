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

// Where a usage level sits along the track. The thumb's centre travels from half
// a thumb (9px) in to half a thumb short of the far end, so marks and labels use
// the same offset to line up under it.
const along = (kwh: number) =>
  (kwh - MIN_USAGE_KWH) / (MAX_USAGE_KWH - MIN_USAGE_KWH);
const leftOf = (kwh: number) => `calc(9px + (100% - 18px) * ${along(kwh)})`;

// "YOUR MONTHLY USAGE" with the band name on the right, a number box for an
// exact value, and a slider spanning the full width. Notches on the track mark
// 500, 1,000 and 2,000 kWh, the three levels Power to Choose publishes a price
// for (every other value is interpolated). Wide screens label them; a phone
// labels only the two ends, because five labels collide at that width.
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

  // Arrow keys use the native step (50). PageUp / PageDown move 500, Home / End
  // jump to the ends.
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
          className="w-28 rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-lg focus:border-brand focus:outline-none"
        />
        <span className="font-mono text-sm text-ink-faint">kWh</span>
      </label>

      <div className="mt-4">
        <div className="relative">
          {USAGE_ANCHORS_KWH.map((anchor) => (
            <span
              key={anchor}
              data-testid="usage-tick"
              aria-hidden="true"
              style={{ left: leftOf(anchor) }}
              className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-line"
            />
          ))}
          <input
            type="range"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={USAGE_STEP_KWH}
            value={position}
            onChange={(e) => onChange(Number(e.target.value))}
            onKeyDown={onSliderKey}
            // letting go close to an anchor lands exactly on it
            onPointerUp={(e) =>
              onChange(snapToAnchor(Number(e.currentTarget.value)))
            }
            aria-label="Monthly usage slider"
            aria-valuetext={`${formatKwh(position)} kWh, ${band}`}
            style={{ "--pct": `${filled}%` } as CSSProperties}
            className="usage-range relative"
          />
        </div>
        <div
          aria-hidden="true"
          className="relative mt-1 h-4 font-mono text-xs text-ink-faint"
        >
          <span className="absolute left-0">
            {formatKwh(MIN_USAGE_KWH)} kWh
          </span>
          {USAGE_ANCHORS_KWH.map((anchor) => (
            <span
              key={anchor}
              data-testid="usage-tick-label"
              style={{ left: leftOf(anchor) }}
              className="absolute hidden -translate-x-1/2 min-[601px]:block"
            >
              {formatKwh(anchor)}
            </span>
          ))}
          <span className="absolute right-0">
            {formatKwh(MAX_USAGE_KWH)} kWh
          </span>
        </div>
      </div>
    </div>
  );
}
