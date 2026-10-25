import type { UtilityArea } from "../types/zip";

// Shown only when a ZIP maps to more than one utility area (blueprint §5).
export function AreaPicker({
  areas,
  onSelect,
}: {
  areas: UtilityArea[];
  onSelect: (code: string) => void;
}) {
  return (
    <div role="group" aria-label="Choose your utility area">
      <p className="mb-2 text-sm text-slate-700">
        That ZIP is served by more than one utility. Which is yours?
      </p>
      <ul className="space-y-2">
        {areas.map((area) => (
          <li key={area.code}>
            <button
              type="button"
              onClick={() => onSelect(area.code)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-left hover:bg-slate-50"
            >
              {area.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
