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

  it("labels the ticks 500, 1,000, 2,000 and 2,500 kWh, in order along the track", () => {
    render(<Harness />);
    const labels = ["500 kWh", "1,000 kWh", "2,000 kWh", "2,500 kWh"].map(
      (text) => screen.getByText(text),
    );
    const lefts = labels.map((el) => el.style.left);
    // positions grow with the value; 500 is a tenth of the way in, 2,500 about 61%
    expect(lefts[0]).toMatch(/^calc\(10\.25/);
    expect(lefts[3]).toMatch(/^calc\(61\.53/);
    const pct = lefts.map((l) => Number(/calc\(([\d.]+)%/.exec(l)?.[1]));
    expect([...pct].sort((a, b) => a - b)).toEqual(pct);
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

describe("UsageControl tick labels by screen width", () => {
  it("labels four ticks on wider screens and only the two ends on phones", () => {
    render(<Harness />);

    // wider screens (sm and up): the four ticks are shown, the end labels are not
    for (const text of ["500 kWh", "1,000 kWh", "2,000 kWh", "2,500 kWh"]) {
      expect(screen.getByText(text)).toHaveClass("hidden", "sm:block");
    }
    // phones: just the slider's two ends, which collide with nothing
    const lowest = screen.getByText("100 kWh");
    const highest = screen.getByText("4,000 kWh");
    expect(lowest).toHaveClass("sm:hidden", "left-0");
    expect(highest).toHaveClass("sm:hidden", "right-0");
    expect(lowest).not.toHaveClass("hidden");
    expect(highest).not.toHaveClass("hidden");
  });
});
