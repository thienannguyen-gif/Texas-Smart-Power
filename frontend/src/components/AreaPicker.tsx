import type { UtilityArea } from "../types/zip";
import { displayAreaName } from "../lib/areaName";

// Shown only when a ZIP maps to more than one utility area (blueprint §5): a
// short question and one large button per utility.
export function AreaPicker({
  areas,
  onSelect,
}: {
  areas: UtilityArea[];
  onSelect: (code: string) => void;
}) {
  return (
    <div role="group" aria-label="Choose your utility area">
      <p className="text-base font-semibold text-ink">
        This ZIP is served by {areas.length === 2 ? "two" : areas.length}{" "}
        utilities
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">
        Pick the one named on your electricity bill.
      </p>
      <ul className="mt-3 space-y-2">
        {areas.map((area) => (
          <li key={area.code}>
            <button
              type="button"
              onClick={() => onSelect(area.code)}
              className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-left transition-colors hover:border-brand hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold text-gold-ink"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">
                {displayAreaName(area.name)}
              </span>
              <span
                aria-hidden="true"
                className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
