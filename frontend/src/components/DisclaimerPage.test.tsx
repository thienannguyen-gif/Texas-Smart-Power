import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisclaimerPage, splitLastUpdated } from "./DisclaimerPage";

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe("splitLastUpdated", () => {
  it.each([
    ["**Last updated:** 20 October 2026", "20 October 2026"],
    ["Last updated: 20 October 2026", "20 October 2026"],
    ["_Last Updated - October 2026_", "October 2026"],
    ["*Last updated:* 2026-10-20", "2026-10-20"],
  ])("finds the date in %j", (line, date) => {
    const result = splitLastUpdated(`# Title\n\n${line}\n\nBody text.`);
    expect(result.date).toBe(date);
    expect(result.body).not.toMatch(/last updated/i);
    expect(result.body).toContain("Body text.");
  });

  it("reports no date when the text has none", () => {
    expect(splitLastUpdated("# Title\n\nBody").date).toBeNull();
  });
});

describe("DisclaimerPage", () => {
  const source = [
    "# Disclaimer & Terms of Use",
    "",
    "**Last updated:** 20 October 2026",
    "",
    "## 1. Information only",
    "",
    "Plan data comes from a public source.",
    "",
    "- Check the EFL",
    "- Confirm before enrolling",
  ].join("\n");

  it("shows the title, then the Last updated date at the top, then the text", () => {
    render(<DisclaimerPage source={source} />);
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
    // the date is shown once, not repeated in the body
    expect(screen.getAllByText(/last updated/i)).toHaveLength(1);
  });

  it("is a readable single column with a way back", () => {
    render(<DisclaimerPage source={source} />);
    expect(screen.getByRole("article")).toHaveClass(
      "max-w-[75ch]",
      "leading-7",
    );
    expect(
      screen.getByRole("link", { name: /back to plans/i }),
    ).toHaveAttribute("href", "#");
  });

  it("scrolls to the top when it opens", () => {
    render(<DisclaimerPage source={source} />);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("renders the real docs/DISCLAIMER.md with a title and a Last updated line", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument();
  });
});
