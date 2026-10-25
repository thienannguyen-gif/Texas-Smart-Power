import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
const root = /:root\s*\{([^}]*)\}/.exec(css)![1];

describe("palette", () => {
  it("is one light theme with color-scheme: light and no dark-mode rules", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).not.toMatch(/data-theme/);
    expect(root).toMatch(/color-scheme:\s*light/);
  });

  it("defines the agreed colours on bare :root", () => {
    for (const token of [
      "--paper: #ffffff",
      "--surface: #ffffff",
      "--surface-alt: #f5f8f6",
      "--ink: #0d2b25",
      "--ink-soft: #466b61",
      "--ink-faint: #7d9a90",
      "--line: #d9dedb",
      "--line-soft: #e7ebe8",
      "--brand: #176b57",
      "--brand-ink: #ffffff",
      "--brand-soft: #e1f1ea",
      "--warn: #9c5a24",
      "--warn-soft: #f8ece1",
      "--sage: #2fa084",
    ]) {
      expect(root).toContain(token);
    }
  });

  it("buttons use --brand, never the sage green", () => {
    const sources = [
      "PlansHeader",
      "ZipForm",
      "FilterDrawer",
      "PlanDetailsModal",
    ];
    for (const name of sources) {
      const src = readFileSync(
        join(process.cwd(), `src/components/${name}.tsx`),
        "utf8",
      );
      expect(src).not.toMatch(/bg-sage/);
    }
  });
});
