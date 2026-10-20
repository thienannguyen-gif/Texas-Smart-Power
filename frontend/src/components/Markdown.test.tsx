import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown, parseBlocks } from "./Markdown";

describe("parseBlocks", () => {
  it("splits headings, paragraphs, lists, quotes and rules", () => {
    const blocks = parseBlocks(
      [
        "# Title",
        "",
        "First line",
        "second line of the same paragraph.",
        "",
        "## Section",
        "- one",
        "- two",
        "  continued",
        "",
        "1. alpha",
        "2. beta",
        "",
        "> quoted",
        "> text",
        "",
        "---",
        "After",
      ].join("\n"),
    );
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Title" },
      {
        kind: "paragraph",
        text: "First line second line of the same paragraph.",
      },
      { kind: "heading", level: 2, text: "Section" },
      { kind: "list", ordered: false, items: ["one", "two continued"] },
      { kind: "list", ordered: true, items: ["alpha", "beta"] },
      { kind: "quote", text: "quoted text" },
      { kind: "rule" },
      { kind: "paragraph", text: "After" },
    ]);
  });

  it("copes with Windows line endings and an empty file", () => {
    expect(parseBlocks("# A\r\n\r\ntext\r\n")).toEqual([
      { kind: "heading", level: 1, text: "A" },
      { kind: "paragraph", text: "text" },
    ]);
    expect(parseBlocks("")).toEqual([]);
  });
});

describe("Markdown", () => {
  it("renders real headings, lists and inline formatting", () => {
    render(
      <Markdown
        source={
          "## Heading\n\nSome **bold**, *italic* and `code`.\n\n- item one\n- item two"
        }
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Heading" }),
    ).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("code").tagName).toBe("CODE");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("opens external links in a new tab and keeps in-page links in place", () => {
    render(
      <Markdown source="See [the site](https://example.com) or [top](#top)." />,
    );
    const external = screen.getByRole("link", { name: "the site" });
    expect(external).toHaveAttribute("href", "https://example.com");
    expect(external).toHaveAttribute("target", "_blank");
    expect(external).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener"),
    );
    expect(screen.getByRole("link", { name: "top" })).not.toHaveAttribute(
      "target",
    );
  });

  it("never turns text into live markup or unsafe links", () => {
    const { container } = render(
      <Markdown
        source={
          "<script>alert(1)</script> <b>x</b>\n\n[bad](javascript:alert(1))"
        }
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(
      screen.getByText("<script>alert(1)</script> <b>x</b>"),
    ).toBeInTheDocument();
    // the label stays as plain text, with no link
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/^bad/)).toBeInTheDocument();
  });
});
