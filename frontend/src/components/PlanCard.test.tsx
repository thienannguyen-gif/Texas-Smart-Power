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
    expect(screen.getByText("6%")).toBeInTheDocument();
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

  it("has no star rating: there is no rating data behind one", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.queryByLabelText(/not rated yet/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("★");
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

describe("PlanCard price-curve warning", () => {
  it("shows an Unstable price badge for a V-Trap or a Hump, and not for a stable curve", () => {
    const { rerender } = render(
      <PlanCard
        plan={plan({ pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 } })}
      />,
    );
    expect(screen.getByText(/unstable price/i)).toBeInTheDocument();

    rerender(
      <PlanCard
        plan={plan({ pricePerKwh: { at500: 0.1, at1000: 0.12, at2000: 0.11 } })}
      />,
    );
    expect(screen.getByText(/unstable price/i)).toBeInTheDocument();

    rerender(
      <PlanCard
        plan={plan({
          pricePerKwh: { at500: 0.13, at1000: 0.12, at2000: 0.11 },
        })}
      />,
    );
    expect(screen.queryByText(/unstable price/i)).not.toBeInTheDocument();
  });
});

describe("PlanCard for an unranked time-of-use plan", () => {
  it("is marked unranked and calls its price a reference rate", () => {
    render(<PlanCard plan={plan({ isTimeOfUse: true })} unranked />);
    expect(screen.getByText(/unranked · time-of-use/i)).toBeInTheDocument();
    expect(screen.getByText("Reference rate")).toBeInTheDocument();
    expect(screen.getByText("at reference rate")).toBeInTheDocument();
    expect(screen.queryByText("Price per kWh")).not.toBeInTheDocument();
  });

  it("an ordinary card has none of that", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.queryByText(/unranked/i)).not.toBeInTheDocument();
    expect(screen.getByText("Price per kWh")).toBeInTheDocument();
    expect(screen.getByText("per month")).toBeInTheDocument();
  });
});

describe("PlanCard customer-eligibility badge", () => {
  it("shows 'Open to existing customers' only when new_customer is false", () => {
    render(<PlanCard plan={plan({ newCustomer: false })} />);
    expect(screen.getByText("Open to existing customers")).toBeInTheDocument();
  });

  it("shows nothing for new-customer-only plans (nearly every plan), unknown, or old data", () => {
    const { rerender } = render(
      <PlanCard plan={plan({ newCustomer: true })} />,
    );
    expect(screen.queryByText(/existing customers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new customers/i)).not.toBeInTheDocument();

    rerender(<PlanCard plan={plan({ newCustomer: null })} />);
    expect(screen.queryByText(/existing customers/i)).not.toBeInTheDocument();

    rerender(<PlanCard plan={plan()} />); // stored before the field existed
    expect(screen.queryByText(/existing customers/i)).not.toBeInTheDocument();
  });
});

describe("PlanCard provider logo", () => {
  const withLogo = plan({
    companyName: "SMARTENERGY HOLDINGS LLC",
    companyLogo: "https://example.com/logo.svg",
  });

  it("shows the logo while it loads fine", () => {
    render(<PlanCard plan={withLogo} />);
    expect(
      screen.getByRole("img", { name: "SMARTENERGY HOLDINGS LLC" }),
    ).toHaveAttribute("src", "https://example.com/logo.svg");
    expect(screen.queryByText("SM")).not.toBeInTheDocument();
  });

  it("swaps a logo that fails to load for the provider's initials and name, with no broken image left", () => {
    render(<PlanCard plan={withLogo} />);
    fireEvent.error(
      screen.getByRole("img", { name: "SMARTENERGY HOLDINGS LLC" }),
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("SM")).toBeInTheDocument(); // initials in the circle
    expect(screen.getByText("SMARTENERGY HOLDINGS LLC")).toBeInTheDocument();
    expect(screen.getByText("SM")).toHaveClass("rounded-full");
  });

  it("uses the same initials-and-name look when the plan has no logo at all", () => {
    render(
      <PlanCard
        plan={plan({ companyName: "Gexa Energy", companyLogo: null })}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("GE")).toBeInTheDocument();
    expect(screen.getByText("Gexa Energy")).toBeInTheDocument();
  });
});

describe("PlanCard renewable cell", () => {
  it("shows the number alone, with the word only in the % Renewable label", () => {
    const { rerender } = render(<PlanCard plan={plan()} />);
    expect(screen.getByText("% Renewable")).toBeInTheDocument();
    expect(screen.getByText("6%")).toBeInTheDocument();
    expect(screen.queryByText(/6% renewable/i)).not.toBeInTheDocument();

    for (const [description, shown] of [
      ["100% Renewable", "100%"],
      ["15% Renewable", "15%"],
      ["6% renewable", "6%"],
    ]) {
      rerender(<PlanCard plan={plan({ renewableDescription: description })} />);
      expect(screen.getByText(shown)).toBeInTheDocument();
      expect(screen.getByText(shown).textContent).toBe(shown);
    }
  });

  it("is sage at 100% and muted below it, and a dash when unknown", () => {
    const { rerender } = render(
      <PlanCard plan={plan({ renewableDescription: "100% Renewable" })} />,
    );
    expect(screen.getByText("100%")).toHaveClass("text-sage");
    rerender(
      <PlanCard plan={plan({ renewableDescription: "15% Renewable" })} />,
    );
    expect(screen.getByText("15%")).toHaveClass("text-ink-faint");
    expect(screen.getByText("15%")).not.toHaveClass("text-sage");
    rerender(<PlanCard plan={plan({ renewableDescription: null })} />);
    expect(screen.getByText("—", { selector: "dd" })).toHaveClass(
      "text-ink-faint",
    );
  });
});
