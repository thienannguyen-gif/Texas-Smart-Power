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
