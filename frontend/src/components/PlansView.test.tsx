import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PlansView } from "./PlansView";
import type { Plan, TduDataFile } from "../types/plan";

// These tests are about the plan list; the Our picks cards repeat plan names, so
// they are switched off here and covered in ourPicks.test.tsx.
vi.mock("./OurPicks", () => ({ OurPicks: () => null }));
// These tests are about the plan list. A plan picked for Our picks is not
// repeated in the list, so with real picks the list would lose its first plans;
// the picks are switched off here and covered in ourPicks.test.tsx and
// scoreV2.test.tsx.
vi.mock("../lib/awards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/awards")>()),
  computeAwards: () => [],
}));

const mk = (over: Partial<Plan>): Plan =>
  ({
    id: 0,
    planName: "Plan",
    companyName: "Sample Co",
    termMonths: 12,
    rateType: "Fixed",
    pricePerKwh: { at500: 0.16, at1000: 0.15, at2000: 0.155 },
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

// These tests were written for 1,000 kWh, so they start from it by way of the
// address (the real default is 1,150, covered in usageInput.test.tsx).
beforeEach(() => window.history.replaceState(null, "", "/?usage=1000"));
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

/** Types a usage and leaves the box, so it applies at once (typing alone waits 250 ms). */
function enterUsage(box: HTMLElement, value: string) {
  fireEvent.change(box, { target: { value } });
  fireEvent.blur(box);
}

function mockPlans(data: TduDataFile = file) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => data })),
  );
}

// 44 plans -> 3 pages of 20 / 20 / 4. "Alpha" owns plans 1-20, "Beta" owns 21-44.
const many: TduDataFile = {
  ...file,
  planCount: 44,
  plans: Array.from({ length: 44 }, (_, i) =>
    mk({
      id: i + 1,
      planName: `Plan ${i + 1}`,
      companyName: i < 20 ? "Alpha" : "Beta",
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

  expect(
    await screen.findByText("1 plan from Power to Choose"),
  ).toBeInTheDocument();
  const card = screen.getByRole("article");
  expect(within(card).getByText("12.3¢/kWh")).toBeInTheDocument();
  // C1000 = 10 x 12.3 = $123.00 a month, shown on the card
  expect(within(card).getByText("$123")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /more details/i }),
  ).not.toBeInTheDocument();
  const box = screen.getByLabelText(/monthly usage in kWh/i);
  expect(box).toHaveValue("1,000");
  expect(
    screen.queryByRole("button", { name: /your usage/i }),
  ).not.toBeInTheDocument();

  fireEvent.click(card);
  const dialog = screen.getByRole("dialog", { name: /interpolated plan/i });
  expect(within(dialog).getByText("$123")).toBeInTheDocument();
  expect(within(dialog).getAllByText("12.3¢/kWh")).toHaveLength(2);

  fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));
  enterUsage(box, "850");
  expect(screen.getByText("1 plan from Power to Choose")).toBeInTheDocument();
  expect(within(card).getByText("12.4¢/kWh")).toBeInTheDocument();
  expect(within(card).getByText("$105")).toBeInTheDocument(); // C(850) = $105.15
  fireEvent.click(card);
  const updatedDialog = screen.getByRole("dialog", {
    name: /interpolated plan/i,
  });
  expect(within(updatedDialog).getByText("at 850 kWh")).toBeInTheDocument();
  // by hand: C500 = 5 x 12.7 = $63.50, C1000 = 10 x 12.3 = $123.00,
  // m1 = (123.00 - 63.50) / 500 = 0.119; C(850) = 63.50 + 0.119 x 350 = $105.15 -> "$105";
  // rate = 105.15 / 850 = 12.37 cents -> "12.4¢/kWh"
  expect(within(updatedDialog).getByText("$105")).toBeInTheDocument();
  expect(within(updatedDialog).getByText("12.4¢/kWh")).toBeInTheDocument();

  fireEvent.click(
    within(updatedDialog).getByRole("button", { name: /close/i }),
  );
  enterUsage(box, "9999");
  expect(box).toHaveValue("5,000"); // clamped
  // by hand: C2000 = 20 x 12.1 = $242.00, m2 = (242.00 - 123.00) / 1000 = 0.119;
  // C(5000) = 242.00 + 0.119 x 3000 = $599.00; rate = 599 / 5000 = 11.98 cents -> "12.0¢/kWh"
  expect(within(card).getByText("12.0¢/kWh")).toBeInTheDocument();
  expect(within(card).getByText("$599")).toBeInTheDocument();
  fireEvent.click(card);
  const cappedDialog = screen.getByRole("dialog", {
    name: /interpolated plan/i,
  });
  expect(within(cappedDialog).getByText("$599")).toBeInTheDocument();
  // the average price (12.0) is no longer the 2,000 kWh tier (12.1): it is the exact
  // bill over the usage, 599 / 5000, so each shows once
  expect(within(cappedDialog).getAllByText("12.0¢/kWh")).toHaveLength(1);
  expect(within(cappedDialog).getAllByText("12.1¢/kWh")).toHaveLength(1);
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
  mockPlans({
    ...file,
    plans: [
      mk({
        id: 1,
        planName: "Green A",
        companyName: "Gexa",
        renewableDescription: "100% Renewable",
      }),
      mk({
        id: 2,
        planName: "Plain B",
        companyName: "APGE",
        renewableDescription: "22% Renewable",
      }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Green A");

  fireEvent.click(
    screen.getByRole("checkbox", { name: /100% renewable only/i }),
  );
  expect(screen.queryByText("Plain B")).not.toBeInTheDocument();
  pickProvider("apg", "APGE"); // a provider with no 100% renewable plan
  expect(screen.getByText(/no plans match these filters/i)).toBeInTheDocument();
});

function renderMany() {
  mockPlans(many);
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

const next = () => screen.getByRole("button", { name: /next/i });
const prev = () => screen.getByRole("button", { name: /previous/i });

test("shows 20 plans per page with the page position below", async () => {
  renderMany();
  expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(20);
  expect(screen.getByText("Plan 1")).toBeInTheDocument();
  expect(screen.getByText("Plan 20")).toBeInTheDocument();
  expect(screen.queryByText("Plan 21")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 21")).toBeInTheDocument();
  expect(screen.getByText("Plan 40")).toBeInTheDocument();
  expect(screen.queryByText("Plan 20")).not.toBeInTheDocument();

  fireEvent.click(next());
  expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(4); // 44 = 20 + 20 + 4
  expect(screen.getByText("Plan 44")).toBeInTheDocument();
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

test("exactly 20 plans is one page with both buttons disabled", async () => {
  mockPlans({ ...many, planCount: 20, plans: many.plans.slice(0, 20) });
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

test("arrow keys typed in the usage box do not change the page", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  fireEvent.keyDown(screen.getByLabelText(/monthly usage in kWh/i), {
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
  expect(screen.getByText("Plan 21")).toBeInTheDocument();
});

test("a usage change keeps the same page number", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

  enterUsage(screen.getByLabelText(/monthly usage in kWh/i), "500");
  expect(screen.getByText("44 plans from Power to Choose")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getByText("Plan 21")).toBeInTheDocument();
});

test("the sidebar has no PRODUCT TYPE section any more; the other sections are still there", async () => {
  mockPlans();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Gexa 12");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  expect(within(sidebar).queryByText("PRODUCT TYPE")).not.toBeInTheDocument();
  expect(
    within(sidebar).queryByText(/select all that apply/i),
  ).not.toBeInTheDocument();
  expect(
    within(sidebar).queryByRole("checkbox", { name: /fixed/i }),
  ).not.toBeInTheDocument();

  const headings = within(sidebar)
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent);
  expect(headings).toEqual([
    "Sort by",
    "Time-of-use plans",
    "Contract length",
    "Renewable energy",
    "Provider",
  ]);
  // no product-type checkbox is left: time-of-use, the four contract lengths,
  // 100% renewable. The two sort options are radios.
  const checkboxes = within(sidebar)
    .getAllByRole("checkbox")
    .map((box) => box.closest("label")?.textContent);
  expect(checkboxes).toHaveLength(6);
  expect(checkboxes.join(" ")).toMatch(/only time-of-use plans/i);
  expect(checkboxes.join(" ")).toMatch(/100% renewable only/i);
  expect(within(sidebar).getAllByRole("radio")).toHaveLength(2);
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
  const none = screen.getByRole("checkbox", { name: /^13\+ months/i });
  expect(none).toBeDisabled();
  expect(none.closest("label")).toHaveTextContent("No plans available");
  expect(screen.getByRole("checkbox", { name: /^12 months/i })).toBeEnabled();
  // nothing is ticked when the page opens
  expect(
    screen.getByRole("checkbox", { name: /^12 months/i }),
  ).not.toBeChecked();
});

test("1–6 months becomes selectable when the area has a short plan", async () => {
  mockPlans({
    ...file,
    plans: [mk({ id: 1, planName: "Short 3", termMonths: 3 }), ...file.plans],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Short 3");
  // no length is ticked, so every plan is in the list
  expect(screen.getByText("Gexa 12")).toBeInTheDocument();
  const box = screen.getByRole("checkbox", { name: /^1–6 months/i });
  expect(box).toBeEnabled();
  fireEvent.click(box);
  expect(screen.getByText("Short 3")).toBeInTheDocument();
  expect(screen.queryByText("Gexa 12")).not.toBeInTheDocument();
  expect(box).toBeChecked();
});

test("the header's search box submits a new ZIP; invalid ones are refused; usage and filters are kept", async () => {
  mockPlans(many);
  const onSubmitZip = vi.fn();
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={onSubmitZip} />);
  await screen.findByText("Page 1 of 3");
  enterUsage(screen.getByLabelText(/monthly usage in kWh/i), "750");
  pickProvider("bet", "Beta");

  const input = screen.getByLabelText("ZIP code");
  expect(input).toHaveValue("75201");
  fireEvent.change(input, { target: { value: "770" } });
  fireEvent.click(screen.getByRole("button", { name: /^Update/ }));
  expect(onSubmitZip).not.toHaveBeenCalled();
  expect(screen.getByText("Enter a 5-digit ZIP code.")).toBeInTheDocument();

  fireEvent.change(input, { target: { value: "77002" } });
  fireEvent.click(screen.getByRole("button", { name: /^Update/ }));
  expect(onSubmitZip).toHaveBeenCalledWith("77002");
  expect(screen.getByLabelText(/monthly usage in kWh/i)).toHaveValue("750");
  expect(screen.getByRole("button", { name: "Remove Beta" })).toBeVisible();
});

test("the ZIP box takes digits only, and a new ZIP from the lookup replaces what was typed", async () => {
  mockPlans();
  const { rerender } = render(
    <PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />,
  );
  await screen.findByText("Gexa 12");
  const input = screen.getByLabelText("ZIP code");
  fireEvent.change(input, { target: { value: "ab12" } });
  expect(input).toHaveValue("12");

  rerender(<PlansView tdu="oncor" zip="77002" onSubmitZip={() => {}} />);
  expect(screen.getByLabelText("ZIP code")).toHaveValue("77002");
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
  renderMany(); // Alpha: plans 1-20, Beta: plans 21-44, all 12 months, Fixed
  await screen.findByText("Page 1 of 3");

  const row = (name: RegExp) =>
    screen.getByRole("checkbox", { name }).closest("label")!;
  expect(row(/^12 months/i)).toHaveTextContent("12 months (44)");
  expect(row(/13\+ months/i)).toHaveTextContent("13+ months (0)");

  // choosing a provider narrows every count
  pickProvider("alp", "Alpha");
  expect(row(/^12 months/i)).toHaveTextContent("12 months (20)");

  // zero-match options stay on screen, greyed
  expect(row(/13\+ months/i)).toHaveTextContent("13+ months (0)");
  expect(row(/13\+ months/i)).toHaveClass("text-ink-faint");
  expect(screen.getByRole("checkbox", { name: /13\+ months/i })).toBeDisabled();

  // a contract length is counted against the provider, ignoring its own group
  fireEvent.click(screen.getByRole("checkbox", { name: /^12 months/i }));
  expect(row(/1–6 months/i)).toHaveTextContent("1–6 months (0)");
  expect(row(/^12 months/i)).toHaveTextContent("12 months (20)");
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
  expect(
    screen.getByRole("option", { name: "Alpha (20)" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Beta (24)" })).toBeInTheDocument();
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

test("the header holds the search, with the usage block under it, in normal flow; desktop shows the sidebar, not a Filters button", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");

  const header = screen.getByRole("region", { name: "Your search" });
  expect(header).toContainElement(screen.getByLabelText("ZIP code"));
  expect(header).toContainElement(
    screen.getByRole("button", { name: /^Update/ }),
  );
  // the usage block is its own band right under the search, not a slider in it
  expect(screen.queryByLabelText("Monthly usage slider")).toBeNull();
  expect(
    header.compareDocumentPosition(
      screen.getByLabelText(/monthly usage in kWh/i),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  // the full header scrolls away; only the slim bar (below) is fixed
  expect(header.className).not.toMatch(/sticky|fixed/);
  expect(screen.queryByLabelText(/top bar/i)).not.toBeInTheDocument();

  const sidebar = screen.getByRole("complementary", { name: "Filters" });
  expect(sidebar).toBeVisible();
  // stays in view below the slim bar, and scrolls inside itself if taller than the screen
  expect(sidebar).toHaveClass("sticky", "top-20", "overflow-y-auto");
  expect(sidebar.className).toContain("max-h-[calc(100dvh-");
  expect(
    screen.queryByRole("button", { name: /^Filters/ }),
  ).not.toBeInTheDocument();
});

test("phone: a Filters button under the header opens a drawer; Apply commits, and the button shows the active count", async () => {
  stubPhone();
  // Alpha's six plans are 100% renewable, Beta's eight are not
  mockPlans({
    ...many,
    plans: many.plans.map((p) =>
      p.companyName === "Alpha"
        ? { ...p, renewableDescription: "100% Renewable" }
        : p,
    ),
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Page 1 of 3");

  const header = screen.getByRole("region", { name: "Your search" });
  const open = screen.getByRole("button", { name: "Filters" });
  // directly under the header, full width
  expect(header).not.toContainElement(open);
  expect(
    header.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(open).toHaveClass("w-full");
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(open);
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  pickProvider("alp", "Alpha");
  fireEvent.click(
    within(drawer).getByRole("checkbox", { name: /100% renewable only/i }),
  );
  expect(within(drawer).getByText("20 plans match")).toBeInTheDocument();
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
  pickProvider("bet", "Beta");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
});

test("the results line is just the plan count and the Updated stamp, and the count follows the filters", async () => {
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
      mk({
        id: 4,
        planName: "D",
        termMonths: 3,
        renewableDescription: "5% renewable",
      }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);

  expect(
    await screen.findByText("4 plans from Power to Choose"),
  ).toBeInTheDocument();
  // nothing else in the sentence: no renewable / 12-month / time-of-use counts, no dots
  expect(
    screen.getByText("4 plans from Power to Choose").textContent,
  ).not.toMatch(/ · /);
  expect(
    screen.queryByText(
      /(is|are) 100% renewable|(is|are) 12 months|shown separately/,
    ),
  ).toBeNull();
  expect(screen.getByText(/^Updated /)).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole("checkbox", { name: /100% renewable only/i }),
  );
  expect(
    screen.getByText("Showing 2 of 4 plans"), // A and C
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: /13[+] months/i }));
  expect(
    screen.getByText("Showing 1 of 4 plans"), // C only
  ).toBeInTheDocument();
});

// ---- Sort: Best match / Lowest bill

// All 12 months, so the terms do not mix. Lowest total cost at 1,000 kWh is
// C, B, A. Best match (score v3) is B, C, A: C has the lowest bill but a $700 fee
// and 0% renewable, B is 100% renewable. By hand at 1,000 kWh, S_cost from
// CE = E + sigma- (A 142.4, B 123.5, C 116.6 dollars): score x 12 = 8 S_cost +
// 3 S_flex + S_green gives B 98.8, C 95, A 31. D has no 2,000 kWh price, so it is
// not scored and not listed. Bills at 500 / 1000 / 2000 kWh:
//   A Flat      60 / 120 / 240
//   B Credit   100 / 100 / 200
//   C Unstable  50 /  90 / 220   (V-Trap: rate at 1,000 kWh below the rate at 2,000)
//   D NoAnchor  no estimable bill (the 2,000 kWh price is missing)
const sortFile: TduDataFile = {
  ...file,
  planCount: 4,
  plans: [
    mk({
      id: 1,
      planName: "A Flat",
      pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
    }),
    mk({
      id: 2,
      planName: "B Credit",
      renewableDescription: "100% renewable",
      pricePerKwh: { at500: 0.2, at1000: 0.1, at2000: 0.1 },
    }),
    mk({
      id: 3,
      planName: "C Unstable",
      renewableDescription: "0% renewable",
      pricingDetails: "Cancellation fee: $700.",
      pricePerKwh: { at500: 0.1, at1000: 0.09, at2000: 0.11 },
    }),
    mk({
      id: 4,
      planName: "D NoAnchor",
      pricePerKwh: { at500: 0.01, at1000: 0.01, at2000: null },
    }),
  ],
};

const cardNames = () =>
  screen
    .getAllByRole("article")
    .map((card) => within(card).getByRole("heading").textContent);

function renderSortable() {
  mockPlans(sortFile);
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

test("sort control: Lowest total cost is the default, cheapest first, with its description", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  expect(
    screen.getByRole("radio", { name: "Lowest total cost" }),
  ).toBeChecked();
  expect(screen.getByRole("radio", { name: "Best match" })).not.toBeChecked();
  // usage is 1,000 kWh: C 90, B 100, A 120, and D (no estimate) is not listed
  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]);
  const first = screen.getAllByRole("article")[0];
  // the monthly bill, C(1000) = 10 x 9c = $90, big on the right
  expect(within(first).getByText("$90")).toBeInTheDocument();
  expect(within(first).getByText("/mo")).toBeInTheDocument();
  // each option has its description under its name, tied to the radio
  expect(
    screen.getByRole("radio", { name: "Lowest total cost" }),
  ).toHaveAccessibleDescription(
    "What the contract costs at your usage. Cheapest first.",
  );
  expect(
    screen.getByRole("radio", { name: "Best match" }),
  ).toHaveAccessibleDescription(
    "Balances price, contract length, fees and renewable share.",
  );
});

test("Best match follows the score, not the bill, and has no description", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
  expect(screen.queryByText(/sorted by our score/i)).toBeNull();
  // and back
  fireEvent.click(screen.getByRole("radio", { name: "Lowest total cost" }));
  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]);
});

test("in Lowest total cost mode, changing the usage re-sorts the list", async () => {
  renderSortable();
  await screen.findByText("A Flat");
  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]);

  const usage = screen.getByLabelText(/monthly usage in kWh/i);

  enterUsage(usage, "500"); // C 50, A 60, B 100
  expect(cardNames()).toEqual(["C Unstable", "A Flat", "B Credit"]);

  enterUsage(usage, "2000"); // B 200, C 220, A 240
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
  const first = screen.getAllByRole("article")[0];
  // B at 2,000 kWh: C2000 = 20 x 10c = $200
  expect(within(first).getByText("$200")).toBeInTheDocument();

  // and Best match at 1,000 kWh: the score order (it moves with the usage, so
  // this is checked at the usage it was worked out for)
  enterUsage(usage, "1000");
  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
});

test("a card carries no warning badge; an unstable-curve plan is still first when it is the cheapest, and not pushed down", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  // no "Unstable price" badge on any card any more (the details still explain it)
  expect(screen.queryByText(/unstable price/i)).not.toBeInTheDocument();
  expect(cardNames()[0]).toBe("C Unstable");
  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  expect(screen.queryByText(/unstable price/i)).not.toBeInTheDocument();
  expect(cardNames()[1]).toBe("C Unstable");
});

test("changing the sort goes back to page 1; filters still apply before sorting", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

  // a filter narrows the set; the sort is applied to what is left
  pickProvider("bet", "Beta");
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Best match" })).toBeChecked();
});

// ---- Sort control lives in the filter sidebar / drawer

test("desktop: SORT BY is the first section of the left sidebar, styled like the others, and not above the list", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  const sidebar = screen.getByRole("complementary", { name: "Filters" });
  const main = screen.getByRole("main");

  // both options are in the sidebar, none above the plan list
  expect(
    within(sidebar).getByRole("radio", { name: "Best match" }),
  ).toBeInTheDocument();
  expect(
    within(sidebar).getByRole("radio", { name: "Lowest total cost" }),
  ).toBeInTheDocument();
  expect(within(main).queryByRole("radio")).not.toBeInTheDocument();

  // Sort by is the first section, with the same heading look as the others
  const headings = within(sidebar)
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent);
  expect(headings.slice(0, 3)).toEqual([
    "Sort by",
    "Time-of-use plans",
    "Contract length",
  ]);
  const sortHeading = within(sidebar).getByRole("heading", { name: "Sort by" });
  const contractHeading = within(sidebar).getByRole("heading", {
    name: "Contract length",
  });
  expect(sortHeading.className).toBe(contractHeading.className);
});

test("desktop: the sort in the sidebar sorts by cost and follows the usage", async () => {
  renderSortable();
  await screen.findByText("A Flat");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]);
  enterUsage(screen.getByLabelText(/monthly usage in kWh/i), "2000");
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
  fireEvent.click(within(sidebar).getByRole("radio", { name: "Best match" }));
  expect(
    within(sidebar).getByRole("radio", { name: "Best match" }),
  ).toBeChecked();
});

test("phone: the drawer opens on Sort by, and Apply applies the sort choice with the filters", async () => {
  stubPhone();
  renderSortable();
  await screen.findByText("A Flat");

  // nothing sort-related above the list any more
  expect(
    within(screen.getByRole("main")).queryByRole("radio"),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });

  // first thing in the drawer
  const headings = within(drawer)
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent);
  expect(headings[0]).toBe("Sort by");
  expect(within(drawer).getAllByRole("radio")[0]).toHaveAccessibleName(
    "Lowest total cost",
  );
  expect(within(drawer).getAllByRole("radio")[0]).toBeChecked();
  expect(within(drawer).queryByText(/recommended/i)).toBeNull();

  fireEvent.click(within(drawer).getByRole("radio", { name: "Best match" }));
  // a draft until Apply: the list behind is unchanged
  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]);

  fireEvent.click(within(drawer).getByRole("button", { name: "Apply" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
  // the sort is not a filter, so it is not counted on the button
  expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();

  // reopening shows the applied choice
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  expect(screen.getByRole("radio", { name: "Best match" })).toBeChecked();
});

test("phone: closing the drawer discards a sort change; Clear empties filters but keeps the chosen sort", async () => {
  stubPhone();
  renderSortable();
  await screen.findByText("A Flat");

  // ✕ discards
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
  expect(cardNames()[0]).toBe("C Unstable");

  // Clear empties the filters but leaves the sort alone
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  pickProvider("sam", "Sample Co");
  expect(
    screen.getByRole("button", { name: "Remove Sample Co" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(
    screen.queryByRole("button", { name: "Remove Sample Co" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Best match" })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(cardNames()[0]).toBe("B Credit");
});

// ---- Usage block and the slim bar

test("typing a usage re-prices and re-sorts the list live", async () => {
  renderSortable();
  await screen.findByText("A Flat");
  expect(cardNames()).toEqual(["C Unstable", "B Credit", "A Flat"]); // at 1,000 kWh

  const box = screen.getByLabelText(/monthly usage in kWh/i);
  enterUsage(box, "2000"); // B 200, C 220, A 240
  expect(box).toHaveValue("2,000");
  expect(cardNames()).toEqual(["B Credit", "C Unstable", "A Flat"]);
  const first = screen.getAllByRole("article")[0];
  // B at 2,000 kWh: C2000 = 20 x 10c = $200
  expect(within(first).getByText("$200")).toBeInTheDocument();
  expect(screen.getByText("3 plans from Power to Choose")).toBeInTheDocument();

  enterUsage(box, "500");
  expect(cardNames()).toEqual(["C Unstable", "A Flat", "B Credit"]); // 50, 60, 100
});

test("order on the results page: header, then the usage block, then the filters, then the plans", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  const follows = (first: Element, second: Element) =>
    (first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING) !==
    0;
  const header = screen.getByRole("region", { name: "Your search" });
  const usage = screen.getByRole("region", { name: "Your usage" });
  const filters = screen.getByRole("complementary", { name: "Filters" });
  const plans = screen.getByRole("region", { name: "Plans" });
  expect(follows(header, usage)).toBe(true);
  expect(follows(usage, filters)).toBe(true);
  expect(follows(filters, plans)).toBe(true);
});

test("once the full header has scrolled away, a slim bar keeps the ZIP, area and usage in reach", async () => {
  stubPhone();
  renderSortable();
  await screen.findByText("A Flat");
  const headerWrap = screen.getByRole("region", {
    name: "Your search",
  }).parentElement!;
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

  // header in view: no slim bar
  expect(
    screen.queryByLabelText("Monthly usage in kWh (top bar)"),
  ).not.toBeInTheDocument();

  // scrolled past it
  vi.spyOn(headerWrap, "getBoundingClientRect").mockReturnValue({
    bottom: -20,
  } as DOMRect);
  fireEvent.scroll(window);
  const topUsage = screen.getByLabelText("Monthly usage in kWh (top bar)");
  const bar = topUsage.closest(".fixed") as HTMLElement;
  expect(bar).toHaveClass("fixed", "top-0");
  expect(bar).toHaveTextContent("ZIP 75201");
  expect(
    within(bar).getByRole("button", { name: "Filters" }),
  ).toBeInTheDocument();

  // it drives the same usage as the header's own box
  fireEvent.change(topUsage, { target: { value: "2000" } });
  expect(screen.getByLabelText("Monthly usage in kWh")).toHaveValue("2,000");

  // Edit takes the user back up
  fireEvent.click(within(bar).getByRole("button", { name: "Edit" }));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

  // back in view: the slim bar goes away
  vi.spyOn(headerWrap, "getBoundingClientRect").mockReturnValue({
    bottom: 120,
  } as DOMRect);
  fireEvent.scroll(window);
  expect(
    screen.queryByLabelText("Monthly usage in kWh (top bar)"),
  ).not.toBeInTheDocument();
});

// ---- Time-of-use plans: unranked, in their own section

const rankedA = mk({
  id: 1,
  planName: "Ranked A",
  companyName: "Alpha",
  pricePerKwh: { at500: 0.12, at1000: 0.12, at2000: 0.12 },
});
const rankedB = mk({
  id: 2,
  planName: "Ranked B",
  companyName: "Alpha",
  pricePerKwh: { at500: 0.14, at1000: 0.14, at2000: 0.14 },
});
// bills at 500 / 1000 / 2000 kWh:  Night Owl 50/100/200,  Day Saver 75/150/300,  Cross 150/80/160
const touNight = mk({
  id: 10,
  planName: "Night Owl",
  companyName: "Night Co",
  isTimeOfUse: true,
  pricePerKwh: { at500: 0.1, at1000: 0.1, at2000: 0.1 },
});
const touDay = mk({
  id: 11,
  planName: "Day Saver",
  companyName: "Night Co",
  isTimeOfUse: true,
  pricePerKwh: { at500: 0.15, at1000: 0.15, at2000: 0.15 },
});
const touCross = mk({
  id: 12,
  planName: "Cross",
  companyName: "Alpha",
  isTimeOfUse: true,
  pricePerKwh: { at500: 0.3, at1000: 0.08, at2000: 0.08 },
});

const touFile: TduDataFile = {
  ...file,
  planCount: 2,
  plans: [rankedA, rankedB],
  // stored cheapest-reference-rate-first, as the pipeline writes it
  timeOfUsePlans: [touCross, touNight, touDay],
};

function renderTou(data: TduDataFile = touFile) {
  mockPlans(data);
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

// The time-of-use plans are not in the list when the page opens: they appear
// when the visitor ticks "Only time-of-use plans".
const touBox = () =>
  screen.getByRole("checkbox", { name: /only time-of-use plans/i });
const showTou = () => fireEvent.click(touBox());
const touRegion = () =>
  screen.queryByRole("region", { name: /time-of-use plans/i });

const touSection = () =>
  screen.getByRole("region", { name: /time-of-use plans/i });
const sectionNames = () =>
  within(touSection())
    .getAllByRole("article")
    .map((card) => within(card).getByRole("heading").textContent);
const rankedNames = () =>
  within(screen.getByRole("region", { name: "Plans" }))
    .getAllByRole("article")
    .filter((card) => !touRegion()?.contains(card))
    .map((card) => within(card).getByRole("heading").textContent);

test("time-of-use plans are not in the list when the page opens; ticking the filter shows them in their own unranked section", async () => {
  renderTou();
  await screen.findByText("Ranked A");

  // opening the page: only the ranked plans, nothing time-of-use anywhere
  expect(rankedNames()).toEqual(["Ranked A", "Ranked B"]);
  expect(touRegion()).toBeNull();
  for (const name of ["Cross", "Night Owl", "Day Saver"]) {
    expect(screen.queryByText(name)).not.toBeInTheDocument();
  }
  expect(document.body.textContent).not.toMatch(/unranked/i);

  showTou();
  expect(screen.queryByText("Ranked A")).not.toBeInTheDocument();
  expect(sectionNames()).toEqual(["Cross", "Night Owl", "Day Saver"]);
  const section = touSection();

  // clearly marked, with the exact intro
  expect(
    within(section).getByRole("heading", { name: /time-of-use plans/i }),
  ).toHaveTextContent(/unranked/i);
  expect(
    within(section).getByText(
      "These plans charge different rates at different times of day. The price shown is Power to Choose's flat reference rate, not what you would actually pay — it depends on when you use electricity.",
    ),
  ).toBeInTheDocument();
  // the cards themselves carry no badge: the heading says (unranked)
  expect(
    within(section).queryByText(/unranked · time-of-use/i),
  ).not.toBeInTheDocument();
  // and unticking brings the ranked list back and the section goes away
  showTou();
  expect(rankedNames()).toEqual(["Ranked A", "Ranked B"]);
  expect(touRegion()).toBeNull();
});

test("the section is ordered by reference rate, cheapest first, follows the usage, and ignores the sort choice", async () => {
  renderTou();
  await screen.findByText("Ranked A");
  const usage = screen.getByLabelText(/monthly usage in kWh/i);
  showTou();

  expect(sectionNames()).toEqual(["Cross", "Night Owl", "Day Saver"]); // 80, 100, 150 at 1,000 kWh

  enterUsage(usage, "500"); // 50, 75, 150
  expect(sectionNames()).toEqual(["Night Owl", "Day Saver", "Cross"]);

  // the sort re-orders the ranked list only; the section is always cheapest first
  fireEvent.click(screen.getByRole("radio", { name: "Best match" }));
  expect(sectionNames()).toEqual(["Night Owl", "Day Saver", "Cross"]);
  fireEvent.click(screen.getByRole("radio", { name: "Lowest total cost" }));
  expect(sectionNames()).toEqual(["Night Owl", "Day Saver", "Cross"]);
  showTou();
  expect(rankedNames()).toEqual(["Ranked A", "Ranked B"]);
});

test("the results line counts only the ranked plans and says nothing about the time-of-use ones", async () => {
  renderTou();
  await screen.findByText("Ranked A");
  expect(screen.getByText("2 plans from Power to Choose")).toBeInTheDocument();
  expect(screen.queryByText(/shown separately/)).not.toBeInTheDocument();
  expect(screen.getByText(/^Updated /)).toBeInTheDocument();
});

test("the TIME-OF-USE PLANS filter shows its count and note, and switches to only that section", async () => {
  renderTou();
  await screen.findByText("Ranked A");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  const box = within(sidebar).getByRole("checkbox", {
    name: /only time-of-use plans/i,
  });
  expect(box.closest("label")).toHaveTextContent("Only time-of-use plans (3)");
  expect(
    within(sidebar).getByText(
      "Rates vary by time of day, so these aren't ranked the same way. The price shown is Power to Choose's flat reference rate, not what you would actually pay.",
    ),
  ).toBeInTheDocument();
  expect(box).not.toBeChecked();

  fireEvent.click(box);
  // only the section: no ranked cards, no pagination
  expect(
    screen.queryByRole("navigation", { name: "Plan pagination" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Ranked A")).not.toBeInTheDocument();
  expect(sectionNames()).toEqual(["Cross", "Night Owl", "Day Saver"]);
  expect(screen.getByText("3 time-of-use plans")).toBeInTheDocument();

  // and back
  fireEvent.click(box);
  expect(screen.getByText("Ranked A")).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Plan pagination" }),
  ).toBeInTheDocument();
});

test("the other filters apply to the time-of-use section too, and its count follows them", async () => {
  renderTou();
  await screen.findByText("Ranked A");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  pickProvider("night", "Night Co"); // Night Owl, Day Saver
  expect(
    within(sidebar)
      .getByRole("checkbox", { name: /only time-of-use plans/i })
      .closest("label"),
  ).toHaveTextContent("Only time-of-use plans (2)");
  // that provider has no ranked plans, so the ranked list is empty, and the
  // time-of-use plans are still not shown until the filter is ticked
  expect(
    screen.getByText(/no ranked plans match these filters/i),
  ).toBeInTheDocument();
  expect(touRegion()).toBeNull();
  expect(screen.getByText("Showing 0 of 2 plans")).toBeInTheDocument();
  showTou();
  expect(sectionNames()).toEqual(["Night Owl", "Day Saver"]);
});

test("with no time-of-use plans in the area the filter is greyed out and says so, and there is no section", async () => {
  renderTou({ ...touFile, timeOfUsePlans: [] });
  await screen.findByText("Ranked A");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  const box = within(sidebar).getByRole("checkbox", {
    name: /only time-of-use plans/i,
  });
  expect(box).toBeDisabled();
  expect(box.closest("label")).toHaveTextContent("No plans available");
  expect(box.closest("label")).toHaveClass("text-ink-faint");
  expect(
    screen.queryByRole("region", { name: /time-of-use plans/i }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("2 plans from Power to Choose")).toBeInTheDocument();
});

test("data written before the split (time-of-use plans inside plans) is still shown separately", async () => {
  renderTou({
    ...file,
    planCount: 3,
    plans: [rankedA, touNight, rankedB],
  });
  await screen.findByText("Ranked A");
  expect(rankedNames()).toEqual(["Ranked A", "Ranked B"]);
  expect(touRegion()).toBeNull();
  expect(screen.getByText("2 plans from Power to Choose")).toBeInTheDocument();
  showTou();
  expect(sectionNames()).toEqual(["Night Owl"]);
});

test("a ZIP whose only plans are time-of-use shows them once the filter is ticked", async () => {
  renderTou({ ...touFile, planCount: 0, plans: [] });
  expect(
    await screen.findByText(/no ranked plans match these filters/i),
  ).toBeInTheDocument();
  expect(screen.queryByText("Night Owl")).not.toBeInTheDocument();
  showTou();
  expect(screen.getByText("Night Owl")).toBeInTheDocument();
});

test("phone: the drawer has the time-of-use filter; Apply switches the page, and it counts on the Filters button", async () => {
  stubPhone();
  renderTou();
  await screen.findByText("Ranked A");

  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  fireEvent.click(
    within(drawer).getByRole("checkbox", { name: /only time-of-use plans/i }),
  );
  expect(within(drawer).getByText("3 plans match")).toBeInTheDocument();
  expect(screen.getByText("Ranked A")).toBeInTheDocument(); // not applied yet

  fireEvent.click(within(drawer).getByRole("button", { name: "Apply" }));
  expect(screen.queryByText("Ranked A")).not.toBeInTheDocument();
  expect(sectionNames()).toEqual(["Cross", "Night Owl", "Day Saver"]);
  expect(
    screen.getByRole("button", { name: "Filters (1)" }),
  ).toBeInTheDocument();
});

test("a card has no 'Open to existing customers' badge, whatever new_customer says", async () => {
  mockPlans({
    ...file,
    planCount: 3,
    plans: [
      mk({ id: 1, planName: "Promo A", newCustomer: true }),
      mk({ id: 2, planName: "Open B", newCustomer: false }),
      mk({ id: 3, planName: "Promo C", newCustomer: true }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Promo A");
  expect(cardNamesOnPage()).toHaveLength(3);
  expect(
    screen.queryByText("Open to existing customers"),
  ).not.toBeInTheDocument();
});

// ---- Contract length buckets: 1–6 | 7–11 | 12 | 13+

test("contract length is 1–6, 7–11, 12 and 13+ months, with counts, and 12-month plans can be found", async () => {
  mockPlans({
    ...file,
    planCount: 7,
    plans: [3, 3, 9, 12, 12, 12, 24].map((term, i) =>
      mk({ id: i + 1, planName: `Term ${term} #${i + 1}`, termMonths: term }),
    ),
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Term 3 #1");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });
  const row = (name: RegExp) =>
    within(sidebar).getByRole("checkbox", { name }).closest("label")!;

  expect(row(/^1–6 months/)).toHaveTextContent("1–6 months (2)");
  expect(row(/^7–11 months/)).toHaveTextContent("7–11 months (1)");
  expect(row(/^12 months/)).toHaveTextContent("12 months (3)");
  expect(row(/^13\+ months/)).toHaveTextContent("13+ months (1)");
  // the old labels are gone
  expect(
    within(sidebar).queryByText(/month-to-month/i),
  ).not.toBeInTheDocument();
  expect(within(sidebar).queryByText(/^12\+ months/)).not.toBeInTheDocument();
  expect(within(sidebar).queryByText(/7–12 months/)).not.toBeInTheDocument();

  // nothing ticked: all seven, on one page
  expect(cardNamesOnPage()).toHaveLength(7);

  // each length shows exactly its own plans when it is ticked, on its own
  const tick = (name: RegExp) =>
    fireEvent.click(within(sidebar).getByRole("checkbox", { name }));
  tick(/^1–6 months/);
  expect(cardNamesOnPage()).toEqual(["Term 3 #1", "Term 3 #2"]);
  tick(/^1–6 months/); // untick
  tick(/^7–11 months/);
  expect(cardNamesOnPage()).toEqual(["Term 9 #3"]);
  tick(/^7–11 months/);
  tick(/^13\+ months/);
  expect(cardNamesOnPage()).toEqual(["Term 24 #7"]);
  tick(/^13\+ months/);
  tick(/^12 months/);
  expect(cardNamesOnPage()).toEqual(["Term 12 #4", "Term 12 #5", "Term 12 #6"]);
  expect(screen.getByText("Showing 3 of 7 plans")).toBeInTheDocument();
  // lengths in one group are OR'd
  tick(/^13\+ months/);
  expect(cardNamesOnPage()).toEqual([
    "Term 12 #4",
    "Term 12 #5",
    "Term 12 #6",
    "Term 24 #7",
  ]);
});

const cardNamesOnPage = () =>
  screen
    .getAllByRole("article")
    .map((card) => within(card).getByRole("heading").textContent);

// ---- Renewable: one honest toggle instead of a slider

test("renewable is a single '100% renewable only' toggle with a count; there is no slider", async () => {
  mockPlans({
    ...file,
    planCount: 4,
    plans: [
      mk({
        id: 1,
        planName: "R100 a",
        companyName: "Alpha",
        renewableDescription: "100% Renewable",
      }),
      mk({
        id: 2,
        planName: "R100 b",
        companyName: "Beta",
        renewableDescription: "100% Renewable",
      }),
      mk({
        id: 3,
        planName: "R37",
        companyName: "Alpha",
        renewableDescription: "37% Renewable",
      }),
      mk({
        id: 4,
        planName: "R22",
        companyName: "Beta",
        renewableDescription: "22% Renewable",
      }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("R100 a");
  const sidebar = screen.getByRole("complementary", { name: "Filters" });

  expect(
    screen.queryByLabelText(/minimum renewable percentage/i),
  ).not.toBeInTheDocument();
  expect(
    within(sidebar).queryByText(/at least \d+% renewable/i),
  ).not.toBeInTheDocument();
  expect(
    within(sidebar).getByRole("heading", { name: "Renewable energy" }),
  ).toBeInTheDocument();

  const toggle = within(sidebar).getByRole("checkbox", {
    name: /100% renewable only/i,
  });
  expect(toggle.closest("label")).toHaveTextContent("100% renewable only (2)");
  expect(toggle).not.toBeChecked();

  fireEvent.click(toggle);
  expect(cardNamesOnPage()).toEqual(["R100 a", "R100 b"]);
  expect(screen.getByText(/Showing 2 of 4 plans/)).toBeInTheDocument();

  // the count follows the other filters
  fireEvent.click(toggle);
  pickProvider("alp", "Alpha");
  expect(toggle.closest("label")).toHaveTextContent("100% renewable only (1)");
});

test("phone: the 100% renewable toggle is in the drawer, applies with Apply, and counts on the Filters button", async () => {
  stubPhone();
  mockPlans({
    ...file,
    planCount: 2,
    plans: [
      mk({ id: 1, planName: "Green", renewableDescription: "100% Renewable" }),
      mk({ id: 2, planName: "Greyish", renewableDescription: "22% Renewable" }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("Green");

  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  const drawer = screen.getByRole("dialog", { name: "Filters" });
  fireEvent.click(
    within(drawer).getByRole("checkbox", { name: /100% renewable only/i }),
  );
  expect(within(drawer).getByText("1 plan matches")).toBeInTheDocument();
  expect(screen.getByText("Greyish")).toBeInTheDocument(); // not applied yet

  fireEvent.click(within(drawer).getByRole("button", { name: "Apply" }));
  expect(screen.queryByText("Greyish")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Filters (1)" }),
  ).toBeInTheDocument();
});

// ---- Logos on the cards that fail to load

test("a card whose logo fails to load shows the provider's initials in a circle instead of a broken image", async () => {
  mockPlans({
    ...file,
    plans: [
      mk({
        id: 1,
        planName: "With logo",
        companyName: "GEXA ENERGY",
        companyLogo: "https://example.com/blocked.png",
      }),
      mk({
        id: 2,
        planName: "Fine logo",
        companyName: "Octopus Energy",
        companyLogo: "https://example.com/ok.png",
      }),
    ],
  });
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
  await screen.findByText("With logo");

  // the logo is decorative (empty alt); the company name stays in the card for a screen reader
  const images = () =>
    Array.from(document.querySelectorAll("img")).filter(
      (img) => img.getAttribute("src") === "https://example.com/blocked.png",
    );
  expect(images()).toHaveLength(1);
  fireEvent.error(images()[0]);
  expect(images()).toHaveLength(0);
  expect(screen.getByText("GE")).toBeInTheDocument();
  // the other card keeps its working logo
  expect(
    document.querySelector('img[src="https://example.com/ok.png"]'),
  ).not.toBeNull();
});

// ---- Pagination: the time-of-use section, and scrolling on a page change

const manyWithTou: TduDataFile = { ...many, timeOfUsePlans: [touNight] };

function renderManyWithTou() {
  mockPlans(manyWithTou);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  render(<PlansView tdu="oncor" zip="75201" onSubmitZip={() => {}} />);
}

test("the time-of-use section is on no page of the list: not on page 1, not on later pages", async () => {
  renderManyWithTou();
  await screen.findByText("Page 1 of 3");
  expect(screen.queryByText("Night Owl")).toBeNull();
  expect(touRegion()).toBeNull();

  fireEvent.click(next());
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  expect(touRegion()).toBeNull();
  expect(document.getElementById("tou-heading")).toBeNull();
  expect(document.body.textContent).not.toContain("Unranked");

  fireEvent.click(next());
  expect(document.getElementById("tou-heading")).toBeNull();
});

test("the time-of-use-only view still shows its section, whatever page the list was on", async () => {
  renderManyWithTou();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  fireEvent.click(
    screen.getByRole("checkbox", { name: /only time-of-use plans/i }),
  );
  expect(screen.getByText("Night Owl")).toBeInTheDocument();
});

test("changing page scrolls to the top smoothly, after the new rows are in, and focuses the list", async () => {
  renderManyWithTou();
  await screen.findByText("Page 1 of 3");
  const summary = screen.getByRole("region", { name: "Plans" });
  expect(summary).toHaveAttribute("tabindex", "-1");
  expect(window.scrollTo).not.toHaveBeenCalled();

  let rowsWhenScrolled = "";
  (window.scrollTo as ReturnType<typeof vi.fn>).mockImplementation(() => {
    rowsWhenScrolled = screen.getByText("Page 2 of 3") ? "new" : "old";
    expect(screen.getByText("Plan 21")).toBeInTheDocument();
  });
  fireEvent.click(next());
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  expect(rowsWhenScrolled).toBe("new"); // the scroll came after the render
  expect(summary).toHaveFocus();
});

test("arrow keys and Previous scroll too; a filter change that resets the page does not", async () => {
  renderManyWithTou();
  await screen.findByText("Page 1 of 3");
  fireEvent.keyDown(document.body, { key: "ArrowRight" });
  expect(window.scrollTo).toHaveBeenCalledTimes(1);
  fireEvent.click(prev());
  expect(window.scrollTo).toHaveBeenCalledTimes(2);

  fireEvent.click(next());
  expect(window.scrollTo).toHaveBeenCalledTimes(3);
  pickProvider("bet", "Beta"); // resets to page 1
  expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalledTimes(3);
});

test("with prefers-reduced-motion the scroll is instant", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  renderManyWithTou();
  await screen.findByText("Page 1 of 3");
  fireEvent.click(next());
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
});

test("the sort options are 'Lowest total cost' then 'Best match', neither is tagged, and clicking the word selects it", async () => {
  renderSortable();
  await screen.findByText("A Flat");

  const radios = within(screen.getByRole("complementary", { name: "Filters" }))
    .getAllByRole("radio")
    .slice(0, 2);
  expect(
    radios.map((r) => (r as HTMLInputElement).labels?.[0]?.textContent),
  ).toEqual(["Lowest total cost", "Best match"]);
  expect(screen.queryByText(/recommend/i)).toBeNull();

  // the label text is part of the same <label>, so clicking it picks the option
  fireEvent.click(screen.getByText("Best match"));
  expect(screen.getByRole("radio", { name: "Best match" })).toBeChecked();
  fireEvent.click(screen.getByText("Lowest total cost"));
  expect(
    screen.getByRole("radio", { name: "Lowest total cost" }),
  ).toBeChecked();
});

test("the plan count and the update time are said once, in the header, not again above the list", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  const header = screen.getByRole("region", { name: "Your search" });
  expect(
    within(header).getByText("44 plans from Power to Choose"),
  ).toBeInTheDocument();
  expect(screen.getAllByText(/plans from Power to Choose/)).toHaveLength(1);
  expect(screen.getAllByText(/^Updated /)).toHaveLength(1);
  expect(within(header).getByText(/^Updated /)).toBeInTheDocument();
  // a filter changes the count in the header
  pickProvider("alp", "Alpha");
  expect(
    within(header).getByText("Showing 20 of 44 plans"),
  ).toBeInTheDocument();
});

test("with no Our picks the list is headed 'All plans'", async () => {
  renderMany();
  await screen.findByText("Page 1 of 3");
  expect(
    screen.getByRole("heading", { name: "All plans" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "All other plans" })).toBeNull();
});
