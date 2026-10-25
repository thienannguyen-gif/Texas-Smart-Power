import { describe, expect, it } from "vitest";
import { displayAreaName } from "./areaName";

describe("displayAreaName", () => {
  it("title-cases the all-caps names the upstream sends", () => {
    expect(displayAreaName("ONCOR ELECTRIC DELIVERY COMPANY")).toBe(
      "Oncor Electric Delivery Company",
    );
    expect(displayAreaName("CENTERPOINT ENERGY HOUSTON ELECTRIC")).toBe(
      "Centerpoint Energy Houston Electric",
    );
  });

  it("keeps hyphenated words and known acronyms right", () => {
    expect(displayAreaName("TEXAS-NEW MEXICO POWER COMPANY")).toBe(
      "Texas-New Mexico Power Company",
    );
    expect(displayAreaName("ONCOR ELECTRIC DELIVERY COMPANY LLC")).toBe(
      "Oncor Electric Delivery Company LLC",
    );
    expect(displayAreaName("AEP TEXAS NORTH")).toBe("AEP Texas North");
  });

  it("leaves a name that is already mixed case exactly as it is", () => {
    expect(displayAreaName("Oncor")).toBe("Oncor");
    expect(displayAreaName("CenterPoint Energy")).toBe("CenterPoint Energy");
  });

  it("trims, and survives an empty name", () => {
    expect(displayAreaName("  ONCOR  ")).toBe("Oncor");
    expect(displayAreaName("")).toBe("");
  });
});
