import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-dev-sources-"));
process.env.DB_PATH = join(dir, "sources.db");

const { getDb, db } = await import("../knowledge/store.js");
const { repoStars } = await import("../knowledge/repo-stars.js");
const { enrichCreatedAt, installCommand, parseStarsToday, rankVelocity } =
  await import("../crawler/repo-velocity.js");
const { crawlMcpRegistry, devServers, installHint, MCP_REGISTRY_SOURCE } =
  await import("../crawler/mcp-registry.js");
const { modelCard, newModelLaunches, priceLine } = await import(
  "../crawler/model-launches.js"
);

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

const snap = (
  repo: string,
  day: string,
  stars: number,
  starsToday = 0,
  createdAt: string | null = null,
) => ({ repo, day, stars, starsToday, description: repo, createdAt });

describe("repo velocity", () => {
  it("parses the trending counter, weekly as a daily average", () => {
    expect(parseStarsToday("1,234 stars today")).toBe(1234);
    expect(parseStarsToday("700 stars this week")).toBe(100);
    expect(parseStarsToday("")).toBe(0);
  });

  // A veteran with a huge total must not outrank a young repo gaining faster.
  it("ranks by sustained gain, not total stars", () => {
    const ranked = rankVelocity(
      [
        snap("old/giant", "2026-11-15", 100_000, 40),
        snap("old/giant", "2026-11-22", 100_280, 40),
        snap("new/fast", "2026-11-18", 1_000, 300, "2026-11-10T00:00:00Z"),
        snap("new/fast", "2026-11-22", 2_600, 450, "2026-11-10T00:00:00Z"),
      ],
      "2026-11-22",
    );
    expect(ranked.map((r) => r.repo)).toEqual(["new/fast", "old/giant"]);
    expect(ranked[0]).toMatchObject({ perDay: 450, isNew: true });
    expect(ranked[1]).toMatchObject({ perDay: 40, isNew: false });
  });

  it("drops repos that stopped trending and malformed names", () => {
    const ranked = rankVelocity(
      [
        snap("gone/repo", "2026-11-18", 10, 5),
        snap("../evil", "2026-11-22", 9, 9),
      ],
      "2026-11-22",
    );
    expect(ranked).toEqual([]);
  });

  it("keeps the highest reading per day and dates repos once", async () => {
    repoStars.record({
      repo: "a/b",
      day: "2026-11-22",
      stars: 10,
      starsToday: 3,
      description: "x",
    });
    repoStars.record({
      repo: "a/b",
      day: "2026-11-22",
      stars: 8,
      starsToday: 1,
      description: "x",
    });
    const calls: string[] = [];
    const deps = {
      createdAt: async (repo: string) => {
        calls.push(repo);
        return "2026-11-01T00:00:00Z";
      },
    };
    expect(await enrichCreatedAt("2026-11-22", deps)).toBe(1);
    expect(await enrichCreatedAt("2026-11-22", deps)).toBe(0);
    expect(calls).toEqual(["a/b"]);
    expect(repoStars.since("2026-11-22")[0]).toMatchObject({
      stars: 10,
      starsToday: 3,
      createdAt: "2026-11-01T00:00:00Z",
    });
  });

  it("extracts a pasteable install line and never a pipe to shell", () => {
    expect(installCommand("# X\n```bash\n$ npm install -g foo-cli\n```")).toBe(
      "npm install -g foo-cli",
    );
    expect(
      installCommand("```sh\ncurl -fsSL https://x.sh | sh\n```"),
    ).toBeNull();
    expect(installCommand("no code here")).toBeNull();
  });
});

describe("MCP registry", () => {
  it("builds install hints only for known registries and safe ids", () => {
    expect(installHint({ registryType: "npm", identifier: "@a/mcp" })).toBe(
      "npx -y @a/mcp",
    );
    expect(installHint({ registryType: "pypi", identifier: "tool" })).toBe(
      "uvx tool",
    );
    expect(
      installHint({ registryType: "npm", identifier: "x; rm -rf /" }),
    ).toBeNull();
    expect(installHint({ registryType: "nuget", identifier: "x" })).toBeNull();
  });

  it("keeps servers with a public repo and a package, newest first", () => {
    const kept = devServers([
      { name: "saas", repository: { url: "" }, packages: [] },
      {
        name: "old",
        repository: { url: "https://github.com/o/old" },
        packages: [{ registryType: "npm", identifier: "old" }],
        publishedAt: "2026-11-01",
      },
      {
        name: "new",
        repository: { url: "https://github.com/o/new" },
        packages: [{ registryType: "pypi", identifier: "new" }],
        publishedAt: "2026-11-20",
      },
    ]);
    expect(kept.map((s) => s.name)).toEqual(["new", "old"]);
  });

  it("walks pages until the cursor ends and saves with a fenced command", async () => {
    const pages = [
      {
        servers: [
          {
            server: {
              name: "io.x/srv",
              title: "Srv",
              description: "Does things",
              repository: { url: "https://github.com/x/srv" },
              packages: [{ registryType: "npm", identifier: "srv-mcp" }],
            },
          },
        ],
        metadata: { nextCursor: "c1" },
      },
      { servers: [] },
    ];
    const cursors: Array<string | undefined> = [];
    const saved = await crawlMcpRegistry(new Date(), {
      page: async (_since, cursor) => {
        cursors.push(cursor);
        return pages[cursors.length - 1];
      },
    });
    expect(saved).toBe(1);
    expect(cursors).toEqual([undefined, "c1"]);
    const [row] = db.getArticlesSince(1, 5, { source: MCP_REGISTRY_SOURCE });
    expect(row.body).toBe("```bash\nnpx -y srv-mcp\n```");
  });
});

describe("model card", () => {
  const model = {
    id: "qwen/qwen-next",
    name: "Qwen Next",
    created: Math.floor(Date.parse("2026-11-21T00:00:00Z") / 1000),
    context_length: 262144,
    pricing: { prompt: "0.0000002", completion: "0.0000008" },
    hugging_face_id: "Qwen/Qwen-Next",
  };

  it("converts per-token prices to per-million and flags open weights", () => {
    const card = modelCard(model);
    expect(card).toMatchObject({
      inputPrice: 0.2,
      outputPrice: 0.8,
      openWeights: true,
      hfUrl: "https://huggingface.co/Qwen/Qwen-Next",
    });
    expect(priceLine(card)).toBe("US$ 0.2 / 0.8 por 1M tokens (entrada/saída)");
  });

  it("treats router pseudo-prices and missing ids as unknown", () => {
    const card = modelCard({
      id: "openai/x",
      pricing: { prompt: "-1", completion: "-1" },
      hugging_face_id: "",
    });
    expect(card).toMatchObject({ inputPrice: null, openWeights: false });
    expect(priceLine(card)).toBe("");
  });

  it("puts the price into the launch alert summary", () => {
    const [launch] = newModelLaunches(
      [model],
      new Date("2026-11-22T00:00:00Z"),
    );
    expect(launch.summary).toContain("US$ 0.2 / 0.8");
    expect(launch.summary).toContain("Pesos abertos");
  });
});
