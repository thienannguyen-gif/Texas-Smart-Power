import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";
import type { TduDataFile } from "./types/plan";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ok = (body: unknown): Partial<Response> => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const oncorFile: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-08-29T09:00:00.000Z",
  planCount: 1,
  plans: [
    {
      id: 1,
      planName: "Example Plan 12",
      companyName: "Example Energy",
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
    },
  ],
};

function routeFetch(routes: Array<[string, () => Partial<Response>]>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown) => {
      const url = String(input);
      for (const [needle, handler] of routes) {
        if (url.includes(needle)) return Promise.resolve(handler());
      }
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );
}

function submitZip(zip: string) {
  fireEvent.change(screen.getByLabelText(/zip code/i), {
    target: { value: zip },
  });
  fireEvent.click(screen.getByRole("button", { name: /^go$/i }));
}

test("starts on the ZIP form and does not fetch on mount", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);

  expect(
    screen.getByRole("heading", { name: /texas smart power/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("valid ZIP with one area auto-selects it and loads plans", async () => {
  routeFetch([
    [
      "/api/zip-lookup",
      () => ok({ companies: [{ code: "oncor", name: "Oncor" }] }),
    ],
    ["/api/plans/oncor", () => ok(oncorFile)],
  ]);

  render(<App />);
  submitZip("75201");

  expect(await screen.findByText(/example plan 12/i)).toBeInTheDocument();
});

test("split ZIP shows the area picker; choosing one loads its plans", async () => {
  routeFetch([
    [
      "/api/zip-lookup",
      () =>
        ok({
          companies: [
            { code: "oncor", name: "Oncor" },
            { code: "tnmp", name: "Texas-New Mexico Power" },
          ],
        }),
    ],
    ["/api/plans/oncor", () => ok(oncorFile)],
  ]);

  render(<App />);
  submitZip("75067");

  const pick = await screen.findByRole("button", { name: /^oncor$/i });
  fireEvent.click(pick);

  expect(await screen.findByText(/example plan 12/i)).toBeInTheDocument();
});

test("ZIP with no match shows the not-found message", async () => {
  routeFetch([["/api/zip-lookup", () => ok({ companies: [] })]]);

  render(<App />);
  submitZip("99999");

  expect(
    await screen.findByText(/no texas utility area found for zip/i),
  ).toBeInTheDocument();
});

test("invalid ZIP never triggers a lookup", () => {
  const fetchMock = vi.fn(() => Promise.resolve(ok({ companies: [] })));
  vi.stubGlobal("fetch", fetchMock);

  render(<App />);
  submitZip("12");

  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText(/enter a 5-digit zip/i)).toBeInTheDocument();
});

test("changing the ZIP on the plans page stays on the page, keeps usage, and loads the new area", async () => {
  const centerpointFile: TduDataFile = {
    ...oncorFile,
    tdu: "centerpoint",
    plans: [{ ...oncorFile.plans[0], id: 2, planName: "Houston Plan 24" }],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/zip-lookup")) {
        const { zip } = JSON.parse(String(init?.body));
        const company =
          zip === "77002"
            ? { code: "centerpoint", name: "CenterPoint" }
            : zip === "75201"
              ? { code: "oncor", name: "Oncor" }
              : null;
        return Promise.resolve(ok({ companies: company ? [company] : [] }));
      }
      if (url.includes("/api/plans/oncor"))
        return Promise.resolve(ok(oncorFile));
      if (url.includes("/api/plans/centerpoint"))
        return Promise.resolve(ok(centerpointFile));
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );

  render(<App />);
  submitZip("75201");
  expect(await screen.findByText(/example plan 12/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
    target: { value: "750" },
  });

  // an unknown ZIP: message shown, old plans and ZIP stay
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  fireEvent.change(screen.getByLabelText("ZIP code"), {
    target: { value: "99999" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  expect(
    await screen.findByText(/no texas utility area found for zip/i),
  ).toBeInTheDocument();
  expect(screen.getByText("ZIPCODE: 75201")).toBeInTheDocument();
  expect(screen.getByText(/example plan 12/i)).toBeInTheDocument();

  // a known ZIP: the new area's plans load without leaving the page
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  fireEvent.change(screen.getByLabelText("ZIP code"), {
    target: { value: "77002" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  expect(await screen.findByText(/houston plan 24/i)).toBeInTheDocument();
  expect(screen.getByText("ZIPCODE: 77002")).toBeInTheDocument();
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(750);
  expect(
    screen.queryByRole("heading", { name: /texas smart power/i }),
  ).not.toBeInTheDocument();
});
