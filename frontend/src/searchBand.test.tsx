import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlansHeader } from "./components/PlansHeader";

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const root = /:root\s*\{([^}]*)\}/.exec(css)![1];

describe("palette", () => {
  it("is one light theme: no dark-mode rules, color-scheme: light on :root", () => {
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
      "--bar: #11443a",
      "--bar-fg: #eef6f2",
      "--bar-fg-soft: #9cc4b7",
      "--bar-line: #2d6b5b",
    ]) {
      expect(root).toContain(token);
    }
  });

  it("keeps the old lime / navy / green out of the stylesheet", () => {
    for (const old of ["#dcefaa", "#1f2b3a", "#5c9e30", "#356b27", "#f5b301"]) {
      expect(css.toLowerCase()).not.toContain(old);
    }
  });
});

describe("font", () => {
  it("loads Montserrat 400-700 from Google Fonts with display=swap", () => {
    expect(html).toContain("family=Montserrat:wght@400;500;600;700");
    expect(html).toContain("display=swap");
    expect(html).toContain("https://fonts.gstatic.com");
    expect(html).not.toMatch(/IBM\+Plex|Archivo/);
  });

  it("points all three font tokens at Montserrat, and the body uses the body token", () => {
    for (const name of ["display", "body", "mono"]) {
      expect(root).toContain(`--font-${name}: "Montserrat"`);
    }
    expect(css).toMatch(/body\s*\{[^}]*font-family:\s*var\(--font-body\)/);
  });

  it("asks for tabular figures on the body and on form controls", () => {
    expect(css).toMatch(
      /body,\s*input,\s*button,\s*select,\s*textarea\s*\{[^}]*font-variant-numeric:\s*tabular-nums;[^}]*font-feature-settings:\s*"tnum" 1/,
    );
  });
});

describe("the search band", () => {
  it("shows the service-area line under the ZIP box", () => {
    render(
      <PlansHeader
        zip="79424"
        onSubmitZip={() => {}}
        zipBusy={false}
        usageKwh={1000}
        onUsageChange={() => {}}
        serviceArea="Lubbock Power & Light"
      />,
    );
    expect(screen.getByTestId("service-area")).toHaveTextContent(
      "Service area Lubbock Power & Light",
    );
    expect(screen.getByText("Average Home")).toBeInTheDocument();
    expect(screen.getByText("100 kWh")).toBeInTheDocument();
    expect(screen.getByText("4,000 kWh")).toBeInTheDocument();
  });
});
