import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useZipLookup } from "./useZipLookup";

function mockFetch(impl: () => Partial<Response> | Promise<Partial<Response>>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const ok = (body: unknown): Partial<Response> => ({
  ok: true,
  status: 200,
  json: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useZipLookup state transitions", () => {
  it("is idle until a ZIP is supplied", () => {
    mockFetch(() => new Promise(() => {}));
    const { result } = renderHook(() => useZipLookup(null));
    expect(result.current.status).toBe("idle");
  });

  it("idle → loading → ready with one area", async () => {
    mockFetch(() => ok({ companies: [{ code: "oncor", name: "Oncor" }] }));
    const { result } = renderHook(() => useZipLookup("75201"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("unreachable");
    expect(result.current.areas).toHaveLength(1);
    expect(result.current.zip).toBe("75201");
  });

  it("→ ready with multiple areas for a split ZIP", async () => {
    mockFetch(() =>
      ok({
        companies: [
          { code: "oncor", name: "Oncor" },
          { code: "tnmp", name: "Texas-New Mexico Power" },
        ],
      }),
    );
    const { result } = renderHook(() => useZipLookup("75067"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("unreachable");
    expect(result.current.areas).toHaveLength(2);
  });

  it("→ notFound when no area matches", async () => {
    mockFetch(() => ok({ companies: [] }));
    const { result } = renderHook(() => useZipLookup("99999"));
    await waitFor(() => expect(result.current.status).toBe("notFound"));
  });

  it("→ error on a non-ok response", async () => {
    mockFetch(() => ({ ok: false, status: 500 }));
    const { result } = renderHook(() => useZipLookup("75201"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("unreachable");
    expect(result.current.error).toMatch(/500/);
  });

  it("→ error when the response shape is unexpected", async () => {
    mockFetch(() => ok({ nope: true }));
    const { result } = renderHook(() => useZipLookup("75201"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("unreachable");
    expect(result.current.error).toMatch(/shape/i);
  });

  it("re-runs when the ZIP changes", async () => {
    const fetchMock = vi.fn(() =>
      ok({ companies: [{ code: "oncor", name: "Oncor" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = renderHook(({ zip }) => useZipLookup(zip), {
      initialProps: { zip: "75201" as string | null },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender({ zip: "77002" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
