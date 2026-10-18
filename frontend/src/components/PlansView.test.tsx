import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PlansView } from "./PlansView";
import type { Plan, TduDataFile } from "../types/plan";

const mk = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.16, at1000: 0.15, at2000: 0.155 },
    pricingDetails: null,
    isTimeOfUse: false,
    renewableDescription: null,
    prepaid: false,
    companyLogo: null,
    website: null,
    goToPlanUrl: null,
    factSheetUrl: null,
    termsUrl: null,
    enrollPhone: null,
    ...over,
  }) as Plan;

const file: TduDataFile = {
  tdu: "oncor",
  generatedAt: "2026-09-02T00:00:00.000Z",
  planCount: 2,
  plans: [
    mk({ id: 1, planName: "Gexa 12", companyName: "Gexa" }),
    mk({ id: 2, planName: "APGE 12", companyName: "APGE", prepaid: true }),
  ],
};

afterEach(() => vi.unstubAllGlobals());

function mockPlans(data: TduDataFile = file) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
  );
}

// 14 plans -> 3 pages of 6 / 6 / 2. "Alpha" owns plans 1-6, "Beta" owns 7-14.
const many: TduDataFile = {
  ...file,
  planCount: 14,
  plans: Array.from({ length: 14 }, (_, i) =>
    mk({
      id: i + 1,
      planName: `Plan ${i + 1}`,
      companyName: i < 6 ? "Alpha" : "Beta",
    }),
  ),
};

test("updates card and bill/average prices immediately when usage changes", async () => {
  mockPlans({
    ...file,
    planCount: 1,
    plans: [
      mk({
        id: 1,
        planName: "Interpolated Plan",
        companyName: "Example Co",
        pricePerKwh: { at500: 0.127, at1000: 0.123, at2000: 0.121 },
      }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);

  expect(await screen.findByText("at 1,000 kWh")).toBeInTheDocument();
  const card = screen.getByRole("article");
  expect(within(card).getByText("12.3¢/kWh")).toBeInTheDocument();
  const box = screen.getByLabelText(/monthly usage in kWh/i);
  expect(box).toHaveValue(1000);
  expect(
    screen.queryByRole("button", { name: /your usage/i }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /more details/i }));
  const dialog = screen.getByRole("dialog", { name: /interpolated plan/i });
  expect(within(dialog).getByText("$123")).toBeInTheDocument();
  expect(within(dialog).getAllByText("12.3¢/kWh")).toHaveLength(2);

  fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));
  fireEvent.change(box, { target: { value: "850" } });
  expect(within(card).getByText("at 850 kWh")).toBeInTheDocument();
  expect(within(card).getByText("12.4¢/kWh")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /more details/i }));
  const updatedDialog = screen.getByRole("dialog", {
    name: /interpolated plan/i,
  });
  expect(within(updatedDialog).getByText("at 850 kWh")).toBeInTheDocument();
  expect(within(updatedDialog).getByText("$106")).toBeInTheDocument();
  expect(within(updatedDialog).getByText("12.4¢/kWh")).toBeInTheDocument();

  fireEvent.click(
    within(updatedDialog).getByRole("button", { name: /close/i }),
  );
  fireEvent.change(box, { target: { value: "9999" } });
  fireEvent.blur(box);
  expect(box).toHaveValue(4000); // clamped
  expect(within(card).getByText("12.1¢/kWh")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /more details/i }));
  const cappedDialog = screen.getByRole("dialog", {
    name: /interpolated plan/i,
  });
  expect(within(cappedDialog).getByText("$484")).toBeInTheDocument();
  expect(within(cappedDialog).getAllByText("12.1¢/kWh")).toHaveLength(2);
});

// Type into the provider box, then click the matching suggestion.
function pickProvider(typed: string, name: string) {
  fireEvent.change(
    screen.getByRole("combobox", { name: /search providers/i }),
    {
      target: { value: typed },
    },
  );
  // suggestions read "Name (count)"
  fireEvent.mouseDown(
    screen.getByRole("option", {
      name: new RegExp("^" + name + " \\(\\d+\\)$"),
    }),
  );
}

test("provider autocomplete filters the list; removing the chip restores it", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Gexa 12");

  pickProvider("gex", "Gexa");

  expect(screen.getByText("Gexa 12")).toBeInTheDocument();
  expect(screen.queryByText("APGE 12")).not.toBeInTheDocument();
  expect(screen.getByText(/showing 1 of 2 plans/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove Gexa" }));
  expect(screen.getByText("APGE 12")).toBeInTheDocument();
});

test("a filter that matches nothing shows the empty-filter message", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Gexa 12");

  // both sample plans have no renewable info
  fireEvent.change(screen.getByLabelText(/minimum renewable percentage/i), {
    target: { value: "50" },
  });
  expect(screen.getByText(/no plans match these filters/i)).toBeInTheDocument();
});

function renderMany() {
  mockPlans(many);
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

const next = () => screen.getByRole("button", { name: /next/i });
const prev = () => screen.getByRole("button", { name: /previous/i });

test("shows 6 plans per page with the page position below", async () => {
  renderMany();
  expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(6);
  expect(screen.getByText("Plan 1")).toBeInTheDocument();
  expect(screen.getByText("Plan 6")).toBeInTheDocument();
  expect(screen.queryByText("Plan 7")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
  expect(screen.getByText("Plan 12")).toBeInTheDocument();
  expect(screen.queryByText("Plan 6")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2); // 14 = 6 + 6 + 2
  expect(screen.getByText("Plan 14")).toBeInTheDocument();
});

test("Previous is disabled on page 1, Next on the last page", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  expect(prev()).toBeDisabled();
  expect(next()).toBeEnabled();

  fireEvent.click(next());
  expect(prev()).toBeEnabled();
  expect(next()).toBeEnabled();

  fireEvent.click(next());
  expect(next()).toBeDisabled();

  fireEvent.click(prev());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

test("exactly 6 plans is one page with both buttons disabled", async () => {
  mockPlans({ ...many, planCount: 6, plans: many.plans.slice(0, 6) });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  expect(await screen.findByText("Page 1 of 1")).toBeInTheDocument();
  expect(prev()).toBeDisabled();
  expect(next()).toBeDisabled();
});

test("left/right arrow keys change page and stop at the ends", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.keyDown(document.body, { key: "ArrowLeft" });
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

  fireEvent.keyDown(document.body, { key: "ArrowLeft" });
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

test("arrow keys typed in the usage box or slider do not change the page", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.keyDown(screen.getByLabelText(/monthly usage in kWh/i), {
    key: "ArrowRight",
  });
  fireEvent.keyDown(screen.getByLabelText(/minimum renewable percentage/i), {
    key: "ArrowRight",
  });
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

test("a filter change goes back to page 1", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  fireEvent.click(next());
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

  // Beta has 8 plans -> 2 pages.
  pickProvider("bet", "Beta");
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
});

test("a usage change keeps the same page number", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
    target: { value: "500" },
  });
  expect(screen.getAllByText("at 500 kWh")).toHaveLength(6);
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 7")).toBeInTheDocument();
});

test("product type offers only Fixed (renewable is the slider's job)", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Gexa 12");
  expect(screen.getByRole("checkbox", { name: /fixed/i })).toBeInTheDocument();
  expect(
    screen.queryByRole("checkbox", { name: /100% renewable/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByLabelText(/minimum renewable percentage/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/variable/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/prepaid/i)).not.toBeInTheDocument();
});

test("plan cards have no hide-provider action; the sidebar has no Show All or hidden-provider chips, but provider search remains", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  expect(
    screen.queryByRole("button", { name: /hide .*provider/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /show all/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: /search providers/i }),
  ).toBeInTheDocument();

  pickProvider("alp", "Alpha");
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(screen.queryByText("hidden")).not.toBeInTheDocument();
});

test("a contract length with no plans in the area is disabled and says so", async () => {
  mockPlans(); // both sample plans are 12 months
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Gexa 12");
  expect(
    screen.getByRole("checkbox", { name: /month-to-month/i }),
  ).toBeDisabled();
  expect(
    screen.getByText(/month-to-month/i).closest("label"),
  ).toHaveTextContent("No plans available");
  expect(screen.getByRole("checkbox", { name: /7–12 months/i })).toBeEnabled();
});

test("month-to-month is selectable when the area has such a plan", async () => {
  mockPlans({
    ...file,
    plans: [mk({ id: 1, planName: "Flex 1", termMonths: 1 }), ...file.plans],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Flex 1");
  const box = screen.getByRole("checkbox", { name: /month-to-month/i });
  expect(box).toBeEnabled();
  fireEvent.click(box);
  expect(screen.getByText("Flex 1")).toBeInTheDocument();
  expect(screen.queryByText("Gexa 12")).not.toBeInTheDocument();
});

test("Change turns the ZIP into an input; submitting asks for the new ZIP and keeps usage and filters", async () => {
  mockPlans(many);
  const onSubmitZip = vi.fn();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={onSubmitZip} />);
  await screen.findByText("Page 1 of 3");
  fireEvent.change(screen.getByLabelText(/monthly usage in kWh/i), {
    target: { value: "750" },
  });
  pickProvider("bet", "Beta");

  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  const input = screen.getByLabelText("ZIP code");
  expect(input).toHaveValue("75201");
  fireEvent.change(input, { target: { value: "770" } });
  expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
  fireEvent.change(input, { target: { value: "77002" } });
  fireEvent.click(screen.getByRole("button", { name: "Update" }));

  expect(onSubmitZip).toHaveBeenCalledWith("77002");
  expect(screen.getByText("ZIPCODE: 75201")).toBeInTheDocument();
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue(750);
  expect(screen.getByRole("button", { name: "Remove Beta" })).toBeVisible();
});

test("Cancel leaves the ZIP alone", async () => {
  mockPlans();
  const onSubmitZip = vi.fn();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={onSubmitZip} />);
  await screen.findByText("Gexa 12");
  fireEvent.click(screen.getByRole("button", { name: "Change" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onSubmitZip).not.toHaveBeenCalled();
  expect(screen.getByText("ZIPCODE: 75201")).toBeInTheDocument();
});

test("suggestions only come from providers in the loaded area", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.change(
    screen.getByRole("combobox", { name: /search providers/i }),
    {
      target: { value: "a" },
    },
  );
  const names = screen
    .getAllByRole("option")
    .map((o) => o.textContent?.replace(/ \(\d+\)$/, ""));
  expect(names.sort()).toEqual(["Alpha", "Beta"]);
});

test("every option shows its match count, reflecting the other active filters; empty ones are greyed, not hidden", async () => {
  renderMany(); // Alpha: plans 1-6, Beta: plans 7-14, all 12 months, Fixed
  await screen.findByText("Page 1 of 3");

  const row = (name: RegExp) =>
    screen.getByRole("checkbox", { name }).closest("label")!;
  expect(row(/fixed/i)).toHaveTextContent("Fixed / Secured Rate (14)");
  expect(row(/7–12 months/i)).toHaveTextContent("7–12 months (14)");
  expect(row(/12\+ months/i)).toHaveTextContent("12+ months (0)");

  // choosing a provider narrows every count
  pickProvider("alp", "Alpha");
  expect(row(/fixed/i)).toHaveTextContent("Fixed / Secured Rate (6)");
  expect(row(/7–12 months/i)).toHaveTextContent("7–12 months (6)");

  // zero-match options stay on screen, greyed
  expect(row(/12\+ months/i)).toHaveTextContent("12+ months (0)");
  expect(row(/12\+ months/i)).toHaveClass("text-brand-navy/40");
  expect(screen.getByRole("checkbox", { name: /12\+ months/i })).toBeDisabled();

  // a contract length is counted against the provider, ignoring its own group
  fireEvent.click(screen.getByRole("checkbox", { name: /7–12 months/i }));
  expect(row(/1–6 months/i)).toHaveTextContent("1–6 months (0)");
  expect(row(/7–12 months/i)).toHaveTextContent("7–12 months (6)");
});

test("provider suggestions show their counts", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.change(
    screen.getByRole("combobox", { name: /search providers/i }),
    {
      target: { value: "a" },
    },
  );
  expect(screen.getByRole("option", { name: "Alpha (6)" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Beta (8)" })).toBeInTheDocument();
});

// jsdom has no matchMedia, so tests run as "desktop" unless they stub a phone.
function stubPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

test("the ZIP, usage and Change controls live in one sticky bar; desktop shows the sidebar, not a Filters button", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  const bar = screen.getByText("ZIPCODE: 75201").closest(".sticky");
  expect(bar).toHaveClass("sticky", "top-0");
  expect(bar).toContainElement(screen.getByRole("button", { name: "Change" }));
  expect(bar).toContainElement(screen.getByLabelText(/monthly usage in kWh/i));

  expect(screen.getByRole("complementary", { name: "Filters" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /^Filters/ }),
  ).not.toBeInTheDocument();
});

test("phone: the sticky bar has a Filters button that opens a drawer; Apply commits, and the button shows the active count", async () => {
  stubPhone();
  renderMany();
  await screen.findByText("Page 1 of 3");

  const bar = screen.getByText("ZIPCODE: 75201").closest(".sticky");
  const open = screen.getByRole("button", { name: "Filters" });
  expect(bar).toContainElement(open);
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(open);
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  pickProvider("alp", "Alpha");
  fireEvent.click(
    within(drawer).getByRole("checkbox", { name: /7–12 months/i }),
  );
  expect(within(drawer).getByText("6 plans match")).toBeInTheDocument();
  // nothing applied until Apply: the list behind is unchanged
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

  fireEvent.click(within(drawer).getByRole("button", { name: "Apply" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filters (2)" }),
  ).toBeInTheDocument();
});

test("phone drawer: Clear empties the draft only; closing without Apply discards edits", async () => {
  stubPhone();
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  pickProvider("alp", "Alpha");
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(
    screen.getByRole("button", { name: "Filters (1)" }),
  ).toBeInTheDocument();

  // Clear: the draft empties, the applied filters stay until Apply
  fireEvent.click(screen.getByRole("button", { name: "Filters (1)" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(
    screen.queryByRole("button", { name: "Remove Alpha" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
  expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filters (1)" }),
  ).toBeInTheDocument();

  // Clear then Apply: everything is back
  fireEvent.click(screen.getByRole("button", { name: "Filters (1)" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();

  // Escape also discards
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /7–12 months/i }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

test("a one-line summary above the list counts what is showing and follows the filters", async () => {
  mockPlans({
    ...file,
    planCount: 4,
    plans: [
      mk({
        id: 1,
        planName: "A",
        termMonths: 12,
        renewableDescription: "100% Renewable",
      }),
      mk({
        id: 2,
        planName: "B",
        termMonths: 12,
        renewableDescription: "22% Renewable",
      }),
      mk({
        id: 3,
        planName: "C",
        termMonths: 24,
        renewableDescription: "100% Renewable",
      }),
      mk({ id: 4, planName: "D", termMonths: 3, renewableDescription: null }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);

  expect(
    await screen.findByText(
      "4 plans · 2 are 100% renewable · 2 are 7–12 months",
    ),
  ).toBeInTheDocument();

  // at least 100% renewable: A and C remain; only A is 7–12 months
  fireEvent.change(screen.getByLabelText(/minimum renewable percentage/i), {
    target: { value: "100" },
  });
  expect(
    screen.getByText(
      "Showing 2 of 4 plans · 2 are 100% renewable · 1 is 7–12 months",
    ),
  ).toBeInTheDocument();

  // parts that would say "0" are left out
  fireEvent.click(screen.getByRole("checkbox", { name: /12\+ months/i }));
  expect(
    screen.getByText("Showing 1 of 4 plans · 1 is 100% renewable"),
  ).toBeInTheDocument();
});
