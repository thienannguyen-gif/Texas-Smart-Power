import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlansView } from "./components/PlansView";
import type { Plan, TduDataFile } from "./types/plan";

const mk = (rate: number, over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: rate, at1000: rate, at2000: rate },
    pricingDetails: "Cancellation fee: $0.",
    isTimeOfUse: false,
    renewableDescription: "10% renewable",
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

// At 1,000 kWh a flat rate gives a bill of rate x 1,000.
const data: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 4,
  plans: [
    mk(0.09, { id: 1, planName: "Cheap Three", termMonths: 3 }),
    mk(0.1, { id: 2, planName: "Twelve Mid", termMonths: 12 }),
    mk(0.2, {
      id: 3,
      planName: "Thirty-six Dear",
      termMonths: 36,
      pricingDetails: "Cancellation fee: $300.",
      renewableDescription: "100% Renewable",
    }),
    mk(0.12, { id: 4, planName: "Twelve Dear", termMonths: 12 }),
  ],
};

function mount(file: TduDataFile = data) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => file })),
  );
  return render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}
// The Our picks cards repeat plan names, so the list is read from the plan cards
// (articles), and the picks are checked on their own.
const cardNames = () =>
  screen
    .getAllByRole("article")
    .map((a) => within(a).getByRole("heading").textContent);
const ready = () => screen.findAllByRole("article");

afterEach(() => vi.unstubAllGlobals());

describe("score v2 in the list", () => {
  it("Best match follows the score, not the bill: the 12-month plan beats a cheaper 3-month one", async () => {
    mount();
    await ready();
    // bills: Cheap Three $90 (S_cost 10, S_term 2.5), Twelve Mid $100 (S_cost
    // 9.09, S_term 10); the 12-month plan's flexibility outweighs $10
    expect(screen.getByRole("radio", { name: /^Best match/ })).toBeChecked();
    expect(cardNames()).toEqual([
      "Twelve Mid",
      "Cheap Three",
      "Twelve Dear",
      "Thirty-six Dear",
    ]);
  });

  it("keeps the sort control: Lowest bill puts the cheapest first", async () => {
    mount();
    await ready();
    fireEvent.click(screen.getByRole("radio", { name: "Lowest bill" }));
    expect(cardNames()).toEqual([
      "Cheap Three",
      "Twelve Mid",
      "Twelve Dear",
      "Thirty-six Dear",
    ]);
  });

  it("keeps Our picks: Best overall is the top-scored 12-month plan, Lowest bill the cheapest", async () => {
    mount();
    await ready();
    expect(screen.getByText("Our picks")).toBeInTheDocument();
    expect(screen.getByText("Best overall")).toBeInTheDocument();
    // the sort option and the pick both say "Lowest bill"
    expect(screen.getAllByText("Lowest bill").length).toBeGreaterThanOrEqual(2);
  });

  it("re-ranks when the usage changes", async () => {
    const steep = mk(0.1, {
      id: 1,
      planName: "Steep",
      pricePerKwh: { at500: 0.2, at1000: 0.1, at2000: 0.1 },
    });
    const flat = mk(0.12, { id: 2, planName: "Flat" });
    mount({ ...data, planCount: 2, plans: [steep, flat] });
    await ready();
    // 1,000 kWh: $100 against $120 -> Steep
    expect(cardNames()).toEqual(["Steep", "Flat"]);
    // 500 kWh: $100 against $60 -> Flat
    fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
      target: { value: "500" },
    });
    expect(cardNames()).toEqual(["Flat", "Steep"]);
  });

  it("recomputes the score over the plans left after a filter", async () => {
    mount();
    await ready();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /100% renewable only/i }),
    );
    expect(cardNames()).toEqual(["Thirty-six Dear"]);
    expect(screen.getByText("Showing 1 of 4 plans")).toBeInTheDocument();
  });
});
