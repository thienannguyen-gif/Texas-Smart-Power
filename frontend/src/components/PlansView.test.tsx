import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PlansView } from "./PlansView";
import type { Plan, TduDataFile } from "../types/plan";

const mk = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.16, at1000: 0.15, at2000: 0.155 },
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
    ...over,
  }) as Plan;

const file: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 2,
  plans: [
    mk({ id: 1, planName: "Gexa 12", companyName: "Gexa" }),
    mk({ id: 2, planName: "APGE 12", companyName: "APGE", prepaid: true }),
  ],
};

afterEach(() => vi.unstubAllGlobals());

function mockPlans(data: TduDataFile = file) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
  );
}

// 14 plans -> 3 pages of 6 / 6 / 2. "Alpha" owns plans 1-6, "Beta" owns 7-14.
const many: TduDataFile = {
  ...file,
  planCount: 14,
  plans: Array.from({ length: 14 }, (_, i) =>
    mk({
      id: i + 1,
      planName: `Plan ${i + 1}`,
      companyName: i < 6 ? "Alpha" : "Beta",
    }),
  ),
};

test("starts at 1,000 kWh and re-prices cards when the usage box changes", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);

  expect(await screen.findAllByText("at 1,000 kWh")).toHaveLength(2);
  const box = screen.getByLabelText(/monthly usage in kWh/i);
  expect(box).toHaveValue(1000);
  expect(
    screen.queryByRole("button", { name: /your usage/i }),
  ).not.toBeInTheDocument();

  fireEvent.change(box, { target: { value: "500" } });
  expect(await screen.findAllByText("at 500 kWh")).toHaveLength(2);
  expect(screen.getAllByText("16.0¢/kWh")).toHaveLength(2); // 0.16 anchor

  fireEvent.change(box, { target: { value: "9999" } });
  fireEvent.blur(box);
  expect(box).toHaveValue(4000); // clamped
});

// Type into the provider box, then click the matching suggestion.
function pickProvider(typed: string, name: string) {
  fireEvent.change(screen.getByRole("combobox", { name: /search providers/i }), {
    target: { value: typed },
  });
  fireEvent.mouseDown(screen.getByRole("option", { name }));
}

test("provider autocomplete filters the list; Show All restores it", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
  await screen.findByText("Gexa 12");

  pickProvider("gex", "Gexa");

  expect(screen.getByText("Gexa 12")).toBeInTheDocument();
  expect(screen.queryByText("APGE 12")).not.toBeInTheDocument();
  expect(screen.getByText(/showing 1 of 2 plans/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /show all/i }));
  expect(screen.getByText("APGE 12")).toBeInTheDocument();
});

test("a filter that matches nothing shows the empty-filter message", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
  await screen.findByText("Gexa 12");

  // both sample plans have no renewable info
  fireEvent.change(screen.getByLabelText(/minimum renewable percentage/i), {
    target: { value: "50" },
  });
  expect(screen.getByText(/no plans match these filters/i)).toBeInTheDocument();
});

function renderMany() {
  mockPlans(many);
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
}

const next = () => screen.getByRole("button", { name: /next/i });
const prev = () => screen.getByRole("button", { name: /previous/i });

test("shows 6 plans per page with the page position below", async () => {
  renderMany();
  expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(6);
  expect(screen.getByText("Plan 1")).toBeInTheDocument();
  expect(screen.getByText("Plan 6")).toBeInTheDocument();
  expect(screen.queryByText("Plan 7")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
  expect(screen.getByText("Plan 12")).toBeInTheDocument();
  expect(screen.queryByText("Plan 6")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2); // 14 = 6 + 6 + 2
  expect(screen.getByText("Plan 14")).toBeInTheDocument();
});

test("Previous is disabled on page 1, Next on the last page", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  expect(prev()).toBeDisabled();
  expect(next()).toBeEnabled();

  fireEvent.click(next());
  expect(prev()).toBeEnabled();
  expect(next()).toBeEnabled();

  fireEvent.click(next());
  expect(next()).toBeDisabled();

  fireEvent.click(prev());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

test("exactly 6 plans is one page with both buttons disabled", async () => {
  mockPlans({ ...many, planCount: 6, plans: many.plans.slice(0, 6) });
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
  expect(await screen.findByText("Page 1 of 1")).toBeInTheDocument();
  expect(prev()).toBeDisabled();
  expect(next()).toBeDisabled();
});

test("left/right arrow keys change page and stop at the ends", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.keyDown(document.body, { key: "ArrowLeft" });
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: "ArrowLeft" });
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

test("arrow keys typed in the usage box or slider do not change the page", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.keyDown(screen.getByLabelText(/monthly usage in kWh/i), {
    key: "ArrowRight",
  });
  fireEvent.keyDown(screen.getByLabelText(/minimum renewable percentage/i), {
    key: "ArrowRight",
  });
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

test("a filter change goes back to page 1", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  fireEvent.click(next());
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

  // Beta has 8 plans -> 2 pages.
  pickProvider("bet", "Beta");
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
});

test("a usage change keeps the same page number", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
    target: { value: "500" },
  });
  expect(screen.getAllByText("at 500 kWh")).toHaveLength(6);
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
});

test("product type offers only Fixed and 100% Renewable", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
  await screen.findByText("Gexa 12");
  expect(screen.getByRole("checkbox", { name: /fixed/i })).toBeInTheDocument();
  expect(
    screen.getByRole("checkbox", { name: /100% renewable/i }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/variable/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/prepaid/i)).not.toBeInTheDocument();
});

test("'Hide this provider' removes that provider and adds a removable excluded chip", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next()); // page 2, to prove the reset to page 1
  fireEvent.click(
    screen.getAllByRole("button", { name: /hide this provider: beta/i })[0],
  );

  // Beta (plans 7-14) is gone; Alpha's six plans remain on one page
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(6);
  expect(screen.queryByText("Plan 7")).not.toBeInTheDocument();
  expect(screen.getByText("hidden")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Show Beta again" }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.queryByText("hidden")).not.toBeInTheDocument();
});

test("hiding a selected provider removes it from the selected chips, and vice versa", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  pickProvider("alp", "Alpha");
  expect(screen.getByRole("button", { name: "Remove Alpha" })).toBeVisible();

  fireEvent.click(
    screen.getAllByRole("button", { name: /hide this provider: alpha/i })[0],
  );
  expect(
    screen.queryByRole("button", { name: "Remove Alpha" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show Alpha again" })).toBeVisible();

  // selecting it again takes it out of the excluded chips
  pickProvider("alp", "Alpha");
  expect(
    screen.queryByRole("button", { name: "Show Alpha again" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove Alpha" })).toBeVisible();
});

test("Show All clears excluded providers too", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(
    screen.getAllByRole("button", { name: /hide this provider: alpha/i })[0],
  );
  expect(screen.getByText("hidden")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /show all/i }));
  expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

test("suggestions only come from providers in the loaded area", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.change(screen.getByRole("combobox", { name: /search providers/i }), {
    target: { value: "a" },
  });
  const names = screen.getAllByRole("option").map((o) => o.textContent);
  expect(names.sort()).toEqual(["Alpha", "Beta"]);
});
