import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisclaimerPage, formatUpdated } from "./DisclaimerPage";

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe("formatUpdated", () => {
  it("formats an ISO date as day, month name, year", () => {
    expect(formatUpdated("2026-10-20T12:26:23+07:00")).toBe("20 October 2026");
    expect(formatUpdated("2026-01-05T00:00:00Z")).toBe("5 January 2026");
  });

  it("uses the UTC calendar day, so the page reads the same wherever it is opened", () => {
    expect(formatUpdated("2026-10-20T23:30:00Z")).toBe("20 October 2026");
  });

  it("returns null for nothing or for garbage", () => {
    expect(formatUpdated(null)).toBeNull();
    expect(formatUpdated("")).toBeNull();
    expect(formatUpdated("not a date")).toBeNull();
  });
});

describe("DisclaimerPage", () => {
  const source = [
    "# Disclaimer & Terms of Use",
    "",
    "## 1. Information only",
    "",
    "Plan data comes from a public source.",
    "",
    "- Check the EFL",
    "- Confirm before enrolling",
  ].join("\n");

  it("shows the title, then the build-time Last updated date, then the text", () => {
    render(
      <DisclaimerPage source={source} updated="2026-10-20T12:26:23+07:00" />,
    );
    const title = screen.getByRole("heading", {
      level: 1,
      name: "Disclaimer & Terms of Use",
    });
    const date = screen.getByText("Last updated: 20 October 2026");
    const section = screen.getByRole("heading", { level: 2 });
    expect(
      title.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      date.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("says the date is unavailable, rather than going blank or guessing, when the build could not find one", () => {
    render(<DisclaimerPage source={source} updated={null} />);
    expect(
      screen.getByText("Last updated: not available in this build"),
    ).toBeInTheDocument();
  });

  it("is a readable single column with a way back", () => {
    render(<DisclaimerPage source={source} updated={null} />);
    expect(screen.getByRole("article")).toHaveClass(
      "max-w-[75ch]",
      "leading-7",
    );
    expect(
      screen.getByRole("link", { name: /back to plans/i }),
    ).toHaveAttribute("href", "#");
  });

  it("scrolls to the top when it opens", () => {
    render(<DisclaimerPage source={source} updated={null} />);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("renders the real docs/DISCLAIMER.md: a title, one Last updated line, and no hand-written date in the text", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    // exactly one "Last updated" on the page: the injected one, not a line in the file
    expect(screen.getAllByText(/last updated/i)).toHaveLength(1);
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument();
  });
});
