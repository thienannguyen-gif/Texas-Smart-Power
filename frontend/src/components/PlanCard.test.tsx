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
const article = () => screen.getByRole("article");

describe("PlanCard row", () => {
  it("shows the plan name, the provider and the four values: bill, rate, term, renewable", () => {
    render(<PlanCard plan={plan()} />);
    expect(
      screen.getByRole("heading", { name: "Steady 12" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example Energy")).toBeInTheDocument();
    expect(screen.getByText("$139")).toBeInTheDocument(); // 0.139 * 1000 kWh
    expect(screen.getByText("13.9¢")).toBeInTheDocument(); // 0.139 * 100, 1dp
    expect(screen.getByText("12 mo")).toBeInTheDocument();
    expect(screen.getByText("6%")).toBeInTheDocument();
  });

  it("names each value for screen readers and on a phone (wide screens use the column header)", () => {
    render(<PlanCard plan={plan()} />);
    for (const label of ["Est. bill", "Rate / kWh", "Term", "Renewable"]) {
      expect(screen.getByText(label)).toHaveClass("md:sr-only");
    }
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

  it("shows the provider as a plain name: no logo image that could break", () => {
    render(
      <PlanCard
        plan={plan({ companyLogo: "https://example.com/blocked.png" })}
      />,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Example Energy")).toBeInTheDocument();
  });

  it("has no star rating: there is no rating data behind one", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.queryByLabelText(/not rated yet/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("★");
  });

  it("fires onMoreDetails from the chevron button, and hides it without a handler", () => {
    const onMoreDetails = vi.fn();
    const { rerender } = render(
      <PlanCard plan={plan()} onMoreDetails={onMoreDetails} />,
    );
    const button = screen.getByRole("button", { name: /more details/i });
    expect(button).toHaveAccessibleName("More details: Steady 12");
    fireEvent.click(button);
    expect(onMoreDetails).toHaveBeenCalledOnce();

    rerender(<PlanCard plan={plan()} />);
    expect(
      screen.queryByRole("button", { name: /more details/i }),
    ).not.toBeInTheDocument();
  });

  it("prices at the given usage using an anchor or interpolated value", () => {
    const { rerender } = render(<PlanCard plan={plan()} usageKwh={500} />);
    expect(screen.getByText("15.1¢")).toBeInTheDocument(); // 0.151 -> anchor
    expect(screen.getByText("$76")).toBeInTheDocument(); // 0.151 * 500 = 75.5

    rerender(<PlanCard plan={plan()} usageKwh={1500} />);
    expect(screen.getByText("14.2¢")).toBeInTheDocument();
    expect(screen.getByText("$213")).toBeInTheDocument(); // 0.142 * 1500
  });

  it("shows a 100% renewable plan's figure in green, and a lower one plainly", () => {
    const { rerender } = render(
      <PlanCard plan={plan({ renewableDescription: "100% Renewable" })} />,
    );
    expect(screen.getByText("100%")).toHaveClass("text-brand-green");
    rerender(
      <PlanCard plan={plan({ renewableDescription: "22% Renewable" })} />,
    );
    expect(screen.getByText("22%")).not.toHaveClass("text-brand-green");
  });

  it("has no hide-provider action", () => {
    render(<PlanCard plan={plan()} />);
    expect(
      screen.queryByRole("button", { name: /hide .*provider/i }),
    ).not.toBeInTheDocument();
  });
});

describe("PlanCard marks", () => {
  it("marks the best match with a badge and a green bar on its left edge", () => {
    const stable = plan({
      pricePerKwh: { at500: 0.13, at1000: 0.12, at2000: 0.11 },
    });
    const { rerender } = render(<PlanCard plan={stable} bestMatch />);
    expect(screen.getByText("Best match")).toBeInTheDocument();
    expect(article()).toHaveClass("border-l-4", "border-l-brand-green");

    rerender(<PlanCard plan={stable} />);
    expect(screen.queryByText("Best match")).not.toBeInTheDocument();
    expect(article()).not.toHaveClass("border-l-4");
  });

  it("badges exactly-12-month plans as a 12-month lock, and no other term", () => {
    const { rerender } = render(<PlanCard plan={plan({ termMonths: 12 })} />);
    expect(screen.getByText("12-month lock")).toBeInTheDocument();
    for (const termMonths of [3, 11, 13, 24, null]) {
      rerender(<PlanCard plan={plan({ termMonths })} />);
      expect(screen.queryByText("12-month lock")).not.toBeInTheDocument();
    }
  });
});

describe("PlanCard price-curve warning", () => {
  it("shows an Unstable price badge and an amber bar for a V-Trap or a Hump, and neither for a stable curve", () => {
    const { rerender } = render(
      <PlanCard
        plan={plan({ pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 } })}
      />,
    );
    expect(screen.getByText(/unstable price/i)).toBeInTheDocument();
    expect(article()).toHaveClass("border-l-brand-amber");

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
    expect(article()).not.toHaveClass("border-l-brand-amber");
  });

  it("the best-match bar wins over the amber one when a plan is both", () => {
    render(
      <PlanCard
        bestMatch
        plan={plan({ pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 } })}
      />,
    );
    expect(article()).toHaveClass("border-l-brand-green");
    expect(article()).not.toHaveClass("border-l-brand-amber");
    expect(screen.getByText(/unstable price/i)).toBeInTheDocument();
  });
});

describe("PlanCard for an unranked time-of-use plan", () => {
  it("is marked unranked and calls its price a reference rate", () => {
    render(<PlanCard plan={plan({ isTimeOfUse: true })} unranked />);
    expect(screen.getByText(/unranked · time-of-use/i)).toBeInTheDocument();
    expect(screen.getByText("Ref. rate / kWh")).toBeInTheDocument();
    expect(screen.getByText("Est. bill (ref.)")).toBeInTheDocument();
    expect(screen.queryByText("Rate / kWh")).not.toBeInTheDocument();
  });

  it("an ordinary card has none of that", () => {
    render(<PlanCard plan={plan()} />);
    expect(screen.queryByText(/unranked/i)).not.toBeInTheDocument();
    expect(screen.getByText("Rate / kWh")).toBeInTheDocument();
    expect(screen.getByText("Est. bill")).toBeInTheDocument();
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
