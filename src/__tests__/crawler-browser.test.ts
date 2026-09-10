import { beforeEach, describe, expect, it, vi } from "vitest";

const close = vi.fn().mockResolvedValue(undefined);
const newPage = vi.fn().mockResolvedValue({ id: "page" });
const newContext = vi.fn().mockResolvedValue({ newPage, close });

vi.mock("playwright-extra", () => ({
  chromium: {
    use: vi.fn(),
    launch: vi.fn().mockResolvedValue({
      newContext,
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

const { withStealthPage } = await import("../crawler/index.js");

describe("withStealthPage", () => {
  beforeEach(() => {
    close.mockClear();
    newContext.mockClear();
  });

  it("closes the browser context after a successful run", async () => {
    await expect(withStealthPage(async () => "done")).resolves.toBe("done");
    expect(close).toHaveBeenCalledTimes(1);
  });

  // The 403/429 fallback runs once per failing source: a context leaked per
  // throw grew unbounded with the failure count until the crawl ended.
  it("closes the browser context when the run throws", async () => {
    await expect(
      withStealthPage(async () => {
        throw new Error("navigation failed");
      }),
    ).rejects.toThrow("navigation failed");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("merges caller options over the stealth defaults", async () => {
    await withStealthPage(async () => null, {
      extraHTTPHeaders: { Accept: "application/rss+xml" },
    });
    expect(newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userAgent: expect.stringContaining("Mozilla/5.0"),
        extraHTTPHeaders: { Accept: "application/rss+xml" },
      }),
    );
  });
});
