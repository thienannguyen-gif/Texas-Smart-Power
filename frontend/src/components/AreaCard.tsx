export interface AreaChoice {
  options: { code: string; label: string; fullName: string }[];
  /** The area whose plans are showing, or null while a new ZIP's area is still to be chosen. */
  currentCode: string | null;
  /** A newly searched split ZIP: its area has to be picked before anything changes. */
  awaiting: boolean;
  onSelect: (code: string) => void;
}

// The utility-area chooser, for ZIPs that returned several utilities: a pill
// per area, the chosen one filled and the others outlined. PlansHeader shows it
// while an area is still to be chosen, or when the user asks to switch from the
// "Service area ... Change" line; picking one (or Cancel) closes it. Switching
// never touches the ZIP, the usage or the filters.
export function AreaCard({
  choice,
  onDone,
}: {
  choice: AreaChoice;
  /** Called after a pick, and by Cancel. */
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-navy/10 bg-brand-lime-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold">Choose your utility service area</p>
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
                onDone();
              }}
              className={`min-h-10 rounded-md border-2 border-brand-green px-4 py-1.5 text-sm font-semibold ${
                selected
                  ? "bg-brand-green text-white"
                  : "bg-white text-brand-green-800 hover:bg-brand-lime-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
        {!choice.awaiting && (
          <button
            type="button"
            onClick={onDone}
            className="px-2 py-2 text-sm text-brand-navy/70 underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
