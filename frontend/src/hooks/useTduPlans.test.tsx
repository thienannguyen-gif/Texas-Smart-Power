import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTduPlans } from "./useTduPlans";
import type { TduDataFile } from "../types/plan";

const file = (plans: TduDataFile["plans"]): TduDataFile => ({
  tdu: "oncor",
  generatedAt: "2026-08-29T09:00:00.000Z",
  planCount: plans.length,
  plans,
});

const samplePlan: TduDataFile["plans"][number] = {
  id: 1,
  planName: "Sample 12",
  companyName: "Sample Co",
  termMonths: 12,
  rateType: "Fixed",
  pricePerKwh: { at500: null, at1000: 0.15, at2000: null },
  pricingDetails: null,
  isTimeOfUse: false,
  renewableDescription: null,
  prepaid: false,
  companyLogo: null,
  website: null,
  goToPlanUrl: null,
  factSheetUrl: null,
  termsUrl: null,
  enrollPhone: null,
};

function mockFetch(impl: () => Partial<Response> | Promise<Partial<Response>>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTduPlans state transitions", () => {
  it("starts in loading", () => {
    mockFetch(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTduPlans("oncor"));
    expect(result.current.status).toBe("loading");
  });

  it("loading → success when the file has plans", async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => file([samplePlan]),
    }));
    const { result } = renderHook(() => useTduPlans("oncor"));
    await waitFor(() => expect(result.current.status).toBe("success"));
    if (result.current.status !== "success") throw new Error("unreachable");
    expect(result.current.data.plans).toHaveLength(1);
  });

  it("loading → empty when the file has no plans", async () => {
    mockFetch(() => ({ ok: true, status: 200, json: async () => file([]) }));
    const { result } = renderHook(() => useTduPlans("oncor"));
    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("loading → empty when the endpoint 404s (no data file yet)", async () => {
    mockFetch(() => ({ ok: false, status: 404 }));
    const { result } = renderHook(() => useTduPlans("oncor"));
    await waitFor(() => expect(result.current.status).toBe("empty"));
  });

  it("loading → error on a non-ok response", async () => {
    mockFetch(() => ({ ok: false, status: 500 }));
    const { result } = renderHook(() => useTduPlans("oncor"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("unreachable");
    expect(result.current.error).toMatch(/500/);
  });

  it("loading → error when the response shape is unexpected", async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ nope: true }),
    }));
    const { result } = renderHook(() => useTduPlans("oncor"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("unreachable");
    expect(result.current.error).toMatch(/shape/i);
  });
});
