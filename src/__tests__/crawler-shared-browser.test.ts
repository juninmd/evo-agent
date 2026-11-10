import { beforeEach, describe, expect, it, vi } from "vitest";

const browserClose = vi.fn().mockResolvedValue(undefined);
const contextClose = vi.fn().mockResolvedValue(undefined);
const newContext = vi.fn().mockResolvedValue({
  newPage: vi.fn().mockResolvedValue({}),
  close: contextClose,
});
const launch = vi.fn();

vi.mock("playwright-extra", () => ({
  chromium: { use: vi.fn(), launch },
}));

const { closeSharedBrowser, withStealthPage } = await import(
  "../crawler/browser.js"
);

const slowLaunch = () =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ newContext, close: browserClose }), 10),
  );

describe("shared crawl browser", () => {
  beforeEach(async () => {
    await closeSharedBrowser();
    launch.mockReset();
    browserClose.mockClear();
  });

  // Feeds are crawled four at a time: two 403 fallbacks arriving together
  // both saw "no browser yet" and launched one each; only the last was closed.
  it("launches once when two fallbacks arrive together", async () => {
    launch.mockImplementation(slowLaunch);

    await Promise.all([
      withStealthPage(async () => "a"),
      withStealthPage(async () => "b"),
    ]);
    expect(launch).toHaveBeenCalledTimes(1);

    await closeSharedBrowser();
    expect(browserClose).toHaveBeenCalledTimes(1);

    // Closed means the next crawl starts a fresh one.
    await withStealthPage(async () => "c");
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("does not remember a launch that failed", async () => {
    launch.mockRejectedValueOnce(new Error("no chromium"));
    await expect(withStealthPage(async () => "a")).rejects.toThrow(
      "no chromium",
    );

    launch.mockImplementation(slowLaunch);
    await expect(withStealthPage(async () => "b")).resolves.toBe("b");
    expect(launch).toHaveBeenCalledTimes(2);
  });
});
