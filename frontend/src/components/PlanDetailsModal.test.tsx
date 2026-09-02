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

  it("shows all three price tiers in ¢/kWh", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(screen.getByText("15.1¢")).toBeInTheDocument();
    expect(screen.getByText("13.9¢")).toBeInTheDocument();
    expect(screen.getByText("14.5¢")).toBeInTheDocument();
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

  it("marks the rule-dependent fields as not available yet", () => {
    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    // MONTHLY, AVG PRICE, CANCELLATION FEE — three placeholders
    expect(screen.getAllByText(/not available yet/i)).toHaveLength(3);
  });

  it("labels the monthly-cost row with the current usage", () => {
    const { rerender } = render(
      <PlanDetailsModal plan={plan()} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/monthly for 1,000 kWh/i)).toBeInTheDocument();

    rerender(
      <PlanDetailsModal plan={plan()} onClose={vi.fn()} usageKwh={1500} />,
    );
    expect(screen.getByText(/monthly for 1,500 kWh/i)).toBeInTheDocument();
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
