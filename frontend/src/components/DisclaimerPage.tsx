import { useEffect } from "react";
// The text lives in docs/DISCLAIMER.md (one source of truth); Vite inlines it
// at build time as a string.
import disclaimerSource from "../../../docs/DISCLAIMER.md?raw";
import { parseBlocks, renderBlocks } from "./Markdown";

// Matches a line such as "**Last updated:** 20 October 2026" (any mix of
// bold/italic markers, ":" or "-" after the label).
const LAST_UPDATED =
  /^[\s*_>]*last updated[\s*_]*[:：–-]?[\s*_]*(.+?)[\s*_]*$/im;

/** Pull the "Last updated" line out of the text so the page can show it at the top. */
export function splitLastUpdated(source: string): {
  body: string;
  date: string | null;
} {
  const match = LAST_UPDATED.exec(source);
  if (!match) return { body: source, date: null };
  return {
    body: source.replace(match[0], ""),
    date: match[1].trim(),
  };
}

// Long-form reading page: one column of about 70 characters, generous line
// height, on a white card like the plan cards.
export function DisclaimerPage({
  source = disclaimerSource,
}: {
  source?: string;
}) {
  const { body, date } = splitLastUpdated(source);
  const blocks = parseBlocks(body);
  const first = blocks[0];
  const title = first?.kind === "heading" && first.level === 1 ? first : null;
  const rest = title ? blocks.slice(1) : blocks;

  // arriving from the footer or the header: start at the top of the text
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, []);

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <article className="mx-auto w-full max-w-[75ch] rounded-2xl bg-white p-5 text-base leading-7 text-brand-navy sm:p-10 sm:leading-8">
        <a
          href="#"
          className="inline-block py-2 text-sm text-brand-green-800 underline"
        >
          ← Back to plans
        </a>

        {title && (
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-green-700 sm:text-4xl">
            {title.text}
          </h1>
        )}
        {date && (
          <p className="mt-3 text-sm font-semibold text-brand-navy/80">
            Last updated: {date}
          </p>
        )}

        {renderBlocks(rest)}
      </article>
    </main>
  );
}
