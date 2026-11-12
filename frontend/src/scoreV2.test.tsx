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
const cardNames = () =>
  screen
    .getAllByRole("article")
    .map((a) => within(a).getByRole("heading").textContent);

afterEach(() => vi.unstubAllGlobals());

describe("score v2: one ranked list", () => {
  it("is a single list ordered by score, not by bill: the 12-month plan beats a cheaper 3-month one", async () => {
    mount();
    await screen.findByText("Twelve Mid");
    // bills: Cheap Three $90 (S_cost 10, S_term 2.5), Twelve Mid $100 (S_cost
    // 9.09, S_term 10); the 12-month plan's flexibility outweighs $10
    expect(cardNames()).toEqual([
      "Twelve Mid",
      "Cheap Three",
      "Twelve Dear",
      "Thirty-six Dear",
    ]);
  });

  it("has no short/long switch, no sort control and no score on the page", async () => {
    mount();
    await screen.findByText("Twelve Mid");
    expect(
      screen.queryByRole("button", { name: /12 months and longer/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /under 12 months/i }),
    ).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/score/i)).toBeNull();
    expect(screen.getByText("4 plans")).toBeInTheDocument();
  });

  it("shows the estimated bill as the largest figure on the row, with term, fee and renewable %", async () => {
    mount();
    const card = (await screen.findByText("Thirty-six Dear")).closest(
      "article",
    )!;
    const bill = within(card).getByText("$200.00");
    expect(bill).toHaveClass("text-3xl");
    expect(within(card).getByText("/ mo")).toBeInTheDocument();
    expect(
      within(card).getByText("estimated bill at 1,000 kWh"),
    ).toBeInTheDocument();
    expect(within(card).getByText("36 mos")).toBeInTheDocument();
    expect(within(card).getByText("$300")).toBeInTheDocument();
    expect(within(card).getByText("100%")).toBeInTheDocument();
  });

  it("re-ranks when the usage changes", async () => {
    const steep = mk(0.1, {
      id: 1,
      planName: "Steep",
      pricePerKwh: { at500: 0.2, at1000: 0.1, at2000: 0.1 },
    });
    const flat = mk(0.12, { id: 2, planName: "Flat" });
    mount({ ...data, planCount: 2, plans: [steep, flat] });
    await screen.findByText("Steep");
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
    await screen.findByText("Twelve Mid");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /100% renewable only/i }),
    );
    expect(cardNames()).toEqual(["Thirty-six Dear"]);
    expect(screen.getByText("Showing 1 of 4 plans")).toBeInTheDocument();
  });
});
