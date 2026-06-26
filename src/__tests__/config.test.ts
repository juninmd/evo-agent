import { describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

const baseEnv = {
  LITELLM_API_BASE: "http://litellm.test/v1",
  LITELLM_MODEL: "test-model",
};

describe("loadConfig", () => {
  it("allows CRAWL mode without publishing credentials", () => {
    const config = loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" });
    expect(config.runMode).toBe("CRAWL");
    expect(config.github.token).toBe("");
    expect(config.telegram.botToken).toBe("");
  });

  it("supports side-effect-free module configuration in CI", () => {
    expect(() => loadConfig({}, false)).not.toThrow();
  });

  it("requires publishing credentials for DAILY mode", () => {
    expect(() => loadConfig({ ...baseEnv, RUN_MODE: "DAILY" })).toThrow(
      /TELEGRAM_BOT_TOKEN/,
    );
  });

  it("supports EBOOK mode as a publishing job", () => {
    const config = loadConfig({
      ...baseEnv,
      RUN_MODE: "EBOOK",
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat",
      GITHUB_TOKEN: "github",
      GITHUB_OWNER: "owner",
      GITHUB_REPO: "repo",
    });

    expect(config.runMode).toBe("EBOOK");
  });

  it("rejects invalid numeric and cron configuration", () => {
    expect(() =>
      loadConfig({
        ...baseEnv,
        RUN_MODE: "CRAWL",
        CRAWL_INTERVAL_MINUTES: "0",
      }),
    ).toThrow(/CRAWL_INTERVAL_MINUTES/);

    expect(() =>
      loadConfig({
        ...baseEnv,
        RUN_MODE: "DAEMON",
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_CHAT_ID: "chat",
        GITHUB_TOKEN: "github",
        GITHUB_OWNER: "owner",
        GITHUB_REPO: "repo",
        ARTICLE_CRON: "invalid",
      }),
    ).toThrow(/ARTICLE_CRON/);
  });
});
