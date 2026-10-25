import type { ReactNode } from "react";
import { clampUsage } from "../lib/usage";

// A slim bar that slides in at the top once the full header has scrolled out
// of view, so the ZIP, the area and the usage stay reachable while the user
// reads the plan list. "Edit" scrolls back up to the full header.
export function CompactBar({
  zip,
  areaLabel,
  usageKwh,
  onUsageChange,
  trailing,
}: {
  zip: string;
  areaLabel?: string;
  usageKwh: number;
  onUsageChange: (kwh: number) => void;
  /** The phone Filters button. */
  trailing?: ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 border-b border-line-soft bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        <span className="min-w-0 truncate text-xs font-bold sm:text-sm">
          ZIP {zip}
          {areaLabel && ` · ${areaLabel}`}
        </span>
        <button
          type="button"
          onClick={() => window.scrollTo?.({ top: 0, behavior: "smooth" })}
          className="shrink-0 px-2 py-2 text-xs text-ink-soft underline sm:text-sm"
        >
          Edit
        </button>
        <span className="flex-1" />
        <label className="flex shrink-0 items-center gap-1.5 text-xs font-bold sm:text-sm">
          <input
            type="number"
            value={usageKwh}
            onChange={(e) => onUsageChange(Number(e.target.value))}
            onBlur={(e) => onUsageChange(clampUsage(Number(e.target.value)))}
            aria-label="Monthly usage in kWh (top bar)"
            className="w-20 rounded border border-line bg-surface px-2 py-1 text-right text-base font-normal sm:text-sm"
          />
          kWh
        </label>
        {trailing}
      </div>
    </div>
  );
}
