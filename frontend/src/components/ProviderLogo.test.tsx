import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProviderLogo, providerInitials } from "./ProviderLogo";

describe("providerInitials", () => {
  it.each([
    ["SMARTENERGY HOLDINGS LLC", "SM"], // one real word: its first two letters
    ["GEXA ENERGY", "GE"],
    ["Octopus Energy", "OE"],
    ["CHAMPION ENERGY SERVICES LLC", "CE"],
    ["Think Energy", "TE"],
    ["GOOD CHARLIE & CO LLC", "GC"],
    ["Just Energy", "JE"],
    ["TRIEAGLE ENERGY LP", "TE"],
    ["Rhythm", "RH"],
  ])("%s -> %s", (name, initials) => {
    expect(providerInitials(name)).toBe(initials);
  });

  it("copes with odd input", () => {
    expect(providerInitials("")).toBe("?");
    expect(providerInitials("LLC")).toBe("LL"); // nothing left but filler: use it
    expect(providerInitials("  x  ")).toBe("X");
  });
});

describe("ProviderLogo", () => {
  it("shows the logo picture when there is one", () => {
    const { container } = render(
      <ProviderLogo name="Gexa" src="https://example.com/ok.png" />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/ok.png",
    );
    expect(screen.queryByTestId("provider-initials")).not.toBeInTheDocument();
  });

  it("falls back to initials when the picture fails to load, or there is none", () => {
    const { container, rerender } = render(
      <ProviderLogo name="GEXA ENERGY" src="https://example.com/x.png" />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("provider-initials")).toHaveTextContent("GE");

    rerender(<ProviderLogo name="Octopus Energy" src={null} />);
    expect(screen.getByTestId("provider-initials")).toHaveTextContent("OE");
  });
});
