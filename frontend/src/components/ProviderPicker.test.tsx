import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { matchProviders, ProviderPicker } from "./ProviderPicker";
import {
  EMPTY_FILTERS,
  selectProvider,
  type PlanFilters,
} from "../lib/filters";

const ALL = ["Gexa Energy", "Reliant", "Green Mountain", "Gridpoint", "TXU"];

function Harness({
  initial = [] as string[],
  initialExcluded = [] as string[],
}) {
  const [f, setF] = useState<PlanFilters>({
    ...EMPTY_FILTERS,
    providers: initial,
    excludedProviders: initialExcluded,
  });
  return (
    <ProviderPicker
      providers={ALL}
      selected={f.providers}
      excluded={f.excludedProviders}
      onSelect={(name) => setF(selectProvider(f, name))}
      onUnselect={(name) =>
        setF({ ...f, providers: f.providers.filter((n) => n !== name) })
      }
      onUnexclude={(name) =>
        setF({
          ...f,
          excludedProviders: f.excludedProviders.filter((n) => n !== name),
        })
      }
    />
  );
}

const box = () => screen.getByRole("combobox", { name: /search providers/i });
const type = (value: string) => fireEvent.change(box(), { target: { value } });

describe("matchProviders", () => {
  it("returns nothing before the user types", () => {
    expect(matchProviders(ALL, [], "")).toEqual([]);
    expect(matchProviders(ALL, [], "   ")).toEqual([]);
  });

  it("matches anywhere in the name, ignoring case", () => {
    expect(matchProviders(ALL, [], "GE")).toEqual(["Gexa Energy"]);
    expect(matchProviders(ALL, [], "gr")).toEqual([
      "Green Mountain",
      "Gridpoint",
    ]);
  });

  it("leaves out providers that are already chosen", () => {
    expect(matchProviders(ALL, ["Gridpoint"], "gr")).toEqual(["Green Mountain"]);
  });

  it("caps the suggestions at 8", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Co ${i}`);
    expect(matchProviders(many, [], "co")).toHaveLength(8);
  });
});

describe("ProviderPicker", () => {
  it("shows no list before the user types", () => {
    render(<Harness />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.queryByText("Reliant")).not.toBeInTheDocument();
  });

  it("shows matching names once the user types", () => {
    render(<Harness />);
    type("gr");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Green Mountain",
      "Gridpoint",
    ]);
  });

  it("adds a chip on selection and clears the box", () => {
    render(<Harness />);
    type("rel");
    fireEvent.mouseDown(screen.getByRole("option", { name: "Reliant" }));
    expect(
      screen.getByRole("button", { name: "Remove Reliant" }),
    ).toBeInTheDocument();
    expect(box()).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("allows several providers at once", () => {
    render(<Harness />);
    type("rel");
    fireEvent.mouseDown(screen.getByRole("option", { name: "Reliant" }));
    type("txu");
    fireEvent.mouseDown(screen.getByRole("option", { name: "TXU" }));
    expect(screen.getByRole("button", { name: "Remove Reliant" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove TXU" })).toBeVisible();
  });

  it("removes a chip with its ✕ button", () => {
    render(<Harness initial={["Reliant", "TXU"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Reliant" }));
    expect(
      screen.queryByRole("button", { name: "Remove Reliant" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove TXU" })).toBeVisible();
  });

  it("selects with the keyboard: ArrowDown then Enter", () => {
    render(<Harness />);
    type("gr");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(
      screen.getByRole("button", { name: "Remove Gridpoint" }),
    ).toBeVisible();
  });

  it("has the 'Search provider...' placeholder", () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText("Search provider...")).toBe(box());
  });

  it("shows chips above the input", () => {
    render(<Harness initial={["Reliant"]} />);
    const chip = screen.getByRole("button", { name: "Remove Reliant" });
    expect(
      chip.compareDocumentPosition(box()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows excluded providers as marked, removable chips", () => {
    render(<Harness initialExcluded={["TXU"]} />);
    expect(screen.getByText("hidden")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show TXU again" }));
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("selecting an excluded provider moves it out of the excluded chips", () => {
    render(<Harness initialExcluded={["TXU"]} />);
    type("txu");
    fireEvent.mouseDown(screen.getByRole("option", { name: "TXU" }));
    expect(screen.getByRole("button", { name: "Remove TXU" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Show TXU again" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer a provider that is already chosen", () => {
    render(<Harness initial={["Gridpoint"]} />);
    type("gr");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Green Mountain",
    ]);
  });
});
