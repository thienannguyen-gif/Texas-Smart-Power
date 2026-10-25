import { useState } from "react";

// Words that say what kind of company it is, not which one: left out of the
// initials ("SMARTENERGY HOLDINGS LLC" -> "SM", "Octopus Energy" -> "OE").
const FILLER = new Set([
  "llc",
  "lp",
  "inc",
  "co",
  "corp",
  "company",
  "holdings",
  "ltd",
  "&",
  "and",
]);

/** Two letters standing in for a provider's logo. */
export function providerInitials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9&\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = words.filter((w) => !FILLER.has(w.toLowerCase()));
  const usable = meaningful.length > 0 ? meaningful : words;
  if (usable.length === 0) return "?";
  if (usable.length === 1) return usable[0].slice(0, 2).toUpperCase();
  return (usable[0][0] + usable[1][0]).toUpperCase();
}

// The provider's logo. Many providers block hotlinking (the image request is
// refused), so when the picture fails — or there is none — show the provider's
// initials in a circle next to its name instead of a broken-image icon.
export function ProviderLogo({
  name,
  src,
}: {
  name: string;
  src: string | null;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-lime-200 text-xs font-bold text-brand-green-800"
        >
          {providerInitials(name)}
        </span>
        <span className="text-sm text-brand-navy/70">{name}</span>
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailedSrc(src)}
      className="h-5 w-auto max-w-[10rem] object-contain"
    />
  );
}
