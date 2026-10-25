import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OurPicks } from "./components/OurPicks";
import { PlansView } from "./components/PlansView";
import { computeAwards } from "./lib/awards";
import type { Plan, TduDataFile } from "./types/plan";

const mk = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Energy",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.14, at1000: 0.12, at2000: 0.11 },
    pricingDetails: null,
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

afterEach(() => vi.restoreAllMocks());

const open = vi.fn();
function renderPicks(plans: Plan[], usage = 1000) {
  return render(
    <OurPicks
      picks={computeAwards(plans, usage)}
      usageKwh={usage}
      onOpen={open}
    />,
  );
}

describe("OurPicks cards", () => {
  it("shows the header with the usage, formatted en-US with a comma", () => {
    renderPicks([mk({ id: 1 })], 2334);
    expect(screen.getByText("Our picks")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Picked from these plans, at 2,334 kWh. Tap one for details.",
      ),
    ).toBeInTheDocument();
  });

  it("writes the usage with a comma even on a machine whose locale uses a dot", () => {
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, "toLocaleString").mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return original.call(this, locales ?? "de-DE", options);
    });
    renderPicks([mk({ id: 1 })], 2334);
    expect(document.body.textContent).toContain("2,334 kWh");
    expect(document.body.textContent).not.toContain("2.334");
  });

  it("is a keyboard-reachable button that opens the plan on click, Enter and Space", () => {
    open.mockClear();
    renderPicks([mk({ id: 7, planName: "Seven" })]);
    const card = screen.getByRole("button", { name: /Seven by Sample Energy/ });
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    fireEvent.keyDown(card, { key: "a" });
    expect(open).toHaveBeenCalledTimes(3);
    expect(open.mock.calls[0][0].id).toBe(7);
  });

  it("shows both award chips on one card for a plan that wins both, never two cards", () => {
    renderPicks([mk({ id: 1, planName: "Double" })]);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Best overall")).toBeInTheDocument();
    expect(screen.getByText("Lowest bill")).toBeInTheDocument();
    expect(screen.queryByText(/green/i)).toBeNull();
  });

  it("shows term, renewable and cancellation chips, with the 100% one in green", () => {
    renderPicks([
      mk({
        id: 1,
        termMonths: 3,
        renewableDescription: "100% Renewable",
        pricingDetails: "Cancellation fee: $300.",
      }),
    ]);
    expect(screen.getByText("3-month term")).toBeInTheDocument();
    expect(screen.getByText("100% renewable")).toHaveClass(
      "bg-brand-soft",
      "text-brand",
    );
    expect(screen.getByText("$300 cancellation fee")).toHaveClass(
      "bg-surface-alt",
    );
    expect(screen.queryByText(/\/mo fee/)).toBeNull();
  });

  it("says 'No cancellation fee' only for a parsed $0 fee, and nothing when the fee is unreadable", () => {
    const { unmount } = renderPicks([
      mk({ id: 1, pricingDetails: "Cancellation fee: $0" }),
    ]);
    expect(screen.getByText("No cancellation fee")).toBeInTheDocument();
    unmount();
    renderPicks([mk({ id: 1, pricingDetails: "See the fact sheet" })]);
    expect(screen.queryByText(/cancellation fee/i)).toBeNull();
  });

  it("shows the rate on the left and the bill, in ink, as the big figure with /mo", () => {
    renderPicks([mk({ id: 1 })]);
    expect(screen.getByText("12.0¢/kWh")).toHaveClass(
      "text-ink",
      "font-semibold",
    );
    const bill = screen.getByText("$120");
    expect(bill).toHaveClass("text-[22px]", "text-ink");
    expect(bill.className).not.toMatch(/warn|brand/);
    expect(screen.getByText("/mo")).toHaveClass(
      "text-[11px]",
      "text-ink-faint",
    );
  });

  it("falls back to initials in a brand-soft circle when the logo fails; the logo has empty alt", () => {
    const { container } = renderPicks([
      mk({
        id: 1,
        companyName: "GEXA ENERGY",
        companyLogo: "https://example.com/x.png",
      }),
    ]);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    const initials = screen.getByTestId("provider-initials");
    expect(initials).toHaveTextContent("GE");
    expect(initials).toHaveClass("bg-brand-soft", "text-brand");
  });

  it("lays two cards out as two equal columns from 760px, and one card as the full width", () => {
    const { container, unmount } = renderPicks([
      mk({ id: 1, planName: "Twelve" }),
      mk({
        id: 2,
        planName: "Cheap",
        pricePerKwh: { at500: 0.1, at1000: 0.08, at2000: 0.07 },
        termMonths: 24,
      }),
    ]);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    const grid = container.querySelector(".grid")!;
    expect(grid).toHaveClass("grid-cols-1", "min-[760px]:grid-cols-2");
    unmount();

    const single = renderPicks([mk({ id: 1 })]);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(single.container.querySelector(".grid")).toHaveClass(
      "min-[760px]:grid-cols-1",
    );
    expect(single.container.querySelector(".grid")).not.toHaveClass(
      "min-[760px]:grid-cols-2",
    );
  });

  it("renders nothing, not an empty card, when there are no picks", () => {
    const { container } = render(
      <OurPicks picks={[]} usageKwh={1000} onOpen={open} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("OurPicks in the page", () => {
  const data: TduDataFile = {
    tdu: "oncor",
    generatedAt: "2026-09-02T00:00:00.000Z",
    planCount: 8,
    plans: Array.from({ length: 8 }, (_, i) =>
      mk({
        id: i + 1,
        planName: `Plan ${i + 1}`,
        termMonths: i === 0 ? 24 : 12,
        // Plan 2 has an unstable curve: it must not win although it ranks 2nd
        pricePerKwh:
          i === 1
            ? { at500: 0.1, at1000: 0.09, at2000: 0.11 }
            : {
                at500: 0.14,
                at1000: 0.12 - i * 0.001,
                at2000: 0.11 - i * 0.001,
              },
        renewableDescription: i === 3 ? "100% Renewable" : "10% renewable",
      }),
    ),
  };

  function mount() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
    );
    return render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  }

  afterEach(() => vi.unstubAllGlobals());

  it("sits above the plan list on page 1, picks from the ranked list, and opens the details modal", async () => {
    mount();
    const picks = await screen.findByRole("region", { name: "Our picks" });
    const list = screen.getByRole("region", { name: "Plans" });
    expect(
      picks.compareDocumentPosition(list.querySelector("article")!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const cards = within(picks).getAllByRole("button");
    // Best overall = the best-scored 12-month plan: Plan 1 ranks first but is a
    // 24-month plan, and Plan 2 is 12 months but has an unstable curve, so Plan 3
    expect(within(cards[0]).getByText("Plan 3")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Best overall")).toBeInTheDocument();
    expect(within(picks).queryByText("Plan 1")).toBeNull();
    expect(within(picks).queryByText("Plan 2")).toBeNull();
    expect(within(picks).getByText("Lowest bill")).toBeInTheDocument();
    expect(within(picks).queryByText(/green/i)).toBeNull();
    expect(within(picks).queryByText("Cheapest 12-month")).toBeNull();

    fireEvent.click(cards[0]);
    expect(screen.getByRole("dialog", { name: /plan 3/i })).toBeInTheDocument();
  });

  it("follows the usage in its header", async () => {
    mount();
    const picks = await screen.findByRole("region", { name: "Our picks" });
    expect(within(picks).getByText(/at 1,000 kWh/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
      target: { value: "2334" },
    });
    expect(within(picks).getByText(/at 2,334 kWh/)).toBeInTheDocument();
  });

  it("appears on page 1 only", async () => {
    mount();
    await screen.findByRole("region", { name: "Our picks" });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.queryByRole("region", { name: "Our picks" })).toBeNull();
  });
});
