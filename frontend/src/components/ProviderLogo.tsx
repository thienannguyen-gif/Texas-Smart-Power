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

// The mark that sits before a provider's name: its logo, or two initials in a
// circle. Many providers block hotlinking (the image request is refused), so
// when the picture fails — or there is none — the initials stand in rather than
// a broken-image icon. The name itself is written next to it by the caller, so
// the logo is decorative.
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
      <span
        aria-hidden="true"
        data-testid="provider-initials"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft font-mono text-[10px] font-semibold text-brand-deep"
      >
        {providerInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailedSrc(src)}
      className="h-5 w-auto max-w-[5rem] shrink-0 object-contain"
    />
  );
}
