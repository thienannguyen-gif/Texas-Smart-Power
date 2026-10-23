import { describe, expect, it } from "vitest";
import { httpUrl, telHref } from "./links";

describe("httpUrl", () => {
  it("accepts http and https addresses", () => {
    expect(httpUrl("https://example.com/a?b=1")).toBe(
      "https://example.com/a?b=1",
    );
    expect(httpUrl("http://example.com")).toBe("http://example.com/");
    expect(httpUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "mailto:a@b.co",
    "ftp://example.com",
    "//example.com",
    "example.com",
    "not a url",
    "",
    null,
    undefined,
  ])("refuses %j", (value) => {
    expect(httpUrl(value as string | null | undefined)).toBeNull();
  });
});

describe("telHref", () => {
  it("keeps digits and a leading plus", () => {
    expect(telHref("(800) 805-6580")).toBe("tel:8008056580");
    expect(telHref("+1 800 805 6580")).toBe("tel:+18008056580");
  });

  it("is null when there is no number", () => {
    expect(telHref("")).toBeNull();
    expect(telHref("call us")).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});
