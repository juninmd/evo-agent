import type Database from "better-sqlite3";
import type { Article } from "../knowledge/store.js";

/**
 * Deterministic data for `npm run benchmark:perf`. Everything derives from a
 * fixed seed, so two runs (and two commits) time the same rows.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedScale {
  articles: number;
  cycles: number;
  metrics: number;
  editions: number;
  evidencePerEdition: number;
  promptVersions: number;
  stateKeys: number;
}

/** About one year of the production schedule (hourly crawl, 3 editions a day). */
export const YEAR_SCALE: SeedScale = {
  articles: 120_000,
  cycles: 30_000,
  metrics: 100_000,
  editions: 1_500,
  evidencePerEdition: 30,
  promptVersions: 500,
  stateKeys: 150,
};

/** Small enough for the unit test that keeps the benchmark from rotting. */
export const SMOKE_SCALE: SeedScale = {
  articles: 400,
  cycles: 120,
  metrics: 300,
  editions: 12,
  evidencePerEdition: 4,
  promptVersions: 6,
  stateKeys: 10,
};

const PRIMARY_SOURCES = [
  "Anthropic News",
  "OpenAI Blog",
  "GitHub Blog",
  "Google AI Blog",
  "Google Research",
  "Hugging Face Blog",
  "Mistral AI News",
  "Together AI Blog",
  "VSCode Updates",
  "Claude Code Releases",
  "Codex Releases",
  "Gemini CLI Releases",
];

const COMMUNITY_SOURCES = [
  "Reddit: LocalLLaMA",
  "Reddit: ClaudeCode",
  "Reddit: codex",
  "Reddit: GithubCopilot",
  "Reddit: vscode",
  "Reddit: MachineLearning",
  "Hacker News",
  "TabNews",
];

const TOPICS = [
  "agents",
  "benchmarks",
  "context windows",
  "tool calling",
  "code review",
  "evaluation",
  "fine-tuning",
  "inference cost",
  "latency",
  "memory",
  "prompt caching",
  "retrieval",
  "sandboxing",
  "structured output",
  "terminal workflows",
  "vector search",
];

const MODELS = [
  "Claude Sonnet",
  "Claude Opus",
  "GPT",
  "Gemini",
  "Llama",
  "Qwen",
  "DeepSeek",
  "Mistral",
];

const VERBS = [
  "ships",
  "improves",
  "benchmarks",
  "rewrites",
  "open-sources",
  "deprecates",
  "explains",
  "measures",
];

const FILLER =
  "The release notes describe measurable changes for developers building with coding agents, including concrete numbers, migration steps and known limitations that teams should review before adopting it in production workloads.";

export const BENCH_SOURCES: string[] = [
  ...PRIMARY_SOURCES,
  ...COMMUNITY_SOURCES,
  ...Array.from({ length: 30 }, (_, i) => `Google News (keyword ${i})`),
  ...Array.from({ length: 20 }, (_, i) => `Engineering Blog ${i}`),
  ...Array.from({ length: 6 }, (_, i) => `GitHub Trending (lang ${i})`),
  ...Array.from({ length: 6 }, (_, i) => `Techlead: Stack ${i}`),
];

const CYCLE_TYPES = [
  "crawl",
  "crawl",
  "crawl",
  "model_alerts",
  "model_alerts",
  "daily",
  "radar",
  "techlead",
  "weekly",
];

const METRIC_NAMES = [
  "llm.latency_ms",
  "llm.tokens_out",
  "crawl.saved",
  "crawl.failed_sources",
  "crawl.primary_sources_48h",
  "editorial.quality_score",
  "editorial.selected_sources",
  "radar.selected_sources",
  "techlead.selected_sources",
  "devtips.selected_sources",
  "ebook.length_chars",
  "notification.suppressed_stale",
];

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** SQLite's `datetime('now')` shape, `ageMs` in the past. */
export function sqliteTimestamp(now: number, ageMs: number): string {
  return new Date(now - ageMs)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");
}

function title(random: () => number, index: number): string {
  // One in five names a model with a version, the shape `modelKey` and
  // `conflictingVersions` have to tell apart.
  if (index % 5 === 0) {
    const major = 2 + Math.floor(random() * 4);
    const minor = Math.floor(random() * 10);
    return `${pick(random, MODELS)} ${major}.${minor} ${pick(random, VERBS)} ${pick(random, TOPICS)} for ${pick(random, TOPICS)}`;
  }
  return `${pick(random, TOPICS)} ${pick(random, VERBS)} ${pick(random, TOPICS)} with ${pick(random, TOPICS)} (${index})`;
}

/** In-memory rows for the CPU-only curation cases. */
export function buildArticles(count: number, seed = 7): Article[] {
  const random = seededRandom(seed);
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const source = pick(random, BENCH_SOURCES);
    return {
      id: index + 1,
      title: title(random, index),
      source,
      url: `https://bench.test/${seed}/${index}`,
      summary: FILLER.slice(0, 90 + Math.floor(random() * 120)),
      tags: JSON.stringify([
        "ai",
        pick(random, TOPICS),
        ...(source.startsWith("Reddit") ? ["community-signals"] : []),
      ]),
      engagement_score: Math.floor(random() * 900),
      crawled_at: sqliteTimestamp(now, Math.floor(random() * 2 * 86_400_000)),
    };
  });
}

/**
 * Unit vectors drawn around a few hundred centroids: most pairs are far apart
 * and a minority sit above the duplicate threshold, like real embeddings.
 */
export function buildVectors(
  articles: Article[],
  dimensions = 768,
  seed = 11,
): Map<string, Float32Array> {
  const random = seededRandom(seed);
  const centroids = Array.from(
    { length: Math.max(8, Math.floor(articles.length / 3)) },
    () => Float32Array.from({ length: dimensions }, () => random() - 0.5),
  );
  const vectors = new Map<string, Float32Array>();
  for (const article of articles) {
    const centroid = pick(random, centroids);
    const vector = new Float32Array(dimensions);
    for (let i = 0; i < dimensions; i++) {
      vector[i] = centroid[i] + (random() - 0.5) * 0.12;
    }
    vectors.set(article.url, vector);
  }
  return vectors;
}

export function seedDatabase(
  database: Database.Database,
  scale: SeedScale,
): void {
  const random = seededRandom(42);
  const now = Date.now();
  const day = 86_400_000;
  const hour = 3_600_000;

  database.transaction(() => {
    const article = database.prepare(
      `INSERT INTO articles
         (title, source, url, url_key, summary, tags, engagement_score, crawled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < scale.articles; i++) {
      const url = `https://bench.test/a/${i}`;
      article.run(
        title(random, i),
        pick(random, BENCH_SOURCES),
        url,
        `bench.test/a/${i}`,
        FILLER.slice(0, 90 + Math.floor(random() * 120)),
        '["ai","agents"]',
        Math.floor(random() * 900),
        // Evenly spread over a year, oldest first, like an append-only crawl.
        sqliteTimestamp(
          now,
          ((scale.articles - i) / scale.articles) * 365 * day,
        ),
      );
    }

    const cycle = database.prepare(
      `INSERT INTO cycle_runs
         (type, status, metrics_json, error, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < scale.cycles; i++) {
      const age = ((scale.cycles - i) / scale.cycles) * 365 * day;
      const roll = random();
      const status =
        roll < 0.9 ? "succeeded" : roll < 0.97 ? "failed" : "skipped";
      cycle.run(
        pick(random, CYCLE_TYPES),
        status,
        '{"saved":12,"failedSources":1}',
        status === "failed" ? "feed unavailable after 3 attempts" : null,
        sqliteTimestamp(now, age),
        sqliteTimestamp(now, age - 90_000),
      );
    }

    const metric = database.prepare(
      `INSERT INTO metric_events (name, value, labels_json, recorded_at)
       VALUES (?, ?, ?, ?)`,
    );
    for (let i = 0; i < scale.metrics; i++) {
      metric.run(
        METRIC_NAMES[i % METRIC_NAMES.length],
        Math.round(random() * 60_000) / 10,
        '{"type":"daily"}',
        sqliteTimestamp(now, ((scale.metrics - i) / scale.metrics) * 365 * day),
      );
    }

    const edition = database.prepare(
      `INSERT INTO published_articles
         (slug, title, url, date, summary, tags, kind, period,
          notification_status, notification_attempts, next_notification_at,
          editorial_metrics, quality_score, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const evidence = database.prepare(
      `INSERT INTO published_evidence
         (article_url, source_url, source_title, excerpt, observed_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (let i = 0; i < scale.editions; i++) {
      const age = ((scale.editions - i) / scale.editions) * 365 * day;
      const published = sqliteTimestamp(now, age);
      const date = published.slice(0, 10);
      const report = i % 9 === 0;
      const url = `https://pages.test/${report ? "reports" : "artigos"}/${date}-edicao-${i}.html`;
      // The newest handful stays pending, like a live outbox.
      const pending = i >= scale.editions - 3;
      edition.run(
        `${date}-edicao-${i}`,
        `Edição ${i}: ${title(random, i)}`,
        url,
        date,
        FILLER.slice(0, 160),
        '["ai","agents","daily"]',
        report ? "report" : "article",
        report ? "weekly" : null,
        pending ? "pending" : "delivered",
        pending ? 0 : 1,
        published,
        '{"considered":420,"selected":36,"rejected":384,"primarySources":12}',
        60 + Math.floor(random() * 40),
        published,
      );
      for (let j = 0; j < scale.evidencePerEdition; j++) {
        evidence.run(
          url,
          `https://bench.test/a/${(i * 31 + j * 7) % scale.articles}`,
          title(random, j),
          FILLER.slice(0, 180),
          published,
        );
      }
    }

    const prompt = database.prepare(
      `INSERT INTO prompt_versions (prompt, score, status, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    // Production prompts are a few kilobytes of pt-BR instructions.
    const promptText = FILLER.repeat(20);
    for (let i = 0; i < scale.promptVersions; i++) {
      prompt.run(
        `${promptText} v${i}`,
        60 + Math.floor(random() * 40),
        i % 4 === 0 ? "promoted" : "rejected",
        "candidate passed policy gate 95/95",
        sqliteTimestamp(now, (scale.promptVersions - i) * 12 * hour),
      );
    }

    const state = database.prepare(
      `INSERT INTO agent_state (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    state.run(
      "system_prompt",
      `${promptText} ativo`,
      sqliteTimestamp(now, hour),
    );
    state.run(
      "ebook_markdown",
      FILLER.repeat(400),
      sqliteTimestamp(now, 3 * day),
    );
    for (let i = 0; i < scale.stateKeys; i++) {
      state.run(
        i % 3 === 0 ? `last_run_${i}` : `reddit_feed_attempt_${i}`,
        new Date(now - i * hour).toISOString(),
        sqliteTimestamp(now, i * hour),
      );
    }

    const health = database.prepare(
      `INSERT INTO source_health
         (source, consecutive_failures, skip_remaining, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(source) DO NOTHING`,
    );
    BENCH_SOURCES.forEach((source, index) => {
      health.run(
        source,
        index % 11 === 0 ? 3 : 0,
        index % 11 === 0 ? 2 : 0,
        sqliteTimestamp(now, index * hour),
      );
    });

    const snapshot = database.prepare(
      `INSERT INTO intelligence_snapshots
         (day, source_url, models_json, top_model, top_score, captured_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    const models = JSON.stringify(
      Array.from({ length: 300 }, (_, rank) => ({
        name: `Model ${rank}`,
        slug: `model-${rank}`,
        creator: "Lab",
        intelligenceIndex: 70 - rank / 10,
        isOpenWeights: rank % 2 === 0,
        isReasoning: rank % 3 === 0,
        rank: rank + 1,
      })),
    );
    for (let i = 0; i < 30; i++) {
      const captured = sqliteTimestamp(now, (30 - i) * day);
      snapshot.run(
        captured.slice(0, 10),
        "https://artificialanalysis.ai/models#intelligence",
        models,
        "Model 0",
        70,
        captured,
      );
    }
  })();
}
