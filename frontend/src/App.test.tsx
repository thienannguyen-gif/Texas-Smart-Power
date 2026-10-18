import { fireEvent, render, screen, within } from "@testing-library/react";
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

// ---- Area picker for split ZIPs (75067 spans Oncor and TNMP; 75201 is Oncor only)

const planFile = (tdu: "oncor" | "tnmp", planName: string): TduDataFile => ({
  ...oncorFile,
  tdu,
  plans: [{ ...oncorFile.plans[0], planName }],
});

const ONCOR = { code: "oncor", name: "ONCOR ELECTRIC DELIVERY COMPANY" };
const TNMP = { code: "tnmp", name: "TEXAS-NEW MEXICO POWER COMPANY" };

function stubSplitZips() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/zip-lookup")) {
        const { zip } = JSON.parse(String(init?.body));
        return Promise.resolve(
          ok({
            companies:
              zip === "75067" ? [ONCOR, TNMP] : zip === "75201" ? [ONCOR] : [],
          }),
        );
      }
      if (url.includes("/api/plans/oncor"))
        return Promise.resolve(ok(planFile("oncor", "Oncor Plan")));
      if (url.includes("/api/plans/tnmp"))
        return Promise.resolve(ok(planFile("tnmp", "TNMP Plan")));
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );
}

const areaPicker = () =>
  screen.queryByRole("group", { name: /choose your utility area/i });

function changeZip(zip: string) {
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  fireEvent.change(screen.getByLabelText("ZIP code"), {
    target: { value: zip },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
}

test("75067 returns two companies and the area picker renders, with no plans loaded yet", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");

  expect(
    await screen.findByRole("group", { name: /choose your utility area/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /oncor electric delivery/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /texas-new mexico power/i }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Oncor Plan")).not.toBeInTheDocument();
  expect(screen.queryByText("TNMP Plan")).not.toBeInTheDocument();
});

test("75201 returns one company: the picker is skipped and plans load", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75201");

  expect(await screen.findByText("Oncor Plan")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.queryByText(/^AREA:/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Change utility area" }),
  ).not.toBeInTheDocument();
});

test("after choosing an area for a split ZIP, the area 'Change' brings the picker back", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /texas-new mexico power/i }),
  );
  expect(await screen.findByText("TNMP Plan")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.getByText("AREA: TNMP")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Change utility area" }));
  // the chooser opens in the header bar itself, next to the ZIP, with short names
  const group = areaPicker();
  expect(group).toBeInTheDocument();
  expect(
    screen.getByText("ZIPCODE: 75067").parentElement?.contains(group),
  ).toBe(true);
  expect(within(group!).getByRole("button", { name: "TNMP" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(within(group!).getByRole("button", { name: "Oncor" }));
  expect(await screen.findByText("Oncor Plan")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.getByText("AREA: Oncor")).toBeInTheDocument();
});

test("resubmitting the same split ZIP via Change shows the picker again", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /texas-new mexico power/i }),
  );
  await screen.findByText("TNMP Plan");

  changeZip("75067");
  expect(areaPicker()).toBeInTheDocument();
});

test("changing to a single-area ZIP clears the split-area controls", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /texas-new mexico power/i }),
  );
  await screen.findByText("TNMP Plan");

  changeZip("75201");
  expect(await screen.findByText("Oncor Plan")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.queryByText(/^AREA:/)).not.toBeInTheDocument();
});

test("header shows ZIP and chosen area; the picker block is gone once a choice is made", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  expect(
    await screen.findByRole("group", { name: /choose your utility area/i }),
  ).toBeInTheDocument();
  // before a choice there is no area label (and no plans page yet)
  expect(screen.queryByText(/^AREA:/)).not.toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("button", { name: /oncor electric delivery/i }),
  );
  await screen.findByText("Oncor Plan");
  expect(screen.getByText("ZIPCODE: 75067")).toBeInTheDocument();
  expect(screen.getByText("AREA: Oncor")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
});

test("area Change re-opens the picker in place, keeping ZIP, usage and filters; Cancel closes it", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /oncor electric delivery/i }),
  );
  await screen.findByText("Oncor Plan");

  fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
    target: { value: "750" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /7–12 months/i }));

  fireEvent.click(screen.getByRole("button", { name: "Change utility area" }));
  expect(areaPicker()).toBeInTheDocument();
  // nothing was reset, and the current plans stay on screen
  expect(screen.getByText("ZIPCODE: 75067")).toBeInTheDocument();
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(750);
  expect(screen.getByRole("checkbox", { name: /7–12 months/i })).toBeChecked();
  expect(screen.getByText("Oncor Plan")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.getByText("AREA: Oncor")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Change utility area" }));
  fireEvent.click(screen.getByRole("button", { name: "TNMP" }));
  expect(await screen.findByText("TNMP Plan")).toBeInTheDocument();
  expect(screen.getByText("AREA: TNMP")).toBeInTheDocument();
  expect(areaPicker()).not.toBeInTheDocument();
  expect(screen.getByText("ZIPCODE: 75067")).toBeInTheDocument();
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(750);
  expect(screen.getByRole("checkbox", { name: /7–12 months/i })).toBeChecked();
});

test("first load for a split ZIP defaults usage to 1000 kWh, same as a single-area ZIP", async () => {
  stubSplitZips();
  const { unmount } = render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /oncor electric delivery/i }),
  );
  await screen.findByText("Oncor Plan");
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(1000);
  unmount();

  render(<App />);
  submitZip("75201");
  await screen.findByText("Oncor Plan");
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(1000);
});

test("the area label stays after a failed lookup of another ZIP", async () => {
  stubSplitZips();
  render(<App />);
  submitZip("75067");
  fireEvent.click(
    await screen.findByRole("button", { name: /oncor electric delivery/i }),
  );
  await screen.findByText("Oncor Plan");

  changeZip("99999");
  expect(
    await screen.findByText(/no texas utility area found for zip/i),
  ).toBeInTheDocument();
  expect(screen.getByText("AREA: Oncor")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Change utility area" }));
  expect(areaPicker()).toBeInTheDocument();
});
