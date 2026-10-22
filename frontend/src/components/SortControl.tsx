import type { SortMode } from "../lib/sort";

const OPTIONS: { value: SortMode; label: string; description: string }[] = [
  {
    value: "best",
    label: "Best match",
    description:
      "Sorted by our score: price, price stability, flexibility and renewable content.",
  },
  {
    value: "lowestBill",
    label: "Lowest bill",
    description:
      "Sorted by estimated monthly bill at your usage level. Cheapest first.",
  },
];

// Two clean modes. Native radio inputs (so the arrow keys work) drawn as the
// same pills the rest of the site uses; the chosen mode's description sits
// underneath.
export function SortControl({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (next: SortMode) => void;
}) {
  const current =
    OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  return (
    <fieldset className="mb-3">
      <legend className="sr-only">Sort plans</legend>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="text-xs font-bold sm:text-sm">
          SORT BY
        </span>
        {OPTIONS.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name="sort-plans"
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-10 items-center rounded-full bg-brand-lime-200 px-4 py-1.5 text-sm font-bold text-brand-navy peer-checked:bg-brand-green peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-navy">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-brand-navy/70 sm:text-sm">
        {current.description}
      </p>
    </fieldset>
  );
}
