import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { PlansView } from "./components/PlansView";
import { UsageInput, USAGE_DEBOUNCE_MS } from "./components/UsageInput";
import type { Plan, TduDataFile } from "./types/plan";

const mk = (id: number, rate: number): Plan =>
  ({
    id,
    planName: `Plan ${id}`,
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
  }) as Plan;

const data: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 3,
  plans: [mk(1, 0.1), mk(2, 0.12), mk(3, 0.14)],
};

function mount(file: TduDataFile = data) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => file })),
  );
  return render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

const box = () => screen.getByLabelText(/monthly usage in kWh/i);
const preset = (name: RegExp) => screen.getByRole("button", { name });
// which of the three home types is pressed (the page has other toggles too)
const pressed = () =>
  ["Apartment", "Small home", "Large home"].filter(
    (name) =>
      preset(new RegExp(`^${name}`)).getAttribute("aria-pressed") === "true",
  );
const typeIn = (value: string) =>
  fireEvent.change(box(), { target: { value } });
const typeAndLeave = (value: string) => {
  typeIn(value);
  fireEvent.blur(box());
};

beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("usage block: what it shows", () => {
  it("has the label, the hint, three real buttons, the box with 'per month' and the helper", async () => {
    mount();
    await screen.findAllByRole("article");
    expect(screen.getByText("Your usage")).toBeInTheDocument();
    expect(
      screen.getByText("Not sure? Start from your home type."),
    ).toBeInTheDocument();
    for (const name of [/^Apartment/, /^Small home/, /^Large home/]) {
      const b = preset(name);
      expect(b.tagName).toBe("BUTTON");
      expect(b).toHaveAttribute("type", "button");
    }
    expect(preset(/^Apartment/)).toHaveTextContent("850");
    expect(preset(/^Small home/)).toHaveTextContent("1,150");
    expect(preset(/^Large home/)).toHaveTextContent("1,450");
    expect(
      within(screen.getByRole("region", { name: "Your usage" })).getByText(
        "per month",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Use your 12-month average if you have it; a summer bill runs high.",
      ),
    ).toBeInTheDocument();
  });

  it("starts at 1,150 with Small home pressed and nothing else", async () => {
    mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveValue("1,150");
    expect(pressed()).toEqual(["Small home"]);
    expect(screen.queryByText("Your number")).toBeNull();
    // the plans are ranked and listed already: nobody has to type first
    expect(screen.getByText("3 plans at 1,150 kWh")).toBeInTheDocument();
  });

  it("is a labelled number box, with no slider and no band names anywhere", async () => {
    mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveAttribute("inputmode", "numeric");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(
      screen.queryByText(/efficient|average home|power user|heavy user/i),
    ).toBeNull();
  });
});

describe("usage block: buttons and typing", () => {
  it("a button writes its kWh into the box and is the only one pressed", async () => {
    mount();
    await screen.findAllByRole("article");
    fireEvent.click(preset(/^Large home/));
    expect(box()).toHaveValue("1,450");
    expect(pressed()).toEqual(["Large home"]);
    expect(screen.getByText("3 plans at 1,450 kWh")).toBeInTheDocument();
    fireEvent.click(preset(/^Apartment/));
    expect(box()).toHaveValue("850");
    expect(pressed()).toEqual(["Apartment"]);
  });

  it("a number of one's own switches every button off and says 'Your number'", async () => {
    mount();
    await screen.findAllByRole("article");
    typeIn("1680");
    expect(pressed()).toEqual([]);
    expect(screen.getByText("Your number")).toBeInTheDocument();
    for (const name of [/^Apartment/, /^Small home/, /^Large home/]) {
      expect(preset(name)).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("typing exactly a preset's number lights that button again and drops the label", async () => {
    mount();
    await screen.findAllByRole("article");
    typeIn("1680");
    typeIn("1450");
    expect(pressed()).toEqual(["Large home"]);
    expect(screen.queryByText("Your number")).toBeNull();
  });

  it("does not format while typing, only on blur; 1,680 is accepted too", async () => {
    mount();
    await screen.findAllByRole("article");
    typeIn("1680");
    expect(box()).toHaveValue("1680");
    fireEvent.blur(box());
    expect(box()).toHaveValue("1,680");
    typeAndLeave("2,100");
    expect(box()).toHaveValue("2,100");
    expect(screen.getByText("3 plans at 2,100 kWh")).toBeInTheDocument();
  });
});

describe("usage block: out-of-range and empty input", () => {
  it("below 100 is raised to 100 on blur, with a note", async () => {
    mount();
    await screen.findAllByRole("article");
    typeIn("50");
    // not blocked while typing
    expect(box()).toHaveValue("50");
    expect(screen.queryByText(/we price plans between/i)).toBeNull();
    fireEvent.blur(box());
    expect(box()).toHaveValue("100");
    expect(
      screen.getByText("We price plans between 100 and 5,000 kWh."),
    ).toBeInTheDocument();
    expect(screen.getByText("3 plans at 100 kWh")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("above 5,000 is cut to 5,000 on blur, with the note", async () => {
    mount();
    await screen.findAllByRole("article");
    typeAndLeave("99999");
    expect(box()).toHaveValue("5,000");
    expect(
      screen.getByText("We price plans between 100 and 5,000 kWh."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("an empty box, or text that is not a number, goes back to the last good value", async () => {
    mount();
    await screen.findAllByRole("article");
    typeAndLeave("1680");
    typeAndLeave("");
    expect(box()).toHaveValue("1,680");
    typeAndLeave("abc");
    expect(box()).toHaveValue("1,680");
    expect(screen.getByText("3 plans at 1,680 kWh")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("the note goes away on the next edit", async () => {
    mount();
    await screen.findAllByRole("article");
    typeAndLeave("99999");
    expect(screen.getByText(/we price plans between/i)).toBeInTheDocument();
    typeIn("1200");
    expect(screen.queryByText(/we price plans between/i)).toBeNull();
  });
});

describe("usage block: re-ranking is debounced", () => {
  it("applies the typed number only after typing pauses for 250 ms", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<UsageInput value={1150} onChange={onChange} />);
    typeIn("1680");
    act(() => {
      vi.advanceTimersByTime(USAGE_DEBOUNCE_MS - 1);
    });
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1680);
    expect(USAGE_DEBOUNCE_MS).toBe(250);
  });

  it("keeps only the last of several quick keystrokes, and a button applies at once", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<UsageInput value={1150} onChange={onChange} />);
    typeIn("1");
    typeIn("16");
    typeIn("168");
    typeIn("1680");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1680);
    fireEvent.click(preset(/^Apartment/));
    expect(onChange).toHaveBeenLastCalledWith(850);
  });
});

describe("usage block: the address", () => {
  it("opens at the usage in the address, with no button lit when it is no preset's number", async () => {
    window.history.replaceState(null, "", "/?zip=79424&usage=1680");
    mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveValue("1,680");
    expect(pressed()).toEqual([]);
    expect(screen.getByText("Your number")).toBeInTheDocument();
  });

  it("a zip with no usage means 1,150 with Small home lit", async () => {
    window.history.replaceState(null, "", "/?zip=79424");
    mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveValue("1,150");
    expect(pressed()).toEqual(["Small home"]);
  });

  it("an out-of-range usage in the address is clamped, a junk one means the default", async () => {
    window.history.replaceState(null, "", "/?usage=99999");
    const first = mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveValue("5,000");
    first.unmount();
    window.history.replaceState(null, "", "/?usage=abc");
    mount();
    await screen.findAllByRole("article");
    expect(box()).toHaveValue("1,150");
  });

  it("writes usage with replaceState (Back is not filled), keeps zip, and drops it at the default", async () => {
    window.history.replaceState(null, "", "/?zip=79424");
    const before = window.history.length;
    const push = vi.spyOn(window.history, "pushState");
    mount();
    await screen.findAllByRole("article");
    typeAndLeave("1680");
    expect(window.location.search).toBe("?zip=79424&usage=1680");
    fireEvent.click(preset(/^Apartment/));
    expect(window.location.search).toBe("?zip=79424&usage=850");
    fireEvent.click(preset(/^Small home/));
    expect(window.location.search).toBe("?zip=79424");
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(before);
    push.mockRestore();
  });

  it("does not add a zip to the address when there was none", async () => {
    mount();
    await screen.findAllByRole("article");
    typeAndLeave("1680");
    expect(window.location.search).toBe("?usage=1680");
  });
});

describe("usage block: when it exists", () => {
  it("is not in the page at all before a ZIP has been looked up", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);
    expect(screen.queryByRole("region", { name: "Your usage" })).toBeNull();
    expect(screen.queryByLabelText(/monthly usage in kWh/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Small home/ })).toBeNull();
  });
});
