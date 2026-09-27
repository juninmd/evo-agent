import axios from "axios";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderIntelligenceRanking,
  renderIntelligenceSection,
  shortModelName,
} from "../agent/intelligence.js";
import {
  type IntelligenceDiff,
  crawlArtificialAnalysisIntelligence,
  diffIntelligenceSnapshots,
  extractIntelligenceModels,
} from "../crawler/intelligence.js";
import {
  type IntelligenceModelRecord,
  db,
  getDb,
  migrate,
} from "../knowledge/store.js";

const sampleModels: IntelligenceModelRecord[] = [
  {
    name: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
    slug: "claude-fable-5-1",
    creator: "Anthropic",
    intelligenceIndex: 53.4,
    isOpenWeights: false,
    isReasoning: true,
    releaseDate: "2026-09-01",
    contextWindowTokens: 1000000,
    rank: 1,
  },
  {
    name: "GPT-6 Astra (max)",
    slug: "gpt-6-astra",
    creator: "OpenAI",
    intelligenceIndex: 52.7,
    isOpenWeights: false,
    isReasoning: true,
    releaseDate: "2026-09-03",
    contextWindowTokens: 1000000,
    rank: 2,
  },
  {
    name: "Claude Opus 5 (Adaptive Reasoning, Max Effort)",
    slug: "claude-opus-5",
    creator: "Anthropic",
    intelligenceIndex: 50.8,
    isOpenWeights: false,
    isReasoning: true,
    releaseDate: "2026-07-24",
    contextWindowTokens: 1000000,
    rank: 3,
  },
  {
    name: "MiMo-V2.6-Pro",
    slug: "mimo-v2-6-pro",
    creator: "Xiaomi",
    intelligenceIndex: 46.3,
    isOpenWeights: true,
    isReasoning: true,
    releaseDate: "2026-09-21",
    contextWindowTokens: 1000000,
    rank: 4,
  },
];

describe("shortModelName", () => {
  it("removes parenthetical details and normalizes whitespace", () => {
    expect(
      shortModelName(
        "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
      ),
    ).toBe("Claude Fable 5.1");
    expect(shortModelName("GPT-6 Astra (max)")).toBe("GPT-6 Astra");
    expect(shortModelName("MiMo-V2.6-Pro")).toBe("MiMo-V2.6-Pro");
    expect(shortModelName("Qwen3.8 Max (0902)")).toBe("Qwen3.8 Max");
  });
});

describe("extractIntelligenceModels", () => {
  it("extracts models and sorts by intelligence index from Next.js RSC chunks", () => {
    const rscChunk = JSON.stringify({
      initialModels: [
        {
          name: "Model Low",
          slug: "model-low",
          intelligenceIndex: 30.5,
          isOpenWeights: true,
          isReasoning: false,
          creator: { name: "OpenLab" },
        },
        {
          name: "Model High",
          slug: "model-high",
          intelligenceIndex: 55.2,
          isOpenWeights: false,
          isReasoning: true,
          creator: { name: "BigAI" },
        },
      ],
    });

    const mockHtml = `<html><body><script>self.__next_f.push([1, ${JSON.stringify(rscChunk)}])</script></body></html>`;
    const models = extractIntelligenceModels(mockHtml);

    expect(models).toHaveLength(2);
    expect(models[0].name).toBe("Model High");
    expect(models[0].rank).toBe(1);
    expect(models[0].intelligenceIndex).toBe(55.2);
    expect(models[0].creator).toBe("BigAI");

    expect(models[1].name).toBe("Model Low");
    expect(models[1].rank).toBe(2);
    expect(models[1].intelligenceIndex).toBe(30.5);
    expect(models[1].isOpenWeights).toBe(true);
  });

  it("handles fallback regex when initialModels key is absent", () => {
    const rawText =
      '{"name":"Fallback Model Alpha","intelligenceIndex":49.8},{"name":"Fallback Model Beta","intelligenceIndex":51.2}';
    const models = extractIntelligenceModels(rawText);
    expect(models).toHaveLength(2);
    expect(models[0].name).toBe("Fallback Model Beta");
    expect(models[0].intelligenceIndex).toBe(51.2);
    expect(models[1].name).toBe("Fallback Model Alpha");
    expect(models[1].intelligenceIndex).toBe(49.8);
  });
});

describe("diffIntelligenceSnapshots", () => {
  it("flags first measurement as having initial changes", () => {
    const diff = diffIntelligenceSnapshots(sampleModels, null);
    expect(diff.hasChanges).toBe(true);
    expect(diff.summary).toContain("Primeira medição registrada");
    expect(diff.newModels).toHaveLength(4);
  });

  it("reports no changes when current equals previous", () => {
    const diff = diffIntelligenceSnapshots(sampleModels, sampleModels);
    expect(diff.hasChanges).toBe(false);
    expect(diff.summary).toContain("Sem alterações");
    expect(diff.newModels).toHaveLength(0);
    expect(diff.rankChanges).toHaveLength(0);
    expect(diff.scoreChanges).toHaveLength(0);
  });

  it("detects score and rank changes", () => {
    const modified: IntelligenceModelRecord[] = [
      {
        ...sampleModels[1],
        intelligenceIndex: 54.0, // rose above Claude Fable
        rank: 1,
      },
      {
        ...sampleModels[0],
        intelligenceIndex: 53.4,
        rank: 2,
      },
      {
        ...sampleModels[2],
        intelligenceIndex: 51.1, // +0.3
        rank: 3,
      },
      {
        name: "New Contender",
        slug: "new-contender",
        creator: "Startup",
        intelligenceIndex: 48.0,
        isOpenWeights: true,
        isReasoning: true,
        rank: 4,
      },
    ];

    const diff = diffIntelligenceSnapshots(modified, sampleModels, 4);
    expect(diff.hasChanges).toBe(true);
    expect(diff.newModels).toContain("New Contender");
    expect(diff.droppedModels).toContain("MiMo-V2.6-Pro");
    expect(diff.rankChanges).toEqual(
      expect.arrayContaining([
        { name: "GPT-6 Astra (max)", oldRank: 2, newRank: 1 },
        {
          name: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)",
          oldRank: 1,
          newRank: 2,
        },
      ]),
    );
    expect(diff.scoreChanges).toEqual(
      expect.arrayContaining([
        {
          name: "GPT-6 Astra (max)",
          oldScore: 52.7,
          newScore: 54.0,
          delta: 1.3,
        },
        {
          name: "Claude Opus 5 (Adaptive Reasoning, Max Effort)",
          oldScore: 50.8,
          newScore: 51.1,
          delta: 0.3,
        },
      ]),
    );
    expect(diff.summary).toContain("Mudanças no ranking");
  });
});

describe("renderIntelligenceRanking", () => {
  const moved = (): IntelligenceDiff => ({
    hasChanges: true,
    summary: "Mudança",
    newModels: ["MiMo-V2.6-Pro"],
    rankChanges: [],
    scoreChanges: [],
    droppedModels: [],
    modelChanges: [
      {
        name: "GPT-6 Astra (max)",
        slug: "gpt-6-astra",
        creator: "OpenAI",
        currentRank: 2,
        previousRank: 4,
        currentScore: 52.7,
        previousScore: 51.3,
        rankDelta: 2,
        scoreDelta: 1.4,
        type: "score_changed",
        summary: "+2 pos (+1.4 pts)",
      },
      {
        name: "Claude Opus 5 (Adaptive Reasoning, Max Effort)",
        slug: "claude-opus-5",
        creator: "Anthropic",
        currentRank: 3,
        previousRank: 2,
        currentScore: 50.8,
        previousScore: 50.8,
        rankDelta: -1,
        scoreDelta: 0,
        type: "rank_changed",
        summary: "-1 pos",
      },
      {
        name: "MiMo-V2.6-Pro",
        slug: "mimo-v2-6-pro",
        creator: "Xiaomi",
        currentRank: 4,
        currentScore: 46.3,
        type: "new",
        summary: "Novo",
      },
    ],
  });

  // The Mermaid chart cut the axis at 40 and made a 1.3x gap look like 3x.
  it("scales bars from zero to the leader", () => {
    const html = renderIntelligenceRanking(sampleModels, undefined, 4);
    expect(html).toContain("--w:100.0%");
    // 46.3 / 53.4 of the leader, not stretched from an axis floor.
    expect(html).toContain("--w:86.7%");
  });

  it("lists models in rank order with short names and the open-weights mark", () => {
    const html = renderIntelligenceRanking(sampleModels, undefined, 4);
    const names = [...html.matchAll(/class="model">([^<]+)/g)].map((m) =>
      m[1].trim(),
    );
    expect(names).toEqual([
      "Claude Fable 5.1",
      "GPT-6 Astra",
      "Claude Opus 5",
      "MiMo-V2.6-Pro",
    ]);
    expect(html.match(/class="open-mark"/g)).toHaveLength(1);
  });

  it("escapes crawled model and creator names", () => {
    const hostile = [
      { ...sampleModels[0], name: "<img src=x onerror=1>", creator: "A&B" },
    ];
    const html = renderIntelligenceRanking(hostile);
    expect(html).not.toContain("<img");
    expect(html).toContain("A&amp;B");
  });

  it("shows rank moves, score deltas and newcomers only when the ranking moved", () => {
    const html = renderIntelligenceRanking(sampleModels, moved(), 4);
    expect(html).toContain(">Variação<");
    expect(html).toContain(
      '▲2</span><span class="visually-hidden">subiu 2 posições',
    );
    expect(html).toContain("+1.4");
    expect(html).toContain(
      '▼1</span><span class="visually-hidden">caiu 1 posição',
    );
    expect(html).toContain('is-new">novo<');
  });

  it("hides the change column when nothing moved or on a first measurement", () => {
    const unchanged = diffIntelligenceSnapshots(sampleModels, sampleModels);
    const first = diffIntelligenceSnapshots(sampleModels, null);
    for (const diff of [unchanged, first]) {
      const html = renderIntelligenceRanking(sampleModels, diff, 4);
      expect(html).not.toContain("Variação");
      expect(html).not.toContain("novo");
    }
  });

  it("renders the section as status line plus ranking, without Mermaid", async () => {
    const section = await renderIntelligenceSection(
      new Date(),
      sampleModels,
      diffIntelligenceSnapshots(sampleModels, sampleModels),
    );
    expect(section).toContain(
      "## Índice de Inteligência (Artificial Analysis)",
    );
    expect(section).toContain('<p class="ranking-status">Sem alterações');
    expect(section).toContain('<table class="ranking-table"');
    expect(section).not.toContain("mermaid");
    expect(section).toContain("Artificial Analysis Intelligence Index</a>");
  });
});

describe("Database intelligence snapshot persistence", () => {
  let memoryDb: Database.Database;

  beforeEach(() => {
    memoryDb = new Database(":memory:");
    migrate(memoryDb);
  });

  afterEach(() => {
    memoryDb.close();
  });

  it("saves and retrieves intelligence snapshots with history", () => {
    const saveStmt = memoryDb.prepare(
      `INSERT INTO intelligence_snapshots
       (day, source_url, models_json, top_model, top_score, changes_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    saveStmt.run(
      "2026-09-20",
      "https://artificialanalysis.ai/models#intelligence",
      JSON.stringify(sampleModels),
      sampleModels[0].name,
      sampleModels[0].intelligenceIndex,
      JSON.stringify({ hasChanges: false }),
    );

    saveStmt.run(
      "2026-09-21",
      "https://artificialanalysis.ai/models#intelligence",
      JSON.stringify(sampleModels),
      sampleModels[0].name,
      sampleModels[0].intelligenceIndex,
      JSON.stringify({ hasChanges: true, summary: "Nova liderança" }),
    );

    const rows = memoryDb
      .prepare("SELECT * FROM intelligence_snapshots ORDER BY id DESC")
      .all() as Array<{ day: string; top_model: string; top_score: number }>;

    expect(rows).toHaveLength(2);
    expect(rows[0].day).toBe("2026-09-21");
    expect(rows[0].top_model).toBe(sampleModels[0].name);
    expect(rows[0].top_score).toBe(53.4);
    expect(rows[1].day).toBe("2026-09-20");
  });
});

describe("crawlArtificialAnalysisIntelligence", () => {
  const snapshot = (models: IntelligenceModelRecord[]) => ({
    id: 1,
    captured_at: "2026-09-25T10:00:00Z",
    day: "2026-09-25",
    source_url: "https://artificialanalysis.ai/models#intelligence",
    models,
    top_model: models[0].name,
    top_score: models[0].intelligenceIndex,
    changes: {},
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function crawlWith(previous: IntelligenceModelRecord[]) {
    // The live fetch fails and falls back to the cached snapshot, so the
    // first read is "today" and the second is the previous measurement.
    vi.spyOn(axios, "get").mockRejectedValue(new Error("offline"));
    vi.spyOn(db, "getLatestIntelligenceSnapshot")
      .mockReturnValueOnce(snapshot(sampleModels))
      .mockReturnValueOnce(snapshot(previous));
    vi.spyOn(db, "saveIntelligenceSnapshot").mockReturnValue(1);
    vi.spyOn(db, "urlExists").mockReturnValue(false);
    const saveArticle = vi
      .spyOn(db, "saveArticle")
      .mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    return saveArticle;
  }

  // An unchanged ranking became the lead story of an edition that, lower
  // down, said "no changes since the last measurement".
  it("does not offer an unchanged ranking as a story", async () => {
    const saveArticle = crawlWith(sampleModels);
    await crawlArtificialAnalysisIntelligence();
    expect(saveArticle).not.toHaveBeenCalled();
  });

  it("offers the ranking as a story when it moved", async () => {
    const moved = sampleModels.map((model, index) =>
      index === 0 ? { ...model, intelligenceIndex: 51 } : model,
    );
    const saveArticle = crawlWith(moved);
    await crawlArtificialAnalysisIntelligence();
    expect(saveArticle).toHaveBeenCalledTimes(1);
  });
});
