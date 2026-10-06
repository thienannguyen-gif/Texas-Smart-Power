import { describe, expect, it } from "vitest";
import { parseCancellationFee } from "./cancellationFee";

describe("parseCancellationFee", () => {
  it("reads 'Cancellation Fee: $300.00'", () => {
    expect(parseCancellationFee("Cancellation Fee: $300.00")).toEqual({
      amount: 300,
      remainder: "",
    });
  });

  it("reads 'Cancellation fee $150.' and keeps the other text", () => {
    expect(
      parseCancellationFee("SAMPLE DATA — not a real plan. Cancellation fee $150."),
    ).toEqual({ amount: 150, remainder: "SAMPLE DATA — not a real plan." });
  });

  it("handles thousands separators", () => {
    expect(parseCancellationFee("Cancellation fee: $1,200")?.amount).toBe(1200);
  });

  it("treats the same amount written twice as one fee", () => {
    expect(
      parseCancellationFee("Cancellation fee $150. Cancellation Fee: $150.00")
        ?.amount,
    ).toBe(150);
  });

  it("returns null when there is no fee text", () => {
    expect(parseCancellationFee("time-of-use plan, free 9pm–6am.")).toBeNull();
    expect(parseCancellationFee(null)).toBeNull();
    expect(parseCancellationFee("")).toBeNull();
  });

  it("returns null for conflicting amounts rather than guessing", () => {
    expect(
      parseCancellationFee("Cancellation fee $150. Cancellation fee $295."),
    ).toBeNull();
  });

  it("returns null for per-month fees", () => {
    expect(
      parseCancellationFee("Cancellation fee $15 per remaining month"),
    ).toBeNull();
    expect(parseCancellationFee("Cancellation fee $15/month")).toBeNull();
  });
});
