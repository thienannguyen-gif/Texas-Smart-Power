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
        plan={plan({
          pricePerKwh: { at500: 1.14, at1000: 1.14, at2000: 1.14 },
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("$1,140")).toBeInTheDocument();
  });

  it("says 'not available' when a required anchor rate is missing", () => {
    render(
      <PlanDetailsModal
        plan={plan({
          pricePerKwh: { at500: 0.151, at1000: null, at2000: 0.145 },
        })}
        onClose={vi.fn()}
        usageKwh={850}
      />,
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

  it("lists the YRAC link below Terms of Service only when the plan has one", () => {
    const { unmount } = render(
      <PlanDetailsModal
        plan={plan({ yracUrl: "https://example.com/yrac.pdf" })}
        onClose={vi.fn()}
      />,
    );
    const links = screen.getAllByRole("link").map((l) => l.textContent);
    expect(links).toEqual([
      "Electricity Facts Label (EFL)",
      "Terms of Service",
      "Your Rights as a Customer",
    ]);
    expect(
      screen.getByRole("link", { name: "Your Rights as a Customer" }),
    ).toHaveAttribute("href", "https://example.com/yrac.pdf");
    unmount();

    for (const yracUrl of [null, undefined, ""]) {
      const { unmount: again } = render(
        <PlanDetailsModal plan={plan({ yracUrl })} onClose={vi.fn()} />,
      );
      expect(
        screen.queryByRole("link", { name: /your rights/i }),
      ).not.toBeInTheDocument();
      again();
    }
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

describe("PlanDetailsModal price-curve warning", () => {
  it("explains an unstable price curve in plain text, and says nothing for a stable one", () => {
    const { unmount } = render(
      <PlanDetailsModal
        plan={plan({ pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 } })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/unstable price/i)).toBeInTheDocument();
    expect(
      screen.getByText(/can backfire if your usage changes/i),
    ).toBeVisible();
    unmount();

    render(
      <PlanDetailsModal
        plan={plan({
          pricePerKwh: { at500: 0.13, at1000: 0.12, at2000: 0.11 },
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/unstable price/i)).not.toBeInTheDocument();
  });
});

describe("PlanDetailsModal for a time-of-use plan", () => {
  it("says it is not ranked and that the price is a reference rate", () => {
    const { unmount } = render(
      <PlanDetailsModal plan={plan({ isTimeOfUse: true })} onClose={vi.fn()} />,
    );
    expect(screen.getByText(/time-of-use plan, not ranked/i)).toBeVisible();
    expect(screen.getByText(/flat reference rate/i)).toBeVisible();
    unmount();

    render(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(screen.queryByText(/not ranked/i)).not.toBeInTheDocument();
  });
});

describe("PlanDetailsModal eligibility line", () => {
  it("says new customers only, naming the provider, when new_customer is true", () => {
    render(
      <PlanDetailsModal plan={plan({ newCustomer: true })} onClose={vi.fn()} />,
    );
    const line = screen.getByText(/new customers only/i).closest("p")!;
    expect(line).toHaveTextContent(
      "Eligibility: New customers only — if you're already with Example Energy, you may not qualify for this rate.",
    );
    expect(line).toBeVisible();
  });

  it("has no eligibility line when the plan is open to existing customers, or unknown", () => {
    const { rerender } = render(
      <PlanDetailsModal
        plan={plan({ newCustomer: false })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/eligibility/i)).not.toBeInTheDocument();

    rerender(
      <PlanDetailsModal plan={plan({ newCustomer: null })} onClose={vi.fn()} />,
    );
    expect(screen.queryByText(/eligibility/i)).not.toBeInTheDocument();

    rerender(<PlanDetailsModal plan={plan()} onClose={vi.fn()} />);
    expect(screen.queryByText(/eligibility/i)).not.toBeInTheDocument();
  });
});

describe("PlanDetailsModal Sign up button", () => {
  const signUp = () => screen.queryByRole("link", { name: /^sign up/i });

  it("links to the plan's own sign-up page, with the phone number beside it", () => {
    render(
      <PlanDetailsModal
        plan={plan({
          goToPlanUrl: "https://example.com/enroll?plan=1",
          website: "https://example.com/",
          enrollPhone: "(800) 805-6580",
        })}
        onClose={vi.fn()}
      />,
    );
    const link = signUp()!;
    expect(link).toHaveAttribute("href", "https://example.com/enroll?plan=1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAccessibleName(
      "Sign up with Example Energy (opens in a new tab)",
    );
    expect(link).toHaveClass("bg-brand-green", "text-white"); // the primary button

    const phone = screen.getByRole("link", { name: "or call (800) 805-6580" });
    expect(phone).toHaveAttribute("href", "tel:8008056580");
    // beside it: the same row
    expect(link.parentElement).toContainElement(phone);
  });

  it("falls back to the provider's website when the plan has no sign-up page", () => {
    render(
      <PlanDetailsModal
        plan={plan({ goToPlanUrl: null, website: "https://provider.example/" })}
        onClose={vi.fn()}
      />,
    );
    expect(signUp()).toHaveAttribute("href", "https://provider.example/");
  });

  it("has no button when neither address exists, but still offers the phone", () => {
    const { rerender } = render(
      <PlanDetailsModal
        plan={plan({ goToPlanUrl: null, website: null, enrollPhone: null })}
        onClose={vi.fn()}
      />,
    );
    expect(signUp()).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /call/i }),
    ).not.toBeInTheDocument();

    rerender(
      <PlanDetailsModal
        plan={plan({
          goToPlanUrl: null,
          website: null,
          enrollPhone: "800-555-0100",
        })}
        onClose={vi.fn()}
      />,
    );
    expect(signUp()).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Call 800-555-0100" }),
    ).toHaveAttribute("href", "tel:800-555-0100".replace(/-/g, ""));
  });

  it("only ever links to a web address: a javascript: or garbled one is ignored, and the next one is tried", () => {
    const { rerender } = render(
      <PlanDetailsModal
        plan={plan({
          goToPlanUrl: "javascript:alert(1)",
          website: "https://safe.example/",
        })}
        onClose={vi.fn()}
      />,
    );
    expect(signUp()).toHaveAttribute("href", "https://safe.example/");

    rerender(
      <PlanDetailsModal
        plan={plan({ goToPlanUrl: "not a url", website: "data:text/html,x" })}
        onClose={vi.fn()}
      />,
    );
    expect(signUp()).not.toBeInTheDocument();
  });
});
