import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanDetailsModal } from "./PlanDetailsModal";
import type { Plan } from "../types/plan";

const base: Plan = {
  id: 1,
  planName: "Steady 12",
  companyName: "Example Energy",
  termMonths: 12,
  rateType: "Fixed",
  pricePerKwh: { at500: 0.151, at1000: 0.139, at2000: 0.145 },
  pricingDetails: "Cancellation fee $150.",
  isTimeOfUse: false,
  renewableDescription: "100%",
  prepaid: false,
  companyLogo: null,
  website: null,
  goToPlanUrl: null,
  factSheetUrl: "https://example.com/efl.pdf",
  termsUrl: "https://example.com/tos.pdf",
  enrollPhone: null,
};

const plan = (over: Partial<Plan> = {}): Plan => ({ ...base, ...over });

describe("PlanDetailsModal", () => {
  it("renders as a labelled dialog with the plan name", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(
      screen.getByRole("dialog", { name: /steady 12/i }),
    ).toBeInTheDocument();
  });

  it("shows all three price tiers in ¢/kWh, never with a $ sign", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByText("15.1¢/kWh")).toBeInTheDocument();
    // 13.9¢ is both the 1,000 kWh tier and the AVG PRICE at the default usage
    expect(screen.getAllByText("13.9¢/kWh")).toHaveLength(2);
    expect(screen.getByText("14.5¢/kWh")).toBeInTheDocument();
    expect(screen.queryByText(/\$\d+\.\d+\/kWh/)).not.toBeInTheDocument();
  });

  it("shows real plan length / type / renewable", () => {
    render(
      <PlanDetailsModal
        plan={plan({ isTimeOfUse: true, prepaid: true })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("12 months")).toBeInTheDocument();
    expect(
      screen.getByText("Fixed · Time-of-use · Prepaid"),
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows the bill, avg price and fee at the default 1,000 kWh", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByText("ESTIMATED MONTHLY BILL")).toBeInTheDocument();
    expect(screen.getByText("$139")).toBeInTheDocument(); // 0.139 x 1000
    expect(screen.getByText("at 1,000 kWh")).toBeInTheDocument();
    expect(screen.getByText("AVG PRICE PER kWh")).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument(); // fee from pricingDetails
    expect(screen.queryByText(/not available/i)).not.toBeInTheDocument();
  });

  it("updates the bill and the 'at X kWh' line with the usage", () => {
    const { rerender } = render(
      <PlanDetailsModal plan={plan()} onClose={vi.fn()} />,
    );
    rerender(
      <PlanDetailsModal plan={plan()} onClose={vi.fn()} usageKwh={2000} />,
    );
    expect(screen.getByText("$290")).toBeInTheDocument(); // 0.145 x 2000
    expect(screen.getByText("at 2,000 kWh")).toBeInTheDocument();
    expect(screen.getAllByText("14.5¢/kWh")).toHaveLength(2);
  });

  it("formats big bills with a comma", () => {
    render(
      <PlanDetailsModal
        plan={plan({ pricePerKwh: { at500: null, at1000: 1.14, at2000: null } })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("$1,140")).toBeInTheDocument();
  });

  it("says 'not available' only for usage with no price (no interpolation yet)", () => {
    render(
      <PlanDetailsModal plan={plan()} onClose={vi.fn()} usageKwh={850} />,
    );
    // bill + avg price; the fee is still known
    expect(screen.getAllByText("not available")).toHaveLength(2);
    expect(screen.getByText("$150")).toBeInTheDocument();
  });

  it("wires the cancellation fee into its box and drops the duplicate line", () => {
    render(
      <PlanDetailsModal
        plan={plan({
          pricingDetails: "Cancellation Fee: $300.00",
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("CANCELLATION FEE")).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.queryByText(/cancellation fee:/i)).not.toBeInTheDocument();
  });

  it("keeps the rest of the pricing text and says 'not available' when no fee is stated", () => {
    render(
      <PlanDetailsModal
        plan={plan({ pricingDetails: "Free nights 9pm–6am." })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Free nights 9pm–6am.")).toBeInTheDocument();
    expect(screen.getAllByText("not available")).toHaveLength(1);
  });

  it("links the EFL and Terms documents", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(
      screen.getByRole("link", { name: /electricity facts label/i }),
    ).toHaveAttribute("href", "https://example.com/efl.pdf");
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toBeInTheDocument();
  });

  it("closes on the close button, backdrop click and Escape", () => {
    const onClose = vi.fn();
    const { container } = render(
      <PlanDetailsModal plan={plan()} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    fireEvent.click(container.firstChild as Element); // backdrop
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
