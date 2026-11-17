import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlansView } from "./components/PlansView";
import type { Plan, TduDataFile } from "./types/plan";

// The list tests read the order of the list; a plan picked for Our picks is not
// repeated in it, so the picks are off by default (computeAwards returns no
// pick) and switched on for the tests about them.
const realAwards = vi.hoisted(() => ({ on: false }));
vi.mock("./lib/awards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/awards")>();
  return {
    ...actual,
    computeAwards: (...args: Parameters<typeof actual.computeAwards>) =>
      realAwards.on ? actual.computeAwards(...args) : [],
  };
});

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

// The four plans of the main fixture are all 12
// months. At 1,000 kWh a flat rate gives a bill of rate x 1,000. By hand, with
// flat rates CE is proportional to the rate, so S_cost = 10 (0.20 - rate) / 0.11:
//   Cheap Big Fee  $90   S_cost 10     fee $300 -> S_fee 0   S_flex 5    green 1
//   Twelve Mid     $100  S_cost 9.09   fee $0   -> S_fee 10  S_flex 10   green 1
//   Twelve Dear    $120  S_cost 7.27   fee $0                S_flex 10   green 1
//   Green Dear     $200  S_cost 0      fee $300              S_flex 5    green 10
// score x 12 = 8 S_cost + 3 S_flex + S_green:
//   Twelve Mid 72.73 + 30 + 1 = 103.7,  Cheap Big Fee 80 + 15 + 1 = 96,
//   Twelve Dear 58.18 + 30 + 1 = 89.2,  Green Dear 0 + 15 + 10 = 25.
const data: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 4,
  plans: [
    mk(0.09, {
      id: 1,
      planName: "Cheap Big Fee",
      pricingDetails: "Cancellation fee: $300.",
    }),
    mk(0.1, { id: 2, planName: "Twelve Mid" }),
    mk(0.2, {
      id: 3,
      planName: "Green Dear",
      pricingDetails: "Cancellation fee: $300.",
      renewableDescription: "100% Renewable",
    }),
    mk(0.12, { id: 4, planName: "Twelve Dear" }),
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

// written for 1,000 kWh, so start from it by way of the address
beforeEach(() => window.history.replaceState(null, "", "/?usage=1000"));
afterEach(() => {
  realAwards.on = false;
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("score v2 in the list", () => {
  it("opens on Lowest total cost: the cheapest contract first", async () => {
    mount();
    await ready();
    expect(
      screen.getByRole("radio", { name: "Lowest total cost" }),
    ).toBeChecked();
    expect(cardNames()).toEqual([
      "Cheap Big Fee",
      "Twelve Mid",
      "Twelve Dear",
      "Green Dear",
    ]);
  });

  it("Best match follows the score, not the bill: a $0 fee outweighs $10 a month", async () => {
    mount();
    await ready();
    fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
    expect(cardNames()).toEqual([
      "Twelve Mid",
      "Cheap Big Fee",
      "Twelve Dear",
      "Green Dear",
    ]);
  });

  it("every length is in the list at first, and a ticked length narrows it", async () => {
    const withShort: TduDataFile = {
      ...data,
      planCount: 5,
      plans: [
        ...data.plans,
        mk(0.08, { id: 5, planName: "Cheapest Three", termMonths: 3 }),
      ],
    };
    mount(withShort);
    await ready();
    // nothing is ticked, so the 3-month plan is there; by the monthly bill ($80) it is first
    expect(
      screen.getByText("5 plans from Power to Choose"),
    ).toBeInTheDocument();
    expect(cardNames()[0]).toBe("Cheapest Three");
    fireEvent.click(screen.getByRole("checkbox", { name: /^12 months/ }));
    expect(cardNames()).not.toContain("Cheapest Three");
    expect(screen.getByText("Showing 4 of 5 plans")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /^12 months/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^1–6 months/ }));
    expect(cardNames()).toEqual(["Cheapest Three"]);
  });

  it("keeps Our picks: Best overall is the top-scored 12-month plan, Lowest bill the cheapest", async () => {
    realAwards.on = true;
    mount();
    await ready();
    expect(screen.getByText("Our picks for you")).toBeInTheDocument();
    expect(screen.getByText("Best overall")).toBeInTheDocument();
    // the pick is still called "Lowest bill"; the sort option is "Lowest total cost"
    expect(screen.getAllByText("Lowest bill")).toHaveLength(1);
    expect(
      screen.getByRole("radio", { name: "Lowest total cost" }),
    ).toBeInTheDocument();
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
    const box = screen.getByLabelText(/monthly usage in kWh/i);
    fireEvent.change(box, { target: { value: "500" } });
    fireEvent.blur(box); // applies at once; typing alone waits 250 ms
    expect(cardNames()).toEqual(["Flat", "Steep"]);
  });

  it("recomputes the score over the plans left after a filter", async () => {
    mount();
    await ready();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /100% renewable only/i }),
    );
    expect(cardNames()).toEqual(["Green Dear"]);
    expect(screen.getByText("Showing 1 of 4 plans")).toBeInTheDocument();
  });

  it("a plan shown in Our picks is not repeated in the list below; the count still includes it", async () => {
    realAwards.on = true;
    mount();
    await ready();
    const picks = within(screen.getByRole("region", { name: "Our picks" }))
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label")!.split(" by ")[0]);
    // Lowest bill: Cheap Big Fee ($90); Best overall: Twelve Mid (top score, 12 months)
    expect(picks.sort()).toEqual(["Cheap Big Fee", "Twelve Mid"]);
    expect(cardNames()).toEqual(["Twelve Dear", "Green Dear"]);
    // the list below the picks is headed "All other plans", after Our picks
    const other = screen.getByRole("heading", { name: "All other plans" });
    expect(
      screen
        .getByRole("heading", { name: "Our picks for you" })
        .compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText("4 plans from Power to Choose"),
    ).toBeInTheDocument();
  });
});
