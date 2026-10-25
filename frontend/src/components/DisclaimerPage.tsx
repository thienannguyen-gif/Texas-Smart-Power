import { useEffect } from "react";
// The text lives in docs/DISCLAIMER.md (one source of truth); Vite inlines it
// at build time as a string.
import disclaimerSource from "../../../docs/DISCLAIMER.md?raw";
import { parseBlocks, renderBlocks } from "./Markdown";

/** "2026-10-20T12:26:23+07:00" -> "20 October 2026", or null if unreadable. */
export function formatUpdated(iso: string | null): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Long-form reading page: one column of about 70 characters, generous line
// height, on a white card like the plan cards.
//
// "Last updated" is not in the text: it is the git date of docs/DISCLAIMER.md,
// injected at build time (see vite.config.ts), so it changes only when the text
// does, not on every deploy.
export function DisclaimerPage({
  source = disclaimerSource,
  updated = __DISCLAIMER_UPDATED__,
}: {
  source?: string;
  /** ISO date the text last changed; defaults to the build-time value. */
  updated?: string | null;
}) {
  const blocks = parseBlocks(source);
  const first = blocks[0];
  const title = first?.kind === "heading" && first.level === 1 ? first : null;
  const rest = title ? blocks.slice(1) : blocks;
  const date = formatUpdated(updated);

  // arriving from the footer or the header: start at the top of the text
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, []);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto w-full max-w-[75ch] rounded-2xl bg-surface p-5 text-base leading-7 text-ink sm:p-10 sm:leading-8">
        <a href="#" className="inline-block py-2 text-sm text-brand underline">
          ← Back to plans
        </a>

        {title && (
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            {title.text}
          </h1>
        )}
        <p className="mt-3 text-sm font-semibold text-ink-soft">
          Last updated: {date ?? "not available in this build"}
        </p>

        {renderBlocks(rest)}
      </article>
    </main>
  );
}
