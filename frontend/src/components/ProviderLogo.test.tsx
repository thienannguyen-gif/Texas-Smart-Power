import { describe, expect, it } from "vitest";
import { providerInitials } from "./ProviderLogo";

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
