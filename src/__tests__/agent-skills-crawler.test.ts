import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "evo-skills-crawler-"));
vi.mock("../config.js", () => ({
  config: { dbPath: join(dir, "skills.db"), timezone: "America/Sao_Paulo" },
}));

const { db, getDb } = await import("../knowledge/store.js");
const {
  AGENT_SKILLS_SOURCE,
  crawlAgentSkills,
  rankSkillRepos,
  skillSearchQuery,
} = await import("../crawler/agent-skills.js");
const { feedItemBody, feedItemSummary } = await import(
  "../crawler/feed-items.js"
);
const { redditOutboundLinks } = await import("../crawler/reddit.js");

afterAll(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});

describe("feed body", () => {
  const item = {
    title: "v2.1.330",
    content:
      "<p>Run this:</p><pre><code>npx skills add addyosmani/agent-skills\n</code></pre>",
  };

  it("keeps the code the summary strips", () => {
    expect(feedItemSummary(item)).not.toContain("npx skills add");
    expect(feedItemBody(item)).toContain(
      "npx skills add addyosmani/agent-skills",
    );
  });
});

describe("reddit outbound links", () => {
  it("keeps repos and docs, drops reddit's own links", () => {
    const html =
      '<a href="https://github.com/a/b">repo</a> <a href="https://www.reddit.com/user/x">u</a> <a href="https://i.redd.it/p.png">img</a> <a href="https://docs.x.dev/a?b=1&amp;c=2">d</a>';
    expect(redditOutboundLinks(html)).toEqual([
      "https://github.com/a/b",
      "https://docs.x.dev/a?b=1&c=2",
    ]);
  });
});

describe("agent skills crawler", () => {
  it("searches recently pushed repos of the topic", () => {
    expect(skillSearchQuery(new Date("2026-11-17T00:00:00Z"))).toBe(
      "topic:agent-skills pushed:>=2026-11-03",
    );
  });

  it("ranks by stars and ignores malformed or unstarred repos", () => {
    const ranked = rankSkillRepos([
      {
        full_name: "a/low",
        html_url: "https://github.com/a/low",
        stargazers_count: 5,
      },
      {
        full_name: "a/top",
        html_url: "https://github.com/a/top",
        stargazers_count: 900,
      },
      {
        full_name: "a/zero",
        html_url: "https://github.com/a/zero",
        stargazers_count: 0,
      },
      {
        full_name: "bad name",
        html_url: "https://github.com/x",
        stargazers_count: 50,
      },
    ]);
    expect(ranked.map((repo) => repo.full_name)).toEqual(["a/top", "a/low"]);
  });

  it("stores the README once and refreshes stars without losing it", async () => {
    const repo = {
      full_name: "addyosmani/agent-skills",
      html_url: "https://github.com/addyosmani/agent-skills",
      description: "Production skills",
      stargazers_count: 100,
    };
    const readme = vi.fn(
      async () => "```bash\nnpx skills add addyosmani/agent-skills\n```",
    );
    expect(
      await crawlAgentSkills(new Date(), {
        search: async () => [repo],
        readme,
      }),
    ).toBe(1);
    expect(
      await crawlAgentSkills(new Date(), {
        search: async () => [{ ...repo, stargazers_count: 150 }],
        readme,
      }),
    ).toBe(0);
    expect(readme).toHaveBeenCalledTimes(1);
    const [saved] = db.getArticlesSince(1, 10, { source: AGENT_SKILLS_SOURCE });
    expect(saved.engagement_score).toBe(150);
    expect(saved.body).toContain("npx skills add");
  });
});
