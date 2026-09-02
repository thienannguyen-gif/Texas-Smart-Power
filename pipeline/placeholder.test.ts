import { describe, expect, it } from "vitest";

// Smoke test: proves the root Vitest runner is wired up. Replace with real
// pipeline tests as modules are added.
describe("scaffold", () => {
  it("runs the root test suite", () => {
    expect(1 + 1).toBe(2);
  });
});
