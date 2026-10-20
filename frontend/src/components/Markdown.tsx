import type { ReactNode } from "react";

// A deliberately small Markdown renderer for the long-form pages (the
// disclaimer). It builds React elements — never raw HTML — so text from the
// file cannot inject markup. Supported: # to #### headings, paragraphs,
// bullet and numbered lists (one level), > quotes, --- rules, **bold**,
// *italic*, `code` and [links](url). Tables, nested lists and images are not
// supported and render as plain text.

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" };

const HEADING = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

function startsBlock(line: string): boolean {
  return (
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line)
  );
}

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4,
        text: heading[2],
      });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        parts.push((QUOTE.exec(lines[i]) as RegExpExecArray)[1]);
        i++;
      }
      blocks.push({ kind: "quote", text: parts.join(" ").trim() });
      continue;
    }

    const ordered = NUMBERED.test(line);
    if (ordered || BULLET.test(line)) {
      const marker = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        const item = marker.exec(lines[i]);
        if (item) {
          items.push(item[1]);
        } else if (startsBlock(lines[i])) {
          break;
        } else {
          // an indented continuation line belongs to the previous item
          items[items.length - 1] += " " + lines[i].trim();
        }
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const parts: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !startsBlock(lines[i])
    ) {
      parts.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: parts.join(" ") });
  }

  return blocks;
}

const INLINE =
  /(\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
const SAFE_HREF = /^(https?:\/\/|mailto:|#)/i;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (match[2] !== undefined) {
      out.push(<strong key={key++}>{renderInline(match[2])}</strong>);
    } else if (match[3] !== undefined) {
      out.push(<em key={key++}>{renderInline(match[3])}</em>);
    } else if (match[4] !== undefined) {
      out.push(
        <code
          key={key++}
          className="rounded bg-brand-lime-100 px-1 text-[0.95em]"
        >
          {match[4]}
        </code>,
      );
    } else {
      const [, , , , , label, href] = match;
      if (SAFE_HREF.test(href)) {
        const external = !href.startsWith("#");
        out.push(
          <a
            key={key++}
            href={href}
            {...(external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="break-words text-brand-green-800 underline"
          >
            {label}
          </a>,
        );
      } else {
        out.push(label); // unsafe scheme (javascript:, data:, …): text only
      }
    }
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "text-3xl font-extrabold tracking-tight text-brand-green-700 sm:text-4xl",
  2: "mt-10 text-xl font-bold text-brand-green-700 sm:text-2xl",
  3: "mt-8 text-lg font-bold text-brand-green-700",
  4: "mt-6 text-base font-bold text-brand-navy",
};

export function renderBlocks(blocks: Block[]): ReactNode[] {
  return blocks.map((block, index) => {
    switch (block.kind) {
      case "heading": {
        const Tag = `h${block.level}` as const;
        return (
          <Tag key={index} className={HEADING_CLASS[block.level]}>
            {renderInline(block.text)}
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={index} className="mt-4">
            {renderInline(block.text)}
          </p>
        );
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        return (
          <List
            key={index}
            className={`mt-4 space-y-2 pl-6 ${
              block.ordered ? "list-decimal" : "list-disc"
            }`}
          >
            {block.items.map((item, n) => (
              <li key={n}>{renderInline(item)}</li>
            ))}
          </List>
        );
      }
      case "quote":
        return (
          <blockquote
            key={index}
            className="mt-4 border-l-4 border-brand-green bg-brand-lime-100 px-4 py-3 text-brand-navy/90"
          >
            {renderInline(block.text)}
          </blockquote>
        );
      case "rule":
        return <hr key={index} className="my-8 border-brand-navy/20" />;
    }
  });
}

export function Markdown({ source }: { source: string }) {
  return <>{renderBlocks(parseBlocks(source))}</>;
}
