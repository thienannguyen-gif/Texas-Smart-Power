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

  it("names the usage band live: under 500 Efficient, 500-1,000 Average Home, 1,001-2,000 Power User, above 2,000 Heavy User", () => {
    render(<Harness />);
    const typeKwh = (kwh: number) =>
      fireEvent.change(numberBox(), { target: { value: String(kwh) } });
    const pill = (name: string) => screen.getByText(name);

    expect(pill("Average Home")).toBeInTheDocument(); // 1,000 by default
    typeKwh(499);
    expect(pill("Efficient")).toBeInTheDocument();
    typeKwh(500);
    expect(pill("Average Home")).toBeInTheDocument();
    typeKwh(1000);
    expect(pill("Average Home")).toBeInTheDocument();
    typeKwh(1001);
    expect(pill("Power User")).toBeInTheDocument();
    typeKwh(2000);
    expect(pill("Power User")).toBeInTheDocument();
    typeKwh(2001);
    expect(pill("Heavy User")).toBeInTheDocument();

    // and from the slider, which moves in steps of 50
    fireEvent.change(slider(), { target: { value: "300" } });
    expect(pill("Efficient")).toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: "1500" } });
    expect(pill("Power User")).toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: "3000" } });
    expect(pill("Heavy User")).toBeInTheDocument();
    expect(screen.queryByText("Efficient")).not.toBeInTheDocument();
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

describe("UsageControl notches and keys", () => {
  it("marks 500, 1,000 and 2,000 kWh on the track in the line colour, and nowhere else", () => {
    render(<Harness />);
    const notches = screen.getAllByTestId("usage-notch");
    expect(notches).toHaveLength(3);
    // (500-100)/3900, (1000-100)/3900, (2000-100)/3900 of the way along
    expect(notches.map((n) => n.style.left)).toEqual([
      expect.stringContaining("0.10256"),
      expect.stringContaining("0.23076"),
      expect.stringContaining("0.48717"),
    ]);
    for (const notch of notches) expect(notch).toHaveClass("bg-line");
    // the notch under the thumb is hidden so it does not show through it
    expect(notches[1]).toHaveClass("invisible"); // 1,000 is the starting value
    expect(notches[0]).not.toHaveClass("invisible");
    fireEvent.change(slider(), { target: { value: "1500" } });
    for (const notch of screen.getAllByTestId("usage-notch")) {
      expect(notch).not.toHaveClass("invisible");
    }
  });

  it("PageUp / PageDown move 500, Home and End jump to 100 and 4,000, all kept in range", () => {
    render(<Harness />);
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(numberBox()).toHaveValue(1500);
    fireEvent.keyDown(slider(), { key: "PageDown" });
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(numberBox()).toHaveValue(500);
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(numberBox()).toHaveValue(100);
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
    expect(slider()).toHaveAttribute("step", "50");
  });

  it("releasing the thumb keeps slider and number box in sync", () => {
    render(<Harness />);
    fireEvent.change(slider(), { target: { value: "1000" } });
    fireEvent.pointerUp(slider());
    expect(numberBox()).toHaveValue(1000);
    expect(slider()).toHaveValue("1000");
  });

  it("writes every kWh figure with a comma, even on a machine whose locale uses a dot", () => {
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locales ?? "de-DE", options);
    });
    render(<Harness start={2000} />);
    expect(screen.getByText("4,000 kWh")).toBeInTheDocument();
    expect(slider()).toHaveAttribute("aria-valuetext", "2,000 kWh, Power User");
    expect(document.body.textContent).not.toMatch(/\d\.\d{3} kWh/);
  });
});
