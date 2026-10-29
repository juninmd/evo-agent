import { describe, expect, it } from "vitest";
import { canonicalUrl, stripTracking } from "../utils/url.js";

describe("canonicalUrl", () => {
  it("drops tracking params so one story is one key", () => {
    expect(
      canonicalUrl("https://example.com/post?utm_source=rss&utm_medium=feed"),
    ).toBe("https://example.com/post");
    expect(canonicalUrl("https://example.com/post?fbclid=abc&id=7")).toBe(
      "https://example.com/post?id=7",
    );
  });

  it("keeps the fragment: trending signals use it as a per-day key", () => {
    expect(
      canonicalUrl("https://github.com/o/r#trending-daily-2026-10-29"),
    ).toBe("https://github.com/o/r#trending-daily-2026-10-29");
  });

  it("normalizes host case, www, default port and trailing slash", () => {
    expect(canonicalUrl("https://WWW.Example.com:443/a/b/")).toBe(
      "https://example.com/a/b",
    );
    expect(canonicalUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("orders remaining params so equivalent queries match", () => {
    expect(canonicalUrl("https://example.com/p?b=2&a=1")).toBe(
      canonicalUrl("https://example.com/p?a=1&b=2"),
    );
  });

  it("returns non-http or unparsable input untouched", () => {
    expect(canonicalUrl("not a url")).toBe("not a url");
    expect(canonicalUrl("ftp://example.com/x?utm_source=a")).toBe(
      "ftp://example.com/x?utm_source=a",
    );
  });
});

describe("stripTracking", () => {
  it("removes only tracking params and leaves the rest byte for byte", () => {
    expect(
      stripTracking("https://www.example.com/p/?amp&x=1;y=2&utm_source=a#frag"),
    ).toBe("https://www.example.com/p/?amp&x=1;y=2#frag");
  });

  it("drops the question mark when nothing is left", () => {
    expect(stripTracking("https://example.com/p?utm_source=a&fbclid=b")).toBe(
      "https://example.com/p",
    );
  });

  it("returns a URL without a query untouched", () => {
    expect(stripTracking("https://www.example.com/a/#x")).toBe(
      "https://www.example.com/a/#x",
    );
  });
});
