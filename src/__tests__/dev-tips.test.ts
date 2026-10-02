import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-dev-tips-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "tips.db"), timezone: "America/Sao_Paulo" },
}));

const { getDb } = await import("../knowledge/store.js");
const {
  DEV_TIPS_MAX_ITEMS,
  devTipCandidates,
  generateDevTips,
  validateTips,
  vscodeHighlights,
} = await import("../agent/dev-tips.js");
type Article = import("../knowledge/store.js").Article;

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "v2.1.0",
    source: "Claude Code Releases",
    url: "https://github.com/anthropics/claude-code/releases/tag/v2.1.0",
    summary: "Added /goal to keep a session working until a condition holds.",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-09-10T10:00:00Z",
    ...overrides,
  };
}

const vscode = (n: number, overrides: Partial<Article> = {}) =>
  article({
    title: `Visual Studio Code 1.${n}`,
    source: "VSCode Updates",
    url: `https://code.visualstudio.com/updates/v1_${n}`,
    summary: "Learn what is new. Read the full article",
    ...overrides,
  });

const opencode = (n: number) =>
  article({
    title: `v1.18.${n}`,
    source: "OpenCode Releases",
    url: `https://github.com/anomalyco/opencode/releases/tag/v1.18.${n}`,
    summary: "Fixed MCP browser launch failures.",
  });

function tip(url: string, example = "`/goal tests green`") {
  return `### Claude Code: Dica\n**Novidade:** x\n**Como usar:** y\n**Boa prática:** z\n**Exemplo:** ${example}\nFonte: ${url}`;
}

describe("devTipCandidates", () => {
  it("keeps the three tools, drops reddit, blog posts and unrelated news", () => {
    const rows = [
      article({ url: "https://r/1" }),
      article({
        source: "Anthropic News",
        title: "Claude Code workflows",
        url: "https://a/1",
      }),
      article({
        source: "Anthropic News",
        title: "Funding round",
        summary: "Series G.",
        url: "https://a/2",
      }),
      article({
        source: "Reddit: ClaudeCode",
        title: "my claude code setup",
        url: "https://reddit/1",
      }),
      vscode(140),
      vscode(0, {
        title: "Building Copilot suggestions",
        url: "https://code.visualstudio.com/blogs/2026/09/23/x",
      }),
      opencode(34),
    ];
    expect(devTipCandidates(rows).map((row) => row.url)).toEqual([
      "https://r/1",
      "https://code.visualstudio.com/updates/v1_140",
      "https://github.com/anomalyco/opencode/releases/tag/v1.18.34",
      "https://a/1",
    ]);
  });

  // The Claude Code feed ships several releases a week; a cap shared with
  // slow feeds left the first prototype with three candidates.
  it("takes more Claude Code releases than the other tools and interleaves", () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, n) =>
        article({ title: `v2.1.${n}`, url: `https://r/${n}` }),
      ),
      ...[1, 2, 3, 4, 5].map((n) => vscode(n)),
      ...[1, 2, 3, 4, 5].map(opencode),
    ];
    const urls = devTipCandidates(rows).map((row) => row.source);
    expect(urls.filter((s) => s === "Claude Code Releases")).toHaveLength(4);
    expect(urls.filter((s) => s === "VSCode Updates")).toHaveLength(3);
    expect(urls.filter((s) => s === "OpenCode Releases")).toHaveLength(3);
    expect(urls.slice(0, 3)).toEqual([
      "Claude Code Releases",
      "VSCode Updates",
      "OpenCode Releases",
    ]);
  });

  it("drops prereleases, Insiders builds and duplicate urls", () => {
    const rows = [
      article({ title: "v2.2.0-beta.1", url: "https://r/b" }),
      vscode(141, { title: "Visual Studio Code 1.141 (Insiders)" }),
      article({ url: "https://r/1" }),
      article({ url: "https://r/1" }),
    ];
    expect(devTipCandidates(rows).map((row) => row.url)).toEqual([
      "https://r/1",
    ]);
  });
});

describe("vscodeHighlights", () => {
  it("extracts the highlights block as plain text without links", () => {
    const notes = `# VS Code 1.140
<!-- RELEASE_HIGHLIGHTS_START -->
## Release highlights

This release expands agent workflows.

* [Copilot harness](#copilot-harness): Consistent agent behavior.

* [Remote delegation](#remote): Delegate tasks to remote hosts.
<!-- RELEASE_HIGHLIGHTS_END -->
## Agents
long body`;
    expect(vscodeHighlights(notes)).toBe(
      "This release expands agent workflows. Copilot harness: Consistent agent behavior. Remote delegation: Delegate tasks to remote hosts.",
    );
  });

  it("falls back to the note body, without front matter, comments or links", () => {
    const notes = `---
Order: 148
---
# Visual Studio Code 1.138
<!-- %IF IN_PRODUCT % -->
## Agents
Pick a [model](https://x.example) per session.
## Chat`;
    expect(vscodeHighlights(notes)).toBe(
      "Agents Pick a model per session. Chat",
    );
  });
});

describe("validateTips", () => {
  const pool = [article({ url: "https://r/1" })];

  it("accepts a tip grounded in the pool", () => {
    expect(validateTips(tip("https://r/1"), pool)).not.toBeNull();
  });

  it("rejects an invented source", () => {
    expect(validateTips(tip("https://r/404"), pool)).toBeNull();
  });

  it("rejects a slash command or flag that is not in the material", () => {
    expect(
      validateTips(tip("https://r/1", "`/teleport now`"), pool),
    ).toBeNull();
    expect(
      validateTips(tip("https://r/1", "`claude --yolo-mode`"), pool),
    ).toBeNull();
  });

  it("rejects an item missing a label and more items than the budget", () => {
    expect(validateTips("### Dica\nFonte: https://r/1", pool)).toBeNull();
    const many = Array.from({ length: DEV_TIPS_MAX_ITEMS + 1 }, () =>
      tip("https://r/1"),
    ).join("\n\n");
    expect(validateTips(many, pool)).toBeNull();
  });
});

describe("generateDevTips", () => {
  const pool = [
    article({ url: "https://r/1" }),
    vscode(140),
    opencode(34),
    opencode(33),
    opencode(32),
    vscode(139),
    vscode(138),
  ];
  const run = (
    ask: () => Promise<string>,
    load = () => pool,
    enrich = async (row: Article) => row,
  ) => generateDevTips(new Date(), { load, ask, enrich });

  it("publishes the model tips with the tool and version as source label", async () => {
    const digest = await run(async () => tip("https://r/1"));
    expect(digest.content).toContain(
      "Fonte: [Claude Code v2.1.0](https://r/1)",
    );
    expect(digest.sources).toEqual(["https://r/1"]);
    expect(digest.reportPeriod).toBe("devtips");
    expect(digest.slug).toMatch(/^devtips-\d{4}-\d{2}-\d{2}$/);
  });

  // The VS Code feed only says "Read the full article"; the teaching has to
  // come from the release notes, so a command there must count as grounded.
  it("grounds commands in the enriched VS Code notes", async () => {
    const enrich = async (row: Article) =>
      row.source === "VSCode Updates"
        ? { ...row, summary: "Run /new-worktree to reuse folders." }
        : row;
    const digest = await run(
      async () =>
        tip("https://code.visualstudio.com/updates/v1_140", "`/new-worktree`"),
      () => pool,
      enrich,
    );
    expect(digest.sources).toEqual([
      "https://code.visualstudio.com/updates/v1_140",
    ]);
    expect(digest.content).toContain("Fonte: [Visual Studio Code 1.140]");
  });

  it("falls back to the ranking when the model breaks the contract or is down", async () => {
    const invented = await run(async () => tip("https://evil.example/x"));
    expect(invented.content).not.toContain("evil.example");
    expect(invented.sources).toHaveLength(DEV_TIPS_MAX_ITEMS);
    const down = await run(async () => {
      throw new Error("LLM unavailable");
    });
    expect(down.sources).toHaveLength(DEV_TIPS_MAX_ITEMS);
  });

  it("refuses to publish when the week had no news from the three tools", async () => {
    await expect(
      run(
        async () => "",
        () => [],
      ),
    ).rejects.toThrow(/No Claude Code, VS Code or OpenCode news/);
  });
});
