import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  renderIntelligenceMermaidChart,
  renderIntelligenceSection,
  renderIntelligenceTable,
  shortModelName,
} from "../agent/intelligence.js";
import {
  type IntelligenceDiff,
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

describe("renderIntelligenceMermaidChart & renderIntelligenceTable", () => {
  it("renders a valid xychart-beta Mermaid chart", () => {
    const chart = renderIntelligenceMermaidChart(sampleModels, 4);
    expect(chart).toContain("```mermaid");
    expect(chart).toContain("xychart-beta");
    expect(chart).toContain(
      'x-axis ["Claude Fable 5.1", "GPT-6 Astra", "Claude Opus 5", "MiMo-V2.6-Pro"]',
    );
    expect(chart).toContain("bar [53.4, 52.7, 50.8, 46.3]");
  });

  it("renders a markdown table with ranks, scores, variations and license types", () => {
    const diff: IntelligenceDiff = {
      hasChanges: true,
      summary: "Mudança",
      newModels: [],
      rankChanges: [],
      scoreChanges: [],
      droppedModels: [],
      modelChanges: [
        {
          name: "MiMo-V2.6-Pro",
          slug: "mimo-v2-6-pro",
          creator: "Xiaomi",
          currentRank: 4,
          currentScore: 46.3,
          type: "score_changed",
          summary: "+0.5 pts",
        },
      ],
    };
    const table = renderIntelligenceTable(sampleModels, diff, 4);
    expect(table).toContain(
      "| # | Modelo | Criador | Score | Variação | Tipo |",
    );
    expect(table).toContain("| 1 | [Claude Fable 5.1]");
    expect(table).toContain("Anthropic | 53.4 | = | Proprietário |");
    expect(table).toContain("| 4 | [MiMo-V2.6-Pro]");
    expect(table).toContain("Xiaomi | 46.3 | +0.5 pts | Pesos Abertos |");
  });

  it("renders a full intelligence section with chart, table and status alert", async () => {
    const section = await renderIntelligenceSection(
      new Date(),
      sampleModels,
      diffIntelligenceSnapshots(sampleModels, null),
    );
    expect(section).toContain(
      "## Índice de Inteligência (Artificial Analysis)",
    );
    expect(section).toContain("> **Status de Atualização:**");
    expect(section).toContain("```mermaid\nxychart-beta");
    expect(section).toContain("| # | Modelo | Criador |");
    expect(section).toContain(
      "Fonte: [Artificial Analysis Intelligence Index]",
    );
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
