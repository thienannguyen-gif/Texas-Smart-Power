import { formatKwh } from "../lib/money";
import {
  clampUsage,
  MAX_USAGE_KWH,
  MIN_USAGE_KWH,
  snapToSlider,
  USAGE_STEP_KWH,
  usageBand,
} from "../lib/usage";

// The three usage levels Power to Choose publishes a price for (every other value
// is interpolated). They get a notch on the track and a label; the last label
// is the slider's top end.
const ANCHORS = [500, 1000, 2000];

// Width of the slider thumb. The thumb's centre travels from half a thumb in
// from each end, so notches and the filled part use the same offset.
const THUMB_PX = 26;

const along = (kwh: number) =>
  (kwh - MIN_USAGE_KWH) / (MAX_USAGE_KWH - MIN_USAGE_KWH);
const atThumbCentre = (kwh: number) =>
  `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${along(kwh)})`;

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
  const position = snapToSlider(value);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <span
          aria-live="polite"
          className="rounded-full bg-brand-soft px-4 py-1.5 text-sm font-bold text-ink"
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
            className="w-24 rounded-lg border-2 border-line bg-surface px-2 py-1.5 text-right text-base font-normal focus:border-brand focus:outline-none"
          />
          kWh
        </label>
      </div>

      <div className="mt-3 px-1">
        <div className="relative h-7">
          {/* the track, drawn here so the notches can sit on it */}
          <div className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full bg-line">
            <div
              data-testid="usage-fill"
              style={{ width: atThumbCentre(position) }}
              className="h-full bg-brand"
            />
            {ANCHORS.map((anchor) => (
              <span
                key={anchor}
                data-testid="usage-notch"
                aria-hidden="true"
                style={{ left: atThumbCentre(anchor) }}
                className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface"
              />
            ))}
          </div>
          <input
            type="range"
            min={MIN_USAGE_KWH}
            max={MAX_USAGE_KWH}
            step={USAGE_STEP_KWH}
            value={position}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Monthly usage slider"
            aria-valuetext={`${formatKwh(position)} kWh, ${band}`}
            className="usage-range absolute inset-0"
          />
        </div>
        <div aria-hidden="true" className="relative h-4">
          {/* Wide screens: a label under each notch, and the top end. */}
          {ANCHORS.map((anchor) => (
            <span
              key={anchor}
              data-testid="usage-label"
              style={{ left: atThumbCentre(anchor) }}
              className={`absolute top-0 hidden -translate-x-1/2 text-xs leading-none font-semibold whitespace-nowrap sm:block ${
                position === anchor ? "text-brand" : "text-ink-faint"
              }`}
            >
              {formatKwh(anchor)} kWh
            </span>
          ))}
          <span
            data-testid="usage-label"
            className={`absolute top-0 right-0 hidden text-xs leading-none font-semibold whitespace-nowrap sm:block ${
              position === MAX_USAGE_KWH ? "text-brand" : "text-ink-faint"
            }`}
          >
            {formatKwh(MAX_USAGE_KWH)} kWh
          </span>
          {/* Phones: only the two ends, so nothing collides. */}
          <span className="absolute top-0 left-0 text-[10px] leading-none font-semibold whitespace-nowrap text-ink-soft sm:hidden">
            {formatKwh(MIN_USAGE_KWH)} kWh
          </span>
          <span className="absolute top-0 right-0 text-[10px] leading-none font-semibold whitespace-nowrap text-ink-soft sm:hidden">
            {formatKwh(MAX_USAGE_KWH)} kWh
          </span>
        </div>
      </div>
    </div>
  );
}
