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

// Worked by hand from r500 = 15.1c, r1000 = 13.9c, r2000 = 14.5c:
//   C500 = 5 x 15.1 = $75.50   C1000 = 10 x 13.9 = $139.00   C2000 = 20 x 14.5 = $290.00
//   m1 = (139.00 - 75.50) / 500 = 0.127   m2 = (290.00 - 139.00) / 1000 = 0.151

describe("PlanCard", () => {
  it("shows the plan name, the facts as chips, the rate and the monthly bill", () => {
    render(<PlanCard plan={plan()} usageKwh={1000} />);
    expect(
      screen.getByRole("heading", { name: "Steady 12" }),
    ).toBeInTheDocument();
    expect(screen.getByText("12-month term")).toBeInTheDocument();
    expect(screen.getByText("6% renewable")).toBeInTheDocument();
    expect(screen.getByText("$150 cancellation fee")).toBeInTheDocument();
    expect(screen.getByText("13.9¢/kWh")).toBeInTheDocument(); // 139 / 1000
    expect(screen.getByText("$139")).toBeInTheDocument(); // C(1000)
    expect(screen.getByText("/mo")).toBeInTheDocument();
  });

  it("keeps the company name for a screen reader", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.getByText("Example Energy")).toBeInTheDocument();
  });

  it("says 'Not listed' for a missing fee or renewable %, and a dash for a missing price; no term chip without a term", () => {
    render(
      <PlanCard
        plan={plan({
          termMonths: null,
          renewableDescription: null,
          pricingDetails: null,
          pricePerKwh: { at500: null, at1000: null, at2000: null },
        })}
      />,
    );
    expect(screen.getByText("Renewable: Not listed")).toBeInTheDocument();
    expect(
      screen.getByText("Cancellation fee: Not listed"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/-month term/)).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2); // rate and bill
    expect(screen.queryByText("0% renewable")).not.toBeInTheDocument();
    expect(screen.queryByText("$0 cancellation fee")).not.toBeInTheDocument();
  });

  it("a $0 fee says 'No cancellation fee'; an unreadable one never does", () => {
    const { rerender } = render(
      <PlanCard plan={plan({ pricingDetails: "Cancellation fee: $0" })} />,
    );
    expect(screen.getByText("No cancellation fee")).toBeInTheDocument();
    rerender(
      <PlanCard plan={plan({ pricingDetails: "See the fact sheet" })} />,
    );
    expect(screen.queryByText("No cancellation fee")).not.toBeInTheDocument();
    expect(
      screen.getByText("Cancellation fee: Not listed"),
    ).toBeInTheDocument();
  });

  it("prices at the given usage from the exact bill, in every segment", () => {
    const { rerender } = render(<PlanCard plan={plan()} usageKwh={500} />);
    // C500 = $75.50 -> "$76"; rate 75.50 / 500 = 15.1 cents
    expect(screen.getByText("15.1¢/kWh")).toBeInTheDocument();
    expect(screen.getByText("$76")).toBeInTheDocument();

    // C(1500) = 139.00 + 0.151 x (1500 - 1000) = $214.50 -> "$215"; rate = 214.50 / 1500 = 14.3 cents
    rerender(<PlanCard plan={plan()} usageKwh={1500} />);
    expect(screen.getByText("14.3¢/kWh")).toBeInTheDocument();
    expect(screen.getByText("$215")).toBeInTheDocument();

    // C(300) = max(0, 75.50 - 0.127 x 200) = $50.10; rate = 50.10 / 300 = 16.7 cents
    rerender(<PlanCard plan={plan()} usageKwh={300} />);
    expect(screen.getByText("16.7¢/kWh")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();

    // C(3000) = 290.00 + 0.151 x 1000 = $441.00; rate = 441 / 3000 = 14.7 cents
    rerender(<PlanCard plan={plan()} usageKwh={3000} />);
    expect(screen.getByText("14.7¢/kWh")).toBeInTheDocument();
    expect(screen.getByText("$441")).toBeInTheDocument();
  });

  it("shows only the monthly bill: no total, no short-contract warning, no 'More details' button", () => {
    render(
      <PlanCard
        plan={plan({ termMonths: 3 })}
        usageKwh={1000}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText("$139")).toBeInTheDocument(); // not 3 x 139
    expect(screen.queryByText(/over \d+ months?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ends in/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /more details/i }),
    ).not.toBeInTheDocument();
  });

  it("carries no badge: no price warning, no existing-customers mark, no 'unranked' label", () => {
    render(
      <PlanCard
        plan={plan({
          pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
          newCustomer: false,
          isTimeOfUse: true,
        })}
      />,
    );
    expect(screen.queryByText(/unstable price/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Open to existing customers"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/unranked/i)).not.toBeInTheDocument();
  });
});

describe("PlanCard opens the details", () => {
  it("a click on the card calls onOpen", () => {
    const onOpen = vi.fn();
    render(<PlanCard plan={plan()} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("article"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("Enter and Space on the focused card open it; other keys do not", () => {
    const onOpen = vi.fn();
    render(<PlanCard plan={plan()} onOpen={onOpen} />);
    const card = screen.getByRole("article");
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    expect(onOpen).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(card, { key: "a" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("is a plain card, not focusable, without a handler", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.getByRole("article")).not.toHaveAttribute("tabindex");
  });
});

describe("PlanCard provider mark", () => {
  it("shows the logo (decorative, empty alt) while it loads fine", () => {
    const { container } = render(
      <PlanCard plan={plan({ companyLogo: "https://example.com/l.png" })} />,
    );
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://example.com/l.png");
    expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByTestId("provider-initials")).not.toBeInTheDocument();
  });

  it("swaps a logo that fails to load for the provider's initials, leaving no broken image", () => {
    const { container } = render(
      <PlanCard
        plan={plan({ companyLogo: "https://example.com/blocked.png" })}
      />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("provider-initials")).toHaveTextContent("EE");
  });

  it("uses the same initials when the plan has no logo at all", () => {
    render(<PlanCard plan={plan({ companyLogo: null })} />);
    expect(screen.getByTestId("provider-initials")).toHaveTextContent("EE");
  });
});
