import { useId, useState } from "react";

const MAX_SUGGESTIONS = 8;

/** Providers containing `query` (case-insensitive), minus the chosen ones. */
export function matchProviders(
  providers: string[],
  selected: string[],
  query: string,
): string[] {
  const q = query.trim().toLowerCase();
  if (q === "") return []; // no list before the user types
  return providers
    .filter((name) => !selected.includes(name))
    .filter((name) => name.toLowerCase().includes(q))
    .slice(0, MAX_SUGGESTIONS);
}

// One text box with autocomplete. Chosen providers become removable chips above
// it, and hidden ("excluded") providers show as struck-through chips; the full
// provider list is never shown. A provider is never in both lists — the parent
// enforces that (selectProvider / excludeProvider in lib/filters.ts).
export function ProviderPicker({
  providers,
  selected,
  excluded,
  onSelect,
  onUnselect,
  onUnexclude,
}: {
  providers: string[];
  selected: string[];
  excluded: string[];
  onSelect: (name: string) => void;
  onUnselect: (name: string) => void;
  onUnexclude: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = matchProviders(providers, selected, query);
  const showList = open && matches.length > 0;
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));

  function choose(name: string) {
    onSelect(name);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((activeIndex + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((activeIndex - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && showList) {
      e.preventDefault();
      choose(matches[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative space-y-2">
      {(selected.length > 0 || excluded.length > 0) && (
        <ul className="flex flex-wrap gap-2" aria-label="Provider chips">
          {selected.map((name) => (
            <li
              key={`in-${name}`}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-navy"
            >
              {name}
              <button
                type="button"
                onClick={() => onUnselect(name)}
                aria-label={`Remove ${name}`}
                className="text-brand-navy/60 hover:text-brand-navy"
              >
                ✕
              </button>
            </li>
          ))}
          {excluded.map((name) => (
            <li
              key={`out-${name}`}
              className="flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800"
            >
              <span className="line-through">{name}</span>
              <span className="font-normal">hidden</span>
              <button
                type="button"
                onClick={() => onUnexclude(name)}
                aria-label={`Show ${name} again`}
                className="text-red-800/70 hover:text-red-800"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search providers"
        placeholder="Search provider..."
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className="w-full rounded border border-brand-navy/30 bg-white px-2 py-1 text-sm"
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-10 max-h-56 overflow-y-auto rounded border border-brand-navy/30 bg-white text-sm shadow"
        >
          {matches.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown (not click) so the input's blur doesn't close the
              // list before the choice registers
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
              className={`cursor-pointer px-2 py-1 ${
                i === activeIndex ? "bg-brand-lime-100" : ""
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
