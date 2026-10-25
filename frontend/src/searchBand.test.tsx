import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlansHeader } from "./components/PlansHeader";

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("the search band keeps to itself", () => {
  it("has its own colour and font tokens, and leaves the page's tokens alone", () => {
    for (const token of [
      "--band-ink: #0d2b25",
      "--band-brand: #176b57",
      "--band-field: #eeeeee",
      "--band-soft: #e1f1ea",
    ]) {
      expect(css).toContain(token);
    }
    // the page keeps its original palette
    expect(css).toContain("--color-brand-lime: #dcefaa");
    expect(css).toContain("--color-brand-navy: #1f2b3a");
    expect(css).toContain("--color-brand-green: #5c9e30");
  });

  it("adds no global rule on inputs, buttons, labels, body or the mono / sans font tokens", () => {
    expect(css).not.toMatch(
      /(^|\n)(input|button|label|body|\.font-mono)\b[^{]*\{[^}]*font/,
    );
    expect(css).not.toMatch(/--font-(sans|mono):/);
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it("loads only the two Plex families the band uses", () => {
    expect(html).toContain("family=IBM+Plex+Mono");
    expect(html).toContain("family=IBM+Plex+Sans");
    expect(html).not.toContain("Archivo");
  });

  it("shows the service-area line under the ZIP box, with no Change button", () => {
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
    expect(screen.getByText("ZIP code")).toBeInTheDocument();
    expect(screen.getByText("Your monthly usage")).toBeInTheDocument();
    expect(screen.getByText("Average Home")).toBeInTheDocument();
    expect(screen.getByText("100 kWh")).toBeInTheDocument();
    expect(screen.getByText("4,000 kWh")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /change/i }),
    ).not.toBeInTheDocument();
  });
});
