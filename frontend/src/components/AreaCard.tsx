import { useState } from "react";

export interface AreaChoice {
  options: { code: string; label: string; fullName: string }[];
  /** The area whose plans are showing, or null while a new ZIP's area is still to be chosen. */
  currentCode: string | null;
  /** A newly searched split ZIP: its area has to be picked before anything changes. */
  awaiting: boolean;
  onSelect: (code: string) => void;
}

// The utility-area block, shown only for ZIPs that returned several utilities.
// Open: a full-width card with a pill per area (the chosen one filled, the
// others outlined). Once an area is chosen it collapses to one compact line
// that shows the choice and lets the user switch, without touching the ZIP,
// the usage or the filters.
export function AreaCard({ choice }: { choice: AreaChoice }) {
  const [reopened, setReopened] = useState(false);
  const open = choice.awaiting || reopened;
  const current = choice.options.find((o) => o.code === choice.currentCode);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-full bg-white px-4 py-1.5 text-sm shadow-sm">
        <span className="min-w-0 truncate">
          <span aria-hidden="true">📍 </span>
          Utility area:{" "}
          <strong title={current?.fullName}>
            {current?.label ?? choice.currentCode}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => setReopened(true)}
          aria-label="Change utility area"
          className="shrink-0 px-2 py-2 text-brand-navy/70 underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <p className="text-sm font-bold sm:text-base">
        <span aria-hidden="true">📍 </span>
        Choose your utility service area
      </p>
      <div
        role="group"
        aria-label="Choose your utility area"
        className="flex flex-wrap items-center gap-2"
      >
        {choice.options.map((option) => {
          const selected = option.code === choice.currentCode;
          return (
            <button
              key={option.code}
              type="button"
              aria-pressed={selected}
              title={option.fullName}
              onClick={() => {
                choice.onSelect(option.code);
                setReopened(false);
              }}
              className={`min-h-10 rounded-full border-2 border-brand-green px-4 py-1.5 text-sm font-bold ${
                selected
                  ? "bg-brand-green text-white"
                  : "bg-white text-brand-green-800 hover:bg-brand-lime-100"
              }`}
            >
              {option.label}
            </button>
          );
        })}
        {reopened && !choice.awaiting && (
          <button
            type="button"
            onClick={() => setReopened(false)}
            className="px-2 py-2 text-sm text-brand-navy/70 underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
