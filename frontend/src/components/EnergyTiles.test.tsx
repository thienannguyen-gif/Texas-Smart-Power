import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnergyTiles } from "./EnergyTiles";

describe("EnergyTiles: the brand graphic", () => {
  it("is the same nine tiles, in the same order and colours, large and small", () => {
    const { getByTestId } = render(
      <>
        <EnergyTiles size="large" />
        <EnergyTiles size="small" />
      </>,
    );
    const colours = (el: HTMLElement) =>
      Array.from(el.children).map((tile) =>
        tile.className.split(" ").filter((c) => c.startsWith("bg-")),
      );
    const large = getByTestId("energy-tiles-large");
    const small = getByTestId("energy-tiles-small");
    expect(large.children).toHaveLength(9);
    expect(colours(small)).toEqual(colours(large));
    // the same icons too (sun, turbine, home, bolt, plug)
    expect(small.querySelectorAll("svg")).toHaveLength(5);
    expect(large.querySelectorAll("svg")).toHaveLength(5);
    // decorative only
    expect(large).toHaveAttribute("aria-hidden", "true");
    expect(small).toHaveAttribute("aria-hidden", "true");
  });
});
