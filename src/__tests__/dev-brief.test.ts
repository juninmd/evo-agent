import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Article } from "../knowledge/store.js";

const dir = mkdtempSync(join(tmpdir(), "evo-dev-brief-"));
process.env.DB_PATH = join(dir, "brief.db");

const { getDb } = await import("../knowledge/store.js");
const { feedbackStore, sourceWeights } = await import(
  "../knowledge/feedback-store.js"
);
const { feedbackRows, isConfiguredChat, itemKey, parseCallback, pollFeedback } =
  await import("../notifier/feedback.js");
const { runDevAlerts, CLAUDE_ALERTS_KEY } = await import(
  "../notifier/dev-alerts.js"
);
const { pickTop, sortSection, stackScore } = await import(
  "../agent/dev-brief/rank.js"
);
const { breakingItems, generateDevBrief } = await import(
  "../agent/dev-brief/index.js"
);
const { buildThemeFeeds } = await import("../publisher/feed.js");

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

let nextId = 1;
function article(over: Partial<Article>): Article {
  return {
    id: nextId++,
    title: "t",
    source: "s",
    url: `https://example.com/${nextId}`,
    summary: "summary",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-11-22 10:00:00",
    body: null,
    ...over,
  };
}

const item = (
  section: "claude" | "repos" | "tools",
  title: string,
  source = "s",
) => ({
  section,
  title,
  url: `https://x/${title}`,
  line: title,
  source,
  strength: 0,
});

describe("ranking", () => {
  it("matches stack terms as words, capped at 2", () => {
    const stack = ["go", "typescript", "mcp", "python"];
    expect(stackScore("Google release", stack)).toBe(0);
    expect(stackScore("MCP server in TypeScript and Python", stack)).toBe(2);
  });

  // Votes and stack reorder within a section; quotas keep every section present.
  it("lets votes reorder a section and quotas keep sections balanced", () => {
    const ctx = {
      stack: [],
      weights: new Map([
        ["liked", 0.8],
        ["meh", -0.8],
      ]),
    };
    const tools = sortSection(
      [item("tools", "a", "meh"), item("tools", "b", "liked")],
      ctx,
    );
    expect(tools.map((i) => i.title)).toEqual(["b", "a"]);
    const top = pickTop(
      new Map([
        ["claude", ["c1", "c2", "c3", "c4"].map((t) => item("claude", t))],
        ["repos", [item("repos", "r1")]],
        ["tools", tools],
      ]),
    );
    expect(top.map((i) => i.title)).toEqual(["c1", "c2", "r1", "b", "c3"]);
  });

  it("weights sources by votes with a prior, already-known at half", () => {
    const weights = sourceWeights([
      { source: "a", vote: "up", count: 3 },
      { source: "b", vote: "known", count: 2 },
    ]);
    expect(weights.get("a")).toBeCloseTo(0.6);
    expect(weights.get("b")).toBeCloseTo(-0.25);
  });
});

describe("breaking", () => {
  it("lists removals inside 60 days, nearest first, past ones dropped", () => {
    const rows = [
      article({
        title: "Claude API 2026-10-01: B",
        tags: '["removal:2026-12-20"]',
      }),
      article({
        title: "Claude API 2026-10-01: A",
        tags: '["removal:2026-11-30"]',
      }),
      article({ title: "Old", tags: '["removal:2026-11-01"]' }),
      article({ title: "Far", tags: '["removal:2027-06-01"]' }),
    ];
    expect(breakingItems(rows, "2026-11-22").map((i) => i.title)).toEqual([
      "Até 30/11/2026: A",
      "Até 20/12/2026: B",
    ]);
  });
});

describe("generateDevBrief", () => {
  const deps = {
    recent: () => [
      article({
        source: "Claude Platform Release Notes",
        title: "Claude API 2026-11-21: Linked billing",
        summary: "Linked billing beta. Set billing_policy per request.",
      }),
      article({
        source: "MCP Registry",
        title: "MCP: Srv",
        body: "```bash\nnpx -y srv\n```",
      }),
      article({ source: "Random Blog", title: "ignored" }),
    ],
    breaking: () => [
      article({ title: "Fast mode", tags: '["removal:2026-11-30"]' }),
    ],
    catalog: async () => [
      {
        id: "anthropic/claude-x",
        name: "Claude X",
        created: Math.floor(Date.parse("2026-11-21T12:00:00Z") / 1000),
        pricing: { prompt: "0.000003", completion: "0.000015" },
        context_length: 1_000_000,
      },
    ],
    velocity: () => [
      {
        repo: "o/r",
        url: "https://github.com/o/r",
        description: "d",
        stars: 900,
        starsToday: 120,
        perDay: 120,
        isNew: true,
      },
    ],
    readme: async () => "```bash\npip install r\n```",
    rank: () => ({ stack: [], weights: new Map() }),
  };

  it("builds every section and a 5-item numbered message", async () => {
    const brief = await generateDevBrief(
      new Date("2026-11-22T12:00:00Z"),
      deps,
    );
    expect(brief.top.map((i) => i.section)).toEqual([
      "breaking",
      "claude",
      "models",
      "repos",
      "tools",
    ]);
    expect(brief.article.slug).toBe("devbrief-2026-11-22");
    expect(brief.article.content).toContain(
      "| Claude X | $3 / $15 | 1000k | fechados |",
    );
    expect(brief.article.content).toContain("pip install r");
    expect(brief.article.content).not.toContain("ignored");
    expect(brief.message).toMatch(/^⚡ <b>Radar dev 22\/11\/2026<\/b>/);
    expect(brief.message).toContain("5. 🛠️");
    // API identifiers keep their underscores in both outputs.
    expect(brief.message).toContain("billing_policy");
    expect(brief.article.content).toContain("billing_policy");
  });

  it("still publishes when the model catalog is down", async () => {
    const brief = await generateDevBrief(new Date("2026-11-22T12:00:00Z"), {
      ...deps,
      catalog: async () => {
        throw new Error("down");
      },
    });
    expect(brief.top.some((i) => i.section === "models")).toBe(false);
  });

  it("refuses to publish an empty brief", async () => {
    await expect(
      generateDevBrief(new Date(), {
        ...deps,
        recent: () => [],
        breaking: () => [],
        catalog: async () => [],
        velocity: () => [],
      }),
    ).rejects.toThrow(/Nothing new/);
  });
});

describe("feedback", () => {
  it("encodes one vote row per item within Telegram's 64-byte limit", () => {
    const rows = feedbackRows([itemKey("https://a"), itemKey("https://b")]);
    expect(rows).toHaveLength(2);
    for (const button of rows.flat()) {
      expect(Buffer.byteLength(button.callback_data ?? "")).toBeLessThanOrEqual(
        64,
      );
      expect(parseCallback(button.callback_data)).not.toBeNull();
    }
    expect(parseCallback("fb:zz:u")).toBeNull();
  });

  it("records one vote per person, from the configured chat only", async () => {
    const key = itemKey("https://voted");
    feedbackStore.register({
      key,
      url: "https://voted",
      source: "MCP Registry",
      title: "x",
    });
    const state = new Map<string, string>();
    const answer = vi.fn(async () => {});
    const updates = [
      {
        update_id: 10,
        callback_query: {
          id: "q1",
          data: `fb:${key}:d`,
          from: { id: 7 },
          message: { chat: { id: 42 } },
        },
      },
      {
        update_id: 11,
        callback_query: {
          id: "q2",
          data: `fb:${key}:d`,
          from: { id: 8 },
          message: { chat: { id: 999 } },
        },
      },
      {
        update_id: 12,
        callback_query: {
          id: "q3",
          data: "fb:0000000000:u",
          from: { id: 7 },
          message: { chat: { id: 42 } },
        },
      },
      // Same person presses again: the vote is replaced, not stacked.
      {
        update_id: 13,
        callback_query: {
          id: "q4",
          data: `fb:${key}:u`,
          from: { id: 7 },
          message: { chat: { id: 42 } },
        },
      },
    ];
    const deps = {
      getState: (k: string) => state.get(k) ?? null,
      setState: (k: string, v: string) => void state.set(k, v),
      getUpdates: vi.fn(async () => updates),
      answer,
      chatId: "42",
    };
    expect(await pollFeedback(deps)).toEqual({ recorded: 2, ignored: 2 });
    expect(deps.getUpdates).toHaveBeenCalledWith(0);
    expect(state.get("telegram_updates_offset")).toBe("14");
    expect(feedbackStore.tallies()).toEqual([
      { source: "MCP Registry", vote: "up", count: 1 },
    ]);
  });
});

describe("isConfiguredChat", () => {
  it("matches a numeric id or an @channel username", () => {
    expect(isConfiguredChat({ id: -100 }, "-100")).toBe(true);
    expect(isConfiguredChat({ id: -100, username: "Evo" }, "@evo")).toBe(true);
    expect(isConfiguredChat({ id: -100 }, "@evo")).toBe(false);
    expect(isConfiguredChat(undefined, "-100")).toBe(false);
  });
});

describe("dev alerts", () => {
  const note = (day: string, tags = "[]") =>
    article({
      url: `https://platform.claude.com/docs/en/release-notes/overview#${day}-abcdef0123`,
      title: `Note ${day}`,
      tags,
    });

  it("baselines Claude notes silently, then alerts only new ones", async () => {
    const state = new Map<string, string>();
    const store = {
      getState: (k: string) => state.get(k) ?? null,
      setState: (k: string, v: string) => void state.set(k, v),
    };
    const send = vi.fn(async () => ({ delivered: true }));
    let notes = [note("2026-11-21")];
    const run = () =>
      runDevAlerts({ store, notes: () => notes, send, today: "2026-11-22" });
    expect(await run()).toEqual({ alerted: 0, failed: 0 });
    expect(state.has(CLAUDE_ALERTS_KEY)).toBe(true);
    notes = [...notes, note("2026-11-22")];
    expect(await run()).toEqual({ alerted: 1, failed: 0 });
    expect(send).toHaveBeenCalledWith(
      "claude",
      "Note 2026-11-22",
      "summary",
      notes[1].url,
    );
  });

  // A removal days away is urgent even on the very first run.
  it("alerts a removal within 7 days on the first run, once", async () => {
    const state = new Map<string, string>();
    const store = {
      getState: (k: string) => state.get(k) ?? null,
      setState: (k: string, v: string) => void state.set(k, v),
    };
    const send = vi.fn(async () => ({ delivered: true }));
    const notes = [
      note("2026-09-01", '["removal:2026-11-28"]'),
      note("2026-09-02", '["removal:2026-12-30"]'),
    ];
    const run = () =>
      runDevAlerts({ store, notes: () => notes, send, today: "2026-11-22" });
    await run();
    await run();
    const breaking = send.mock.calls.filter((call) => call[0] === "breaking");
    expect(breaking).toHaveLength(1);
    expect(breaking[0][1]).toMatch(/^28\/11\/2026:/);
  });
});

describe("theme feeds", () => {
  it("routes items into claude, modelos and repos feeds", () => {
    const feeds = buildThemeFeeds(
      [
        {
          date: "2026-11-22",
          title: "Novidades do Claude",
          url: "https://s/1",
          tags: [],
        },
        {
          date: "2026-11-21",
          title: "Repositórios em alta",
          url: "https://s/2",
          tags: ["github"],
        },
      ],
      { baseUrl: "https://s/", title: "Evo", description: "d" },
    );
    const byPath = new Map(feeds.map((f) => [f.path, f.content]));
    expect(byPath.get("feeds/claude.xml")).toContain("https://s/1");
    expect(byPath.get("feeds/claude.xml")).not.toContain("https://s/2");
    expect(byPath.get("feeds/repos.xml")).toContain("https://s/2");
    expect(byPath.get("feeds/repos.xml")).toContain(
      'href="https://s/feeds/repos.xml"',
    );
  });
});
