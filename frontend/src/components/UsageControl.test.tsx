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

  it("names the usage band: under 700 Efficient, 700 to 1,400 Average Home, above 1,400 High Usage", () => {
    render(<Harness />);
    const typeKwh = (kwh: number) =>
      fireEvent.change(numberBox(), { target: { value: String(kwh) } });

    expect(screen.getByText("Average Home")).toBeInTheDocument(); // 1,000 by default
    typeKwh(699);
    expect(screen.getByText("Efficient")).toBeInTheDocument();
    typeKwh(700);
    expect(screen.getByText("Average Home")).toBeInTheDocument();
    typeKwh(1400);
    expect(screen.getByText("Average Home")).toBeInTheDocument();
    typeKwh(1401);
    expect(screen.getByText("High Usage")).toBeInTheDocument();

    // and from the slider
    fireEvent.change(slider(), { target: { value: "300" } });
    expect(screen.getByText("Efficient")).toBeInTheDocument();
    expect(screen.queryByText("High Usage")).not.toBeInTheDocument();
  });

  it("puts a notch on the track at 500, 1,000 and 2,000 kWh, and nowhere else", () => {
    render(<Harness />);
    const notches = screen.getAllByTestId("usage-notch");
    expect(notches).toHaveLength(3);
    // (500-100)/3900, (1000-100)/3900, (2000-100)/3900 of the way along
    expect(notches.map((n) => n.style.left)).toEqual([
      expect.stringContaining("0.10256"),
      expect.stringContaining("0.23076"),
      expect.stringContaining("0.48717"),
    ]);
  });

  it("fills the track up to the thumb, and the fill follows the value", () => {
    render(<Harness />);
    const fill = () => screen.getByTestId("usage-fill").style.width;
    expect(fill()).toContain("0.23076"); // 1,000 kWh
    fireEvent.change(slider(), { target: { value: "4000" } });
    expect(fill()).toContain("+ 1 *");
    fireEvent.change(slider(), { target: { value: "100" } });
    expect(fill()).toContain("+ 0 *");
  });

  it("shows the label under the thumb in green, and the others quietly", () => {
    render(<Harness />);
    expect(screen.getByText("1,000 kWh")).toHaveClass("text-brand");
    expect(screen.getByText("500 kWh")).toHaveClass("text-ink-faint");
    fireEvent.change(slider(), { target: { value: "2000" } });
    expect(screen.getByText("2,000 kWh")).toHaveClass("text-brand");
    expect(screen.getByText("1,000 kWh")).toHaveClass("text-ink-faint");
    // between notches nothing is highlighted
    fireEvent.change(slider(), { target: { value: "1500" } });
    for (const el of screen.getAllByTestId("usage-label")) {
      expect(el).not.toHaveClass("text-brand");
    }
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
    expect(screen.getByText("1,000 kWh")).toBeInTheDocument();
    expect(screen.getByText("2,000 kWh")).toBeInTheDocument();
    expect(slider()).toHaveAttribute(
      "aria-valuetext",
      "1,000 kWh, Average Home",
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

describe("UsageControl labels by screen width", () => {
  it("labels three notches and the top end on wider screens, and only the two ends on phones", () => {
    render(<Harness />);

    // wider screens (sm and up): a label under each notch, plus the top end
    for (const text of ["500 kWh", "1,000 kWh", "2,000 kWh"]) {
      expect(screen.getByText(text)).toHaveClass("hidden", "sm:block");
    }
    const labels = screen.getAllByTestId("usage-label");
    expect(labels.map((l) => l.textContent)).toEqual([
      "500 kWh",
      "1,000 kWh",
      "2,000 kWh",
      "4,000 kWh",
    ]);
    expect(screen.queryByText("2,500 kWh")).not.toBeInTheDocument();

    // phones: just the slider's two ends, which collide with nothing
    const lowest = screen.getByText("100 kWh");
    expect(lowest).toHaveClass("sm:hidden", "left-0");
    expect(lowest).not.toHaveClass("hidden");
    const highest = screen
      .getAllByText("4,000 kWh")
      .find((el) => el.className.includes("sm:hidden"))!;
    expect(highest).toHaveClass("right-0");
    expect(highest).not.toHaveClass("hidden");
  });
});
