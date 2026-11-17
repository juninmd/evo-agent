import axios from "axios";
import { db } from "../knowledge/store.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";
import { FEED_BODY_MAX, summarizeSourceContent } from "./feed-items.js";

export const AGENT_SKILLS_SOURCE = "GitHub Agent Skills";
const SEARCH_URL = "https://api.github.com/search/repositories";
const PUSHED_WITHIN_DAYS = 14;
const REPO_LIMIT = 15;
/** README fetches only for repos not seen before: stars refresh, docs rarely do. */
const README_LIMIT = 8;
const FULL_NAME = /^[\w.-]+\/[\w.-]+$/;

export interface SkillRepo {
  full_name?: string;
  html_url?: string;
  description?: string | null;
  stargazers_count?: number;
  pushed_at?: string;
  default_branch?: string;
  topics?: string[];
}

export function skillSearchQuery(now = new Date()): string {
  const since = new Date(now.getTime() - PUSHED_WITHIN_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return `topic:agent-skills pushed:>=${since}`;
}

/** Repos worth teaching from: named, described and actually starred. */
export function rankSkillRepos(
  repos: SkillRepo[],
  limit = REPO_LIMIT,
): SkillRepo[] {
  return repos
    .filter(
      (repo) =>
        FULL_NAME.test(repo.full_name ?? "") &&
        (repo.html_url ?? "").startsWith("https://github.com/") &&
        (repo.stargazers_count ?? 0) > 0,
    )
    .sort(
      (left, right) =>
        (right.stargazers_count ?? 0) - (left.stargazers_count ?? 0),
    )
    .slice(0, limit);
}

export function skillRepoSummary(repo: SkillRepo): string {
  return summarizeSourceContent(
    [
      repo.description ?? "",
      `${repo.stargazers_count ?? 0} estrelas`,
      (repo.topics ?? []).slice(0, 6).join(", "),
    ]
      .filter(Boolean)
      .join(" · "),
    500,
  );
}

async function fetchReadme(repo: SkillRepo): Promise<string> {
  const branch = repo.default_branch || "HEAD";
  try {
    const { data } = await axios.get<string>(
      `https://raw.githubusercontent.com/${repo.full_name}/${branch}/README.md`,
      { ...HTTP_LIMITS, timeout: 15_000, responseType: "text" },
    );
    return typeof data === "string" ? data.slice(0, FEED_BODY_MAX) : "";
  } catch (err) {
    log.debug(
      `README unavailable for ${repo.full_name}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

export interface AgentSkillsDeps {
  search: (query: string) => Promise<SkillRepo[]>;
  readme: (repo: SkillRepo) => Promise<string>;
}

const defaultDeps: AgentSkillsDeps = {
  // Unauthenticated on purpose: one search per crawl fits the public limit,
  // and the publishing token stays scoped to Pages.
  search: async (query) => {
    const { data } = await axios.get<{ items?: SkillRepo[] }>(SEARCH_URL, {
      ...HTTP_LIMITS,
      timeout: 15_000,
      params: { q: query, sort: "stars", order: "desc", per_page: 30 },
      headers: { Accept: "application/vnd.github+json" },
    });
    return Array.isArray(data?.items) ? data.items : [];
  },
  readme: fetchReadme,
};

export async function crawlAgentSkills(
  now = new Date(),
  deps: AgentSkillsDeps = defaultDeps,
): Promise<number> {
  const repos = rankSkillRepos(await deps.search(skillSearchQuery(now)));
  let saved = 0;
  let readmes = 0;
  for (const repo of repos) {
    const url = repo.html_url as string;
    const isNew = !db.urlExists(url);
    const body =
      isNew && readmes < README_LIMIT ? await deps.readme(repo) : undefined;
    if (body !== undefined) readmes++;
    db.saveArticle({
      title: repo.full_name as string,
      source: AGENT_SKILLS_SOURCE,
      url,
      summary: skillRepoSummary(repo),
      body: body || undefined,
      tags: JSON.stringify(["agent-skills", "skills", "github"]),
      engagement_score: repo.stargazers_count ?? 0,
    });
    if (isNew) saved++;
  }
  log.info(`Crawled ${AGENT_SKILLS_SOURCE}, ${saved} new repos`);
  return saved;
}
