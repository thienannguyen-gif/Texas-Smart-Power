import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsageControl } from "./UsageControl";

function Harness({ start = 1000 }: { start?: number }) {
  const [kwh, setKwh] = useState(start);
  return <UsageControl value={kwh} onChange={setKwh} />;
}

const numberBox = () => screen.getByLabelText("Monthly usage in kWh");
const slider = () => screen.getByLabelText("Monthly usage slider");

afterEach(() => vi.restoreAllMocks());

describe("UsageControl", () => {
  it("has a number box and a slider from 100 to 4,000 in steps of 50, starting in sync", () => {
    render(<Harness />);
    expect(numberBox()).toHaveValue(1000);
    expect(slider()).toHaveAttribute("min", "100");
    expect(slider()).toHaveAttribute("max", "4000");
    expect(slider()).toHaveAttribute("step", "50");
    expect(slider()).toHaveValue("1000");
  });

  it("dragging the slider updates the number, and typing a number moves the slider", () => {
    render(<Harness />);

    fireEvent.change(slider(), { target: { value: "2500" } });
    expect(numberBox()).toHaveValue(2500);

    fireEvent.change(numberBox(), { target: { value: "850" } });
    expect(slider()).toHaveValue("850");

    // a typed value between steps puts the slider on the nearest step
    fireEvent.change(numberBox(), { target: { value: "1234" } });
    expect(numberBox()).toHaveValue(1234);
    expect(slider()).toHaveValue("1250");
  });

  it("keeps the slider inside its range while a typed value is out of range, and clamps the box on blur", () => {
    render(<Harness />);
    fireEvent.change(numberBox(), { target: { value: "9999" } });
    expect(slider()).toHaveValue("4000");
    fireEvent.blur(numberBox());
    expect(numberBox()).toHaveValue(4000);

    fireEvent.change(numberBox(), { target: { value: "" } });
    expect(slider()).toHaveValue("100");
  });

  it("names the usage band: under 700 Efficient, 700 to 1,400 Average home, above 1,400 High usage", () => {
    render(<Harness />);
    const typeKwh = (kwh: number) =>
      fireEvent.change(numberBox(), { target: { value: String(kwh) } });

    expect(screen.getByText("Average home")).toBeInTheDocument(); // 1,000 by default
    typeKwh(699);
    expect(screen.getByText("Efficient")).toBeInTheDocument();
    typeKwh(700);
    expect(screen.getByText("Average home")).toBeInTheDocument();
    typeKwh(1400);
    expect(screen.getByText("Average home")).toBeInTheDocument();
    typeKwh(1401);
    expect(screen.getByText("High usage")).toBeInTheDocument();

    // and from the slider
    fireEvent.change(slider(), { target: { value: "300" } });
    expect(screen.getByText("Efficient")).toBeInTheDocument();
    expect(screen.queryByText("High usage")).not.toBeInTheDocument();
  });

  it("labels the two ends of the slider, 100 kWh and 4,000 kWh, and nothing in between", () => {
    render(<Harness />);
    const ends = screen.getAllByText(/^[\d,]+ kWh$/);
    expect(ends.map((el) => el.textContent)).toEqual(["100 kWh", "4,000 kWh"]);
    expect(screen.queryByText("1,000 kWh")).not.toBeInTheDocument();
    expect(screen.queryByText("2,500 kWh")).not.toBeInTheDocument();
  });

  it("shows the band name, 'Your monthly usage' and the filled slider track", () => {
    render(<Harness />);
    expect(screen.getByText("Your monthly usage")).toBeInTheDocument();
    // 1,000 kWh is (1000-100)/(4000-100) of the way along
    expect(slider().style.getPropertyValue("--pct")).toMatch(/^23\.07/);
    fireEvent.change(slider(), { target: { value: "4000" } });
    expect(slider().style.getPropertyValue("--pct")).toBe("100%");
    fireEvent.change(slider(), { target: { value: "100" } });
    expect(slider().style.getPropertyValue("--pct")).toBe("0%");
  });

  it("writes numbers with an explicit en-US locale, so the machine's locale cannot turn 1,000 into 1.000", () => {
    // Simulate a German machine: any toLocaleString call with no locale uses de-DE.
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locales ?? "de-DE", options);
    });

    render(<Harness />);
    expect(screen.getByText("4,000 kWh")).toBeInTheDocument();
    expect(slider()).toHaveAttribute(
      "aria-valuetext",
      "1,000 kWh, Average home",
    );
  });
});

// "We have had this bug before": a toLocaleString() with no locale picks up the
// machine's. Fail if any app source brings it back.
describe("locale formatting in the source", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });
  }

  it("never calls toLocaleString / toLocaleDateString / toLocaleTimeString without a locale", () => {
    const offenders = sourceFiles(join(process.cwd(), "src")).filter((file) =>
      /toLocale(?:Date|Time)?String\(\s*\)/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("passes a locale to every Intl.NumberFormat / DateTimeFormat", () => {
    const offenders = sourceFiles(join(process.cwd(), "src")).filter((file) =>
      /Intl\.(?:NumberFormat|DateTimeFormat)\(\s*(?:\)|\{)/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe("UsageControl notches, labels and keys", () => {
  it("marks 500, 1,000 and 2,000 kWh on the track, and nothing else", () => {
    render(<Harness />);
    const ticks = screen.getAllByTestId("usage-tick");
    expect(ticks).toHaveLength(3);
    // a fraction of the way along: (500-100)/3900, (1000-100)/3900, (2000-100)/3900
    expect(ticks.map((t) => t.style.left)).toEqual([
      expect.stringContaining("0.10256"),
      expect.stringContaining("0.23076"),
      expect.stringContaining("0.48717"),
    ]);
    for (const tick of ticks) expect(tick).toHaveClass("bg-line");
  });

  it("labels the three anchors only on wide screens, and the two ends always", () => {
    render(<Harness />);
    const anchors = screen.getAllByTestId("usage-tick-label");
    expect(anchors.map((a) => a.textContent)).toEqual([
      "500",
      "1,000",
      "2,000",
    ]);
    // hidden at 600px and below, shown above it
    for (const anchor of anchors) {
      expect(anchor).toHaveClass("hidden", "min-[601px]:block");
    }
    for (const end of ["100 kWh", "4,000 kWh"]) {
      expect(screen.getByText(end)).not.toHaveClass("hidden");
    }
  });

  it("writes the anchor labels with a comma even on a machine whose locale uses a dot", () => {
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locales ?? "de-DE", options);
    });
    render(<Harness />);
    expect(screen.getByText("2,000")).toBeInTheDocument();
    expect(screen.queryByText("2.000")).not.toBeInTheDocument();
  });

  it("PageUp / PageDown move 500, Home and End jump to the ends, and all stay in range", () => {
    render(<Harness />);
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(numberBox()).toHaveValue(1500);
    fireEvent.keyDown(slider(), { key: "PageDown" });
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(numberBox()).toHaveValue(500);
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(numberBox()).toHaveValue(100); // clamped, not -0
    fireEvent.keyDown(slider(), { key: "End" });
    expect(numberBox()).toHaveValue(4000);
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(numberBox()).toHaveValue(4000);
    fireEvent.keyDown(slider(), { key: "Home" });
    expect(numberBox()).toHaveValue(100);
  });

  it("arrow keys are left to the slider's own 50 kWh step", () => {
    render(<Harness />);
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      cancelable: true,
      bubbles: true,
    });
    slider().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("releasing the thumb keeps it on the slider value, and the slider and box stay in sync", () => {
    render(<Harness />);
    fireEvent.change(slider(), { target: { value: "1000" } });
    fireEvent.pointerUp(slider());
    expect(numberBox()).toHaveValue(1000);
    expect(slider()).toHaveValue("1000");
  });

  it("the focus ring is on the thumb, not an outline that traces the track", () => {
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    const focus = /\.usage-range:focus-visible\s*\{([^}]*)\}/.exec(css);
    expect(focus?.[1]).toMatch(/outline:\s*none/);
    for (const thumb of ["::-webkit-slider-thumb", "::-moz-range-thumb"]) {
      const rule = new RegExp(
        String.raw`\.usage-range:focus-visible${thumb}\s*\{([^}]*)\}`,
      ).exec(css);
      expect(rule?.[1]).toMatch(/var\(--brand-soft\)/);
      expect(rule?.[1]).toMatch(/var\(--brand\)/);
    }
  });
});

describe("the palette", () => {
  const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
  const root = /:root\s*\{([^}]*)\}/.exec(css)![1];

  it("is one light theme: no dark-mode blocks, and color-scheme is light on :root", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
    expect(css).not.toMatch(/data-theme/);
    expect(root).toMatch(/color-scheme:\s*light/);
  });

  it("keeps the app's original lime page, navy header and green buttons", () => {
    for (const token of [
      "--paper: #dcefaa",
      "--surface: #ffffff",
      "--surface-alt: #eef7d2",
      "--ink: #1f2b3a",
      "--brand: #5c9e30",
      "--brand-deep: #356b27",
      "--brand-ink: #ffffff",
      "--brand-soft: #e4f3bf",
      "--warn: #f5b301",
      "--bar: #1f2b3a",
    ]) {
      expect(root).toContain(token);
    }
  });

  it("introduces no hex value beyond the original palette", () => {
    const original = new Set([
      "#dcefaa",
      "#eef7d2",
      "#e4f3bf",
      "#1f2b3a",
      "#5c9e30",
      "#356b27",
      "#3f7d2e",
      "#f5b301",
      "#ffffff",
      "#991b1b",
      "#fef2f2",
      "#fca5a5",
    ]);
    const used = [...root.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) =>
      m[0].toLowerCase(),
    );
    expect(used.filter((hex) => !original.has(hex))).toEqual([]);
  });
});
