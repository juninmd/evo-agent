import { describe, expect, it } from "vitest";
import { loadConfig, parseEnvFile } from "../config.js";

const baseEnv = {
  LITELLM_API_BASE: "http://litellm.test/v1",
  LITELLM_MODEL: "test-model",
};

describe("loadConfig", () => {
  it("keeps the embedding dedup threshold in (0, 1]", () => {
    const env = { ...baseEnv, RUN_MODE: "CRAWL" };
    expect(loadConfig(env).embedding.duplicateThreshold).toBe(0.88);
    expect(() => loadConfig({ ...env, EMBEDDING_DUP_THRESHOLD: "88" })).toThrow(
      /EMBEDDING_DUP_THRESHOLD/,
    );
  });

  // The cluster's Gemini-backed nomic-embed-text sits in free-tier cooldown;
  // local/nomic-embed is the Ollama alias with no quota.
  it("defaults to the quota-free local embedding alias", () => {
    expect(loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" }).embedding.model).toBe(
      "local/nomic-embed",
    );
  });

  it("disables embeddings with an empty model", () => {
    expect(
      loadConfig({ ...baseEnv, RUN_MODE: "CRAWL", EMBEDDING_MODEL: "" })
        .embedding.model,
    ).toBe("");
  });

  it("allows CRAWL mode without publishing credentials", () => {
    const config = loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" });
    expect(config.runMode).toBe("CRAWL");
    expect(config.github.token).toBe("");
    expect(config.telegram.botToken).toBe("");
  });

  it("schedules three daily editions by default", () => {
    const config = loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" });
    expect(config.dailyEditions).toBe(3);
    expect(config.articleCron).toBe("0 8,13,18 * * *");
  });

  // The schedules and the daily-edition day key are both wall-clock; leaving
  // the container's UTC default in place ran the 22h sweep at 01h local.
  it("defaults the cron timezone to BRT and honours TZ", () => {
    expect(loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" }).timezone).toBe(
      "America/Sao_Paulo",
    );
    expect(
      loadConfig({ ...baseEnv, RUN_MODE: "CRAWL", TZ: "Europe/Lisbon" })
        .timezone,
    ).toBe("Europe/Lisbon");
  });

  it("rejects an unknown timezone instead of silently using UTC", () => {
    expect(() =>
      loadConfig({ ...baseEnv, RUN_MODE: "CRAWL", TZ: "Mars/Olympus" }),
    ).toThrow(/TZ is invalid/);
  });

  // LiteLLM owns provider choice and fallbacks; the app must only ever ask for cloud/auto.
  it("defaults every model in the chain to cloud/auto", () => {
    const { litellm } = loadConfig({ RUN_MODE: "CRAWL" });
    expect(litellm.model).toBe("cloud/auto");
    expect(litellm.fallbackModels).toEqual(["cloud/auto"]);
  });

  it("supports side-effect-free module configuration in CI", () => {
    expect(() => loadConfig({}, false)).not.toThrow();
  });

  it("requires publishing credentials for DAILY mode", () => {
    expect(() => loadConfig({ ...baseEnv, RUN_MODE: "DAILY" })).toThrow(
      /TELEGRAM_BOT_TOKEN/,
    );
  });

  // O sweep fecha o dia publicando o que faltar do orcamento; sem ele, um
  // daily que falha deixa o dia com zero edicoes.
  it("accepts DAILY_SWEEP as a publishing job", () => {
    const config = loadConfig({
      ...baseEnv,
      RUN_MODE: "DAILY_SWEEP",
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat",
      GITHUB_TOKEN: "github",
      GITHUB_OWNER: "owner",
      GITHUB_REPO: "repo",
    });
    expect(config.runMode).toBe("DAILY_SWEEP");
    expect(() => loadConfig({ ...baseEnv, RUN_MODE: "DAILY_SWEEP" })).toThrow(
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

  it("runs MODEL_ALERTS with Telegram only, since it never publishes Pages", () => {
    const config = loadConfig({
      ...baseEnv,
      RUN_MODE: "MODEL_ALERTS",
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "chat",
    });
    expect(config.runMode).toBe("MODEL_ALERTS");
    expect(config.modelAlertCron).toBe("*/30 * * * *");
    expect(() => loadConfig({ ...baseEnv, RUN_MODE: "MODEL_ALERTS" })).toThrow(
      /TELEGRAM_BOT_TOKEN/,
    );
    expect(() =>
      loadConfig({
        ...baseEnv,
        RUN_MODE: "CRAWL",
        MODEL_ALERT_CRON: "invalid-cron",
      }),
    ).toThrow(/MODEL_ALERT_CRON is invalid/);
  });

  it("defaults radarCron and validates it", () => {
    const config = loadConfig({ ...baseEnv, RUN_MODE: "CRAWL" });
    expect(config.radarCron).toBe("0 21 * * *");

    expect(() =>
      loadConfig({
        ...baseEnv,
        RUN_MODE: "CRAWL",
        RADAR_CRON: "invalid-cron",
      }),
    ).toThrow(/RADAR_CRON is invalid/);
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

describe("parseEnvFile", () => {
  it("strips matching single and double quotes", () => {
    expect(
      parseEnvFile(`TELEGRAM_CHAT_ID="-1001"\nNAME='evo'\nMIXED="it's"`),
    ).toEqual({ TELEGRAM_CHAT_ID: "-1001", NAME: "evo", MIXED: "it's" });
  });

  it("accepts the export prefix", () => {
    expect(parseEnvFile("export GITHUB_OWNER=juninmd")).toEqual({
      GITHUB_OWNER: "juninmd",
    });
  });

  it("drops inline comments outside quotes but keeps # inside quotes", () => {
    expect(parseEnvFile('LOG_LEVEL=info # padrao\nTOKEN="a#b" # nota')).toEqual(
      { LOG_LEVEL: "info", TOKEN: "a#b" },
    );
  });

  it("skips blank and comment lines, handles CRLF and values containing =", () => {
    expect(
      parseEnvFile("# comentario\r\n\r\nLITELLM_API_KEY=abc=def\r\n"),
    ).toEqual({ LITELLM_API_KEY: "abc=def" });
  });
});
