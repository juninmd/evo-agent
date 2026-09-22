import { describe, expect, it, vi } from "vitest";
import { UNTRUSTED_MATERIAL_RULE } from "../agent/prompt-guards.js";
import { RADAR_SYSTEM_PROMPT } from "../agent/radar-reading.js";

vi.mock("../utils/ai.js", () => ({
  ask: vi
    .fn()
    .mockResolvedValue("## TL;DR\n\n1. Launch\n\n## O que observar\n\n- Item"),
}));
import {
  bucketRadarArticles,
  dedupeByUrl,
  displayUrl,
  extractReading,
  fallbackReading,
  generateRadar,
  radarDate,
  radarDigestForModel,
  radarTitle,
  renderRadarTables,
} from "../agent/radar.js";
import { type Article, db } from "../knowledge/store.js";

function article(overrides: Partial<Article>): Article {
  return {
    id: 1,
    title: "t",
    source: "GitHub Trending (daily)",
    url: "https://github.com/a/b#trending-daily-2026-08-06",
    summary: "s",
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-08-06T10:00:00Z",
    ...overrides,
  };
}

describe("radar", () => {
  it("routes each source to a single bucket and drops empty ones", () => {
    const buckets = bucketRadarArticles([
      article({ id: 1, source: "GitHub Trending (daily)" }),
      article({ id: 2, source: "Reddit Community Signals (ClaudeCode)" }),
      article({ id: 3, source: "Hacker News" }),
      article({ id: 4, source: "Anthropic News" }),
      article({ id: 5, source: "arXiv cs.AI" }),
      article({ id: 6, source: "TabNews" }),
    ]);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "github",
      "reddit",
      "hackernews",
      "vendors",
      "papers",
      "community",
    ]);
    expect(buckets.every((bucket) => bucket.articles.length === 1)).toBe(true);
  });

  it("ranks by engagement inside a bucket", () => {
    const [bucket] = bucketRadarArticles([
      article({
        id: 1,
        title: "low",
        engagement_score: 10,
        url: "https://github.com/l/l",
      }),
      article({
        id: 2,
        title: "high",
        engagement_score: 2690,
        url: "https://github.com/h/h",
      }),
    ]);
    expect(bucket.articles.map((item) => item.title)).toEqual(["high", "low"]);
  });

  it("links to the repo, not to the day-scoped signal url", () => {
    expect(displayUrl("https://github.com/a/b#trending-daily-2026-08-06")).toBe(
      "https://github.com/a/b",
    );
  });

  it("renders a table per bucket and escapes pipes in titles", () => {
    const markdown = renderRadarTables(
      bucketRadarArticles([article({ title: "a | b", engagement_score: 42 })]),
    );
    expect(markdown).toContain("## GitHub Trending");
    expect(markdown).toContain("| Item | Resumo | Fonte | Sinal |");
    expect(markdown).toContain("[a \\| b](https://github.com/a/b)");
    expect(markdown).toContain("| 42 |");
  });

  it("keeps an untrusted title from splicing its own link into the table", () => {
    const markdown = renderRadarTables(
      bucketRadarArticles([
        article({ title: "Foo](https://evil.example)[`Bar`" }),
      ]),
    );
    expect(markdown).not.toMatch(/[^\\]\]\(https:\/\/evil\.example\)/);
    expect(markdown).toContain(
      "[Foo\\](https://evil.example)\\[\\`Bar\\`](https://github.com/a/b)",
    );
  });

  it("falls back to a raw ranking when the model is unavailable", () => {
    const reading = fallbackReading(
      bucketRadarArticles([
        article({
          id: 1,
          title: "segundo",
          engagement_score: 5,
          url: "https://github.com/s/s",
        }),
        article({
          id: 2,
          title: "primeiro",
          engagement_score: 500,
          url: "https://github.com/p/p",
        }),
      ]),
    );
    expect(reading).toContain("## TL;DR");
    expect(reading.indexOf("primeiro")).toBeLessThan(
      reading.indexOf("segundo"),
    );
  });

  it("dedupes a repo listed on more than one trending board", () => {
    const deduped = dedupeByUrl([
      article({
        id: 1,
        url: "https://github.com/a/b#trending-daily-2026-08-06",
      }),
      article({
        id: 2,
        url: "https://github.com/a/b#trending-weekly-2026-08-06",
      }),
      article({
        id: 3,
        url: "https://github.com/c/d#trending-daily-2026-08-06",
      }),
    ]);
    expect(deduped.map((item) => item.id)).toEqual([1, 3]);
  });

  it("gives agent releases their own bucket and keeps Google News out of vendors", () => {
    const buckets = bucketRadarArticles(
      [
        "Claude Code Releases",
        "GitHub Changelog",
        "Google News (claude code)",
        "HF Daily Papers",
        "Techlead: Bun Releases",
      ].map((source, index) =>
        article({ id: index + 1, source, url: `https://x/${index + 1}` }),
      ),
    );
    const byKey = Object.fromEntries(
      buckets.map((bucket) => [bucket.key, bucket.articles.map((a) => a.id)]),
    );
    expect(byKey).toEqual({ releases: [1, 2], papers: [4], community: [3, 5] });
  });

  it("summarizes each row in one short line", () => {
    const markdown = renderRadarTables(
      bucketRadarArticles([
        article({ summary: "Adds hooks. ".repeat(40), engagement_score: 1 }),
      ]),
    );
    const row = markdown.split("\n").find((line) => line.startsWith("| [t]"));
    const summaryCell = row?.split(" | ")[1] ?? "";
    expect(summaryCell.startsWith("Adds hooks.")).toBe(true);
    expect(summaryCell.length).toBeLessThanOrEqual(160);
    expect(summaryCell.endsWith("…")).toBe(true);
  });

  it("drops leaked model reasoning and keeps only the edition", () => {
    const leaked = [
      "We need to output TL;DR with 10-12 items. Let's pick:",
      "1. draft item",
      "## TL;DR",
      "",
      "1. Claude Code 2.3 adiciona hooks.",
      "2. Codex 0.9 muda o sandbox.",
      "3. Gemini CLI 1.2 ganha MCP remoto.",
      "4. Copilot CLI 0.4 suporta agentes.",
      "5. Cursor 2.1 cobra por token.",
      "",
      "## O que observar",
      "- MCP",
    ].join("\n");
    const reading = extractReading(leaked);
    expect(reading?.startsWith("## TL;DR")).toBe(true);
    expect(reading).not.toContain("We need");
    expect(reading).toContain("## O que observar");
  });

  it("cuts a reply where the model degenerated into <unk> tokens", () => {
    const items = Array.from({ length: 7 }, (_, i) => `${i + 1}. Item ${i}.`);
    const degenerated = `## TL;DR\n${items.join("\n")}\n8. fixes UnixLocal comp<unk><unk><unk>`;
    const reading = extractReading(degenerated) ?? "";
    expect(reading).toContain("7. Item 6.");
    expect(reading).not.toContain("UnixLocal");
    expect(reading).not.toContain("<unk>");
  });

  it("rejects an English reading so the retry asks again in Portuguese", () => {
    const english = [
      "## TL;DR",
      "1. OpenAI Agents SDK v0.22.1 – support image results in web search tools.",
      "2. Claude Code v2.1.267 – introduced the maxEffortLevel setting and a flag.",
      "3. Dify v1.17.1 – required a staged upgrade for the bundled Weaviate.",
      "4. LiteLLM v1.101.0 – Docker images are now signed with cosign.",
      "5. LimiX-2 paper – introduces networks for structured data.",
    ].join("\n");
    expect(extractReading(english)).toBeNull();
  });

  it("rejects a reading too short to be an edition so the fallback runs", () => {
    expect(extractReading("We need to count words... <unk><unk>")).toBeNull();
    expect(extractReading("## TL;DR\n\nsem itens")).toBeNull();
    expect(extractReading("## TL;DR\n1. a\n2. b<unk>")).toBeNull();
  });

  it("lists each story once in the fallback, with its source", () => {
    const reading = fallbackReading(
      bucketRadarArticles([
        article({ id: 1, title: "a / b", engagement_score: 900 }),
        article({
          id: 2,
          title: "a / b",
          engagement_score: 800,
          url: "https://github.com/a/b#trending-weekly-2026-08-06",
        }),
      ]),
    );
    expect(reading.match(/a \/ b/g)).toHaveLength(1);
    expect(reading).toContain("GitHub Trending (daily)");
  });

  it("caps each source inside a bucket so one monorepo cannot fill it", () => {
    const [bucket] = bucketRadarArticles([
      ...Array.from({ length: 8 }, (_, id) =>
        article({
          id,
          source: "Vercel AI SDK Releases",
          url: `https://v/${id}`,
        }),
      ),
      article({ id: 20, source: "Claude Code Releases", url: "https://c/1" }),
    ]);
    const sources = bucket.articles.map((item) => item.source);
    expect(sources.filter((s) => s === "Vercel AI SDK Releases")).toHaveLength(
      3,
    );
    expect(sources).toContain("Claude Code Releases");
  });

  it("shows every source once before repeating any, so late crawls still appear", () => {
    const names = Array.from({ length: 16 }, (_, i) => `Tool${i} Releases`);
    const [bucket] = bucketRadarArticles(
      names.flatMap((source, i) =>
        [0, 1, 2].map((n) =>
          article({
            id: i * 10 + n,
            source,
            url: `https://r/${i}/${n}`,
            // A source's items land together, in the minute its feed was crawled.
            crawled_at: `2026-08-06T10:${String(i).padStart(2, "0")}:0${n}Z`,
          }),
        ),
      ),
    );
    expect(new Set(bucket.articles.map((item) => item.source)).size).toBe(15);
  });

  it("lists a repo once per bucket even when it trends on several boards", () => {
    const [bucket] = bucketRadarArticles(
      ["daily", "daily-javascript", "weekly"].map((board, id) =>
        article({
          id,
          source: `GitHub Trending (${board})`,
          url: `https://github.com/a/b#trending-${board}-2026-08-06`,
        }),
      ),
    );
    expect(bucket.articles).toHaveLength(1);
  });

  it("drops navigation links scraped as articles", () => {
    const buckets = bucketRadarArticles([
      article({ id: 1, title: "Browse all posts →", source: "VSCode Blogs" }),
      article({ id: 2, title: "Visual Studio Code 1.137", url: "https://v/1" }),
    ]);
    const titles = buckets.flatMap((b) => b.articles.map((a) => a.title));
    expect(titles).toEqual(["Visual Studio Code 1.137"]);
  });

  it("shows the Reddit post body, not the signal boilerplate", () => {
    const markdown = renderRadarTables(
      bucketRadarArticles([
        article({
          source: "Reddit Post Signals (ClaudeCode)",
          summary:
            'Post da comunidade em r/ClaudeCode sobre "Usage". Relato do autor, sem os comentarios da discussao. Weekly usage dropped 50-60% after Sep 14.',
        }),
      ]),
    );
    expect(markdown).toContain("| Weekly usage dropped 50-60% after Sep 14. |");
  });

  it("groups model launches and HF trending in their own bucket, trending not capped at 3", () => {
    const buckets = bucketRadarArticles([
      ...Array.from({ length: 8 }, (_, id) =>
        article({
          id,
          source: "HF Trending Models",
          url: `https://huggingface.co/o/m${id}`,
          engagement_score: 100 - id,
        }),
      ),
      article({ id: 50, source: "OpenRouter: New Models", url: "https://o/1" }),
    ]);
    const [models] = buckets;
    expect(models.key).toBe("models");
    expect(models.articles).toHaveLength(9);
    expect(models.articles.map((a) => a.source)).toContain(
      "OpenRouter: New Models",
    );
  });

  it("puts the followed changelogs first in the releases bucket", () => {
    const others = Array.from({ length: 20 }, (_, i) =>
      article({
        id: i,
        source: `Tool${i} Releases`,
        url: `https://t/${i}`,
        crawled_at: "2026-08-06T12:00:00Z",
      }),
    );
    const followed = [
      "Claude Code Releases",
      "OpenCode Releases",
      "VSCode Updates",
    ].map((source, i) =>
      article({
        id: 100 + i,
        source,
        url: `https://f/${i}`,
        crawled_at: "2026-08-06T01:00:00Z",
      }),
    );
    const [releases] = bucketRadarArticles([...others, ...followed]);
    expect(releases.key).toBe("releases");
    expect(releases.articles.slice(0, 3).map((a) => a.source)).toEqual([
      "Claude Code Releases",
      "OpenCode Releases",
      "VSCode Updates",
    ]);
  });

  it("names the edition by day", () => {
    expect(radarDate(new Date("2026-08-06T23:30:00Z"))).toBe("2026-08-06");
    expect(radarTitle("2026-08-06")).toBe("Radar IA — 06/08/2026");
  });

  it("tells the model that feed text is data, so a poisoned title cannot steer the reading", () => {
    expect(RADAR_SYSTEM_PROMPT).toContain(UNTRUSTED_MATERIAL_RULE);
  });

  it("feeds the model news before popularity, so star counts cannot lead the edition", () => {
    const digest = radarDigestForModel(
      bucketRadarArticles([
        article({ id: 1, title: "huge-repo", engagement_score: 288305 }),
        article({
          id: 2,
          title: "Codex CLI 0.155.0",
          source: "Codex CLI Releases",
          url: "https://github.com/openai/codex/releases/tag/0.155.0",
        }),
      ]),
    );
    expect(digest.indexOf("Codex CLI 0.155.0")).toBeLessThan(
      digest.indexOf("huge-repo"),
    );
  });

  it("embeds intelligence section, source and evidence in generateRadar when snapshot is saved", async () => {
    const mockSnapshot = {
      id: 1,
      captured_at: "2026-09-21T12:00:00Z",
      day: "2026-09-21",
      source_url: "https://artificialanalysis.ai/models#intelligence",
      models: [
        {
          name: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
          slug: "claude-fable-5-1",
          creator: "Anthropic",
          intelligenceIndex: 53.4,
          isOpenWeights: false,
          isReasoning: true,
          rank: 1,
        },
      ],
      top_model: "Claude Fable 5.1",
      top_score: 53.4,
      changes: { hasChanges: false, summary: "Sem alterações" },
    };

    vi.spyOn(db, "getLatestIntelligenceSnapshot").mockReturnValue(mockSnapshot);
    vi.spyOn(db, "getIntelligenceSnapshots").mockReturnValue([mockSnapshot]);
    vi.spyOn(db, "getArticlesSince").mockReturnValue([
      article({
        id: 999,
        title: "Sample Release 1.0",
        source: "OpenCode Releases",
        url: "https://opencode.test/rel1",
        summary: "Sample release",
        engagement_score: 10,
      }),
    ]);

    const radar = await generateRadar(new Date("2026-09-21T12:00:00Z"));
    expect(radar.content).toContain(
      "## Índice de Inteligência (Artificial Analysis)",
    );
    expect(radar.content).toContain("xychart-beta");
    expect(radar.content).toContain("Claude Fable 5.1");
    expect(radar.sources).toContain(
      "https://artificialanalysis.ai/models#intelligence",
    );
    expect(radar.evidence.map((e) => e.sourceUrl)).toContain(
      "https://artificialanalysis.ai/models#intelligence",
    );
    expect(radar.tags).toContain("benchmarks");
  });
});
