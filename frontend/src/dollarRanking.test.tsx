import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlansView } from "./components/PlansView";
import type { Plan, TduDataFile } from "./types/plan";

const mk = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
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

const flat = (rate: number, over: Partial<Plan>) =>
  mk({ pricePerKwh: { at500: rate, at1000: rate, at2000: rate }, ...over });

// Stored in an order that is NOT the order the page should show
const data: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 6,
  plans: [
    flat(0.12, { id: 1, planName: "Twelve Dear", termMonths: 12 }),
    flat(0.09, {
      id: 2,
      planName: "Thirty-six Cheap",
      termMonths: 36,
      pricingDetails: "Cancellation fee: $300.",
      renewableDescription: "100% Renewable",
    }),
    flat(0.1, { id: 3, planName: "Twenty-four Mid", termMonths: 24 }),
    flat(0.08, { id: 4, planName: "Three Cheap", termMonths: 3 }),
    flat(0.13, { id: 5, planName: "Six Dear", termMonths: 6 }),
    flat(0.07, { id: 6, planName: "Two Cheapest", termMonths: 2 }),
  ],
};

function mount(file: TduDataFile = data) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => file })),
  );
  return render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

const names = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
// the card headings only: the sidebar's section headings are level 3 too
const cardNames = () =>
  screen
    .getAllByRole("article")
    .map((a) => within(a).getByRole("heading").textContent);

beforeEach(() => {
  // a fixed "today": July, so the months covered are known
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 6, 15));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("dollar ranking: two lists", () => {
  it("opens on the long list and never shows both lists, or one combined list", async () => {
    mount();
    await screen.findByText("Thirty-six Cheap");
    // 12 months and longer only, cheapest per month first
    expect(cardNames()).toEqual([
      "Thirty-six Cheap",
      "Twenty-four Mid",
      "Twelve Dear",
    ]);
    expect(screen.queryByText("Three Cheap")).not.toBeInTheDocument();
    expect(screen.queryByText("Six Dear")).not.toBeInTheDocument();
    expect(names().length).toBeGreaterThan(0);
  });

  it("switches to the short list, sorted by per-month cost, with the counts on the buttons", async () => {
    mount();
    await screen.findByText("Thirty-six Cheap");
    const long = screen.getByRole("button", { name: /^12 months and longer/ });
    const short = screen.getByRole("button", { name: /^under 12 months/i });
    expect(long).toHaveTextContent("12 months and longer (3)");
    expect(short).toHaveTextContent("Under 12 months (3)");
    expect(long).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(short);
    expect(short).toHaveAttribute("aria-pressed", "true");
    expect(long).toHaveAttribute("aria-pressed", "false");
    expect(cardNames()).toEqual(["Two Cheapest", "Three Cheap", "Six Dear"]);
    expect(screen.queryByText("Thirty-six Cheap")).not.toBeInTheDocument();

    fireEvent.click(long);
    expect(cardNames()[0]).toBe("Thirty-six Cheap");
  });

  it("sorts by per-month cost, not by total: a 36-month plan has the biggest total and still comes first", async () => {
    mount();
    const card = (await screen.findByText("Thirty-six Cheap")).closest(
      "article",
    )!;
    expect(cardNames()[0]).toBe("Thirty-six Cheap");
    expect(within(card).getByText(/over 36 months/)).toBeInTheDocument();
  });

  it("goes back to page 1 when the list is switched", async () => {
    const many: TduDataFile = {
      ...data,
      plans: [
        ...Array.from({ length: 14 }, (_, i) =>
          flat(0.1 + i / 1000, {
            id: i + 1,
            planName: `Long ${i + 1}`,
            termMonths: 12,
          }),
        ),
        ...Array.from({ length: 8 }, (_, i) =>
          flat(0.1 + i / 1000, {
            id: 20 + i,
            planName: `Short ${i + 1}`,
            termMonths: 3,
          }),
        ),
      ],
    };
    mount(many);
    await screen.findByText("Page 1 of 3");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^under 12 months/i }));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Short 1")).toBeInTheDocument();
  });

  it("does not let a term that is not a whole year win through the calendar: signed in November, an 18-month plan 0.5% dearer than a 12-month one stays below it", async () => {
    vi.setSystemTime(new Date(2026, 10, 15)); // November: an 18-month plan picks up six cheap months
    mount({
      ...data,
      plans: [
        flat(0.1005, { id: 1, planName: "Eighteen", termMonths: 18 }),
        flat(0.1, { id: 2, planName: "Twelve", termMonths: 12 }),
      ],
    });
    await screen.findByText("Twelve");
    expect(cardNames()).toEqual(["Twelve", "Eighteen"]);
    // the real term and the real total of the 18-month plan are still shown
    const card = screen.getByText("Eighteen").closest("article")!;
    expect(within(card).getByText(/over 18 months$/)).toBeInTheDocument();
    expect(within(card).getByText("18 mos")).toBeInTheDocument();
  });
});

describe("dollar ranking: what a row shows", () => {
  it("shows per month, the total over the term, the months, the worst month, term, fee and renewable %", async () => {
    mount();
    const card = (await screen.findByText("Thirty-six Cheap")).closest(
      "article",
    )!;
    // a flat 9c rate at 1,000 kWh a month: $90 x the average seasonal factor
    expect(within(card).getByText(/^\$90\.\d\d$/)).toBeInTheDocument();
    expect(within(card).getByText("/ mo")).toBeInTheDocument();
    expect(
      within(card).getByText(/^\$3,2\d\d\.\d\d over 36 months$/),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/^Months covered: Jul to Jun, 36 months$/),
    ).toBeInTheDocument();
    // the worst month is August (factor 1.4298): 90 x 1.4298 = 128.68
    expect(
      within(card).getByText("Most expensive month about $128.68"),
    ).toBeInTheDocument();
    // a flat rate: 20% more or less usage is 20% of the bill, about $18
    expect(
      within(card).getByText(
        /^20% more usage: \+\$1\d\/mo · 20% less: -\$1\d\/mo$/,
      ),
    ).toBeInTheDocument();
    expect(
      within(card).getByText("average of the first 12 months"),
    ).toBeInTheDocument();
    expect(within(card).getByText("36 mos")).toBeInTheDocument();
    expect(within(card).getByText("$300")).toBeInTheDocument();
    expect(within(card).getByText("100%")).toBeInTheDocument();
  });

  it("names the months of a short contract, from the current month", async () => {
    mount();
    await screen.findByText("Thirty-six Cheap");
    fireEvent.click(screen.getByRole("button", { name: /^under 12 months/i }));
    const card = screen.getByText("Three Cheap").closest("article")!;
    // today is in July: a 3-month contract covers Jul, Aug, Sep
    expect(
      within(card).getByText("Months covered: Jul, Aug, Sep"),
    ).toBeInTheDocument();
    expect(within(card).getByText(/over 3 months$/)).toBeInTheDocument();
    expect(within(card).getByText("3 mos")).toBeInTheDocument();
  });

  it("shows no 0-10 score and no award cards anywhere", async () => {
    mount();
    await screen.findByText("Thirty-six Cheap");
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/our picks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best match/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("SORT BY")).not.toBeInTheDocument();
  });

  it("says in one line what the ranking is and which month it starts in", async () => {
    mount();
    expect(await screen.findByText(/starting in Jul\./)).toBeInTheDocument();
    expect(screen.getByText(/at 1,000 kWh a month/)).toBeInTheDocument();
  });
});

describe("dollar ranking: renewable is a filter, not a score", () => {
  it("'100% renewable only' narrows the list and changes no price", async () => {
    mount();
    await screen.findByText("Thirty-six Cheap");
    fireEvent.click(
      screen.getByRole("checkbox", { name: /100% renewable only/i }),
    );
    expect(cardNames()).toEqual(["Thirty-six Cheap"]);
    expect(screen.getByText("Showing 1 of 3 plans")).toBeInTheDocument();
  });
});
