import type { BrowserContextOptions, Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { log } from "../utils/logger.js";

chromium.use(stealth());

const BROWSER_LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

type Browser = Awaited<ReturnType<typeof chromium.launch>>;

let sharedBrowser: Promise<Browser> | null = null;

/**
 * One browser for the whole crawl; pages per task instead of per launch. The
 * launch promise is what gets shared: feeds are crawled four at a time, and
 * two 403 fallbacks arriving together used to launch two browsers, of which
 * only the last one was ever closed.
 */
function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    const launching = chromium.launch({
      headless: true,
      args: BROWSER_LAUNCH_ARGS,
    });
    sharedBrowser = launching;
    // A failed launch must not be remembered: the next caller retries.
    launching.catch(() => {
      if (sharedBrowser === launching) sharedBrowser = null;
    });
  }
  return sharedBrowser;
}

export async function closeSharedBrowser() {
  const launching = sharedBrowser;
  sharedBrowser = null;
  if (!launching) return;
  const browser = await launching.catch(() => null);
  await browser?.close();
}

const STEALTH_USER_AGENT =
  "Mozilla/5.0 (Windows 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/**
 * Owns the Playwright context lifecycle. Contexts are not reclaimed until the
 * browser closes, so every call site that opened one by hand leaked a context
 * plus a page for the rest of the crawl -- one per 403/429 fallback.
 */
export async function withStealthPage<T>(
  run: (page: Page) => Promise<T>,
  options: BrowserContextOptions = {},
): Promise<T> {
  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    userAgent: STEALTH_USER_AGENT,
    viewport: { width: 1280, height: 720 },
    ...options,
  });
  try {
    return await run(await context.newPage());
  } finally {
    await context.close().catch((err: unknown) => {
      log.warn(`Failed to close browser context: ${(err as Error).message}`);
    });
  }
}
