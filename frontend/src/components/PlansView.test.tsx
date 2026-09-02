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

function mockPlans() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => file })),
  );
}

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
  expect(screen.getAllByText("16.00¢")).toHaveLength(2); // 0.16 anchor

  fireEvent.change(box, { target: { value: "9999" } });
  fireEvent.blur(box);
  expect(box).toHaveValue(4000); // clamped
});

test("provider checkbox filters the list; Show All restores it", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onChangeZip={() => {}} />);
  await screen.findByText("Gexa 12");

  fireEvent.click(screen.getByRole("checkbox", { name: "Gexa" }));

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
