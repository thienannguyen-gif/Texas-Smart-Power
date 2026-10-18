import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanCard } from "./PlanCard";
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
  renewableDescription: "6% renewable",
  prepaid: false,
  companyLogo: null,
  website: null,
  goToPlanUrl: null,
  factSheetUrl: null,
  termsUrl: null,
  enrollPhone: null,
};

const plan = (over: Partial<Plan> = {}): Plan => ({ ...base, ...over });

describe("PlanCard", () => {
  it("shows the plan name, company and the three headline stats", () => {
    render(<PlanCard plan={plan()} />);
    expect(
      screen.getByRole("heading", { name: "Steady 12" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example Energy")).toBeInTheDocument();
    expect(screen.getByText("13.9¢/kWh")).toBeInTheDocument(); // 0.139 * 100, 1dp
    expect(screen.getByText("$139")).toBeInTheDocument(); // 0.139 * 1000 kWh
    expect(screen.getByText("12 mos")).toBeInTheDocument();
    expect(screen.getByText("6% renewable")).toBeInTheDocument();
  });

  it("shows an em dash for missing term / price / bill / renewable", () => {
    render(
      <PlanCard
        plan={plan({
          termMonths: null,
          renewableDescription: null,
          pricePerKwh: { at500: null, at1000: null, at2000: null },
        })}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(4);
  });

  it("uses the logo (with company alt) instead of the company text when present", () => {
    render(
      <PlanCard plan={plan({ companyLogo: "https://example.com/l.png" })} />,
    );
    expect(
      screen.getByRole("img", { name: "Example Energy" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Example Energy")).not.toBeInTheDocument();
  });

  it("never shows a fabricated rating", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.getByLabelText(/not rated yet/i)).toBeInTheDocument();
  });

  it("fires onMoreDetails from the button, and hides it without a handler", () => {
    const onMoreDetails = vi.fn();
    const { rerender } = render(
      <PlanCard plan={plan()} onMoreDetails={onMoreDetails} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /more details/i }));
    expect(onMoreDetails).toHaveBeenCalledOnce();

    rerender(<PlanCard plan={plan()} />);
    expect(
      screen.queryByRole("button", { name: /more details/i }),
    ).not.toBeInTheDocument();
  });

  it("prices at the given usage using an anchor or interpolated value", () => {
    const { rerender } = render(<PlanCard plan={plan()} usageKwh={500} />);
    expect(screen.getByText("at 500 kWh")).toBeInTheDocument();
    expect(screen.getByText("15.1¢/kWh")).toBeInTheDocument(); // 0.151 -> anchor
    expect(screen.getByText("$76")).toBeInTheDocument(); // 0.151 * 500 = 75.5

    rerender(<PlanCard plan={plan()} usageKwh={1500} />);
    expect(screen.getByText("at 1,500 kWh")).toBeInTheDocument();
    expect(screen.getByText("14.2¢/kWh")).toBeInTheDocument();
    expect(screen.getByText("$213")).toBeInTheDocument(); // 0.142 * 1500
  });

  it("has no hide-provider action", () => {
    render(<PlanCard plan={plan()} />);
    expect(
      screen.queryByRole("button", { name: /hide .*provider/i }),
    ).not.toBeInTheDocument();
  });
});
