import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

describe("typography", () => {
  it("loads Archivo, IBM Plex Sans and IBM Plex Mono from Google Fonts with display=swap", () => {
    expect(html).toContain(
      'rel="preconnect" href="https://fonts.googleapis.com"',
    );
    expect(html).toContain("https://fonts.gstatic.com");
    expect(html).toContain("family=Archivo:wght@500;600;700");
    expect(html).toContain("family=IBM+Plex+Mono:wght@400;500;600");
    expect(html).toContain("family=IBM+Plex+Sans:wght@400;500;600");
    expect(html).toContain("display=swap");
  });

  it("defines the three font tokens and makes the body font the default", () => {
    expect(css).toMatch(/--font-display:\s*"Archivo"/);
    expect(css).toMatch(/--font-body:\s*"IBM Plex Sans"/);
    expect(css).toMatch(/--font-mono:\s*"IBM Plex Mono"/);
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-body\)/);
  });

  it("gives every mono figure and caption tabular numerals", () => {
    expect(css).toMatch(
      /\.font-mono,\s*\.label-mono\s*\{[^}]*font-variant-numeric:\s*tabular-nums/,
    );
  });

  it("sets uppercase captions at 11px with 0.12em letter-spacing", () => {
    const caption = /@utility label-mono\s*\{([^}]*)\}/.exec(css)![1];
    expect(caption).toMatch(/font-size:\s*0\.6875rem/); // 11px
    expect(caption).toMatch(/letter-spacing:\s*0\.12em/);
    expect(caption).toMatch(/text-transform:\s*uppercase/);
  });
});
